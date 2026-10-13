import { useEffect, useRef, useState } from "react";
import { GuildApiError } from "./api.ts";
import type { GuildApi } from "./api.ts";
import type {
  GuildAction,
  GuildCommand,
  GuildSession,
  GuildSnapshot,
} from "./types.ts";
import { PILOTS } from "./content.ts";
import { parseGuildCommand } from "./validation.ts";
const READ_ERROR =
  "공동 작전 서버에 연결하지 못했습니다. 마지막 확인 상태를 유지합니다. 서버 연결을 확인하고 다시 시도하세요.";
const SESSION_KEY = "delta-nova.guild-dev-session.v1";
const PENDING_KEY = "delta-nova.guild-pending.v1";
const RETRY_MESSAGE =
  "명령의 처리 여부를 확인하지 못했습니다. 같은 명령 재전송으로 결과를 확인하세요.";
const SESSION_MESSAGE =
  "세션이 만료되었습니다. 같은 참가자로 다시 연결한 뒤 같은 명령을 재전송하세요.";
function loadSession(): GuildSession | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    return s &&
      PILOTS.some((p) => p.id === s.pilotId) &&
      typeof s.token === "string"
      ? s
      : null;
  } catch {
    return null;
  }
}
function remember(session: GuildSession | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* A denied sessionStorage does not block in-memory identity. */
  }
}
type Pending = {
  session: GuildSession;
  command: GuildCommand;
  needsSession?: boolean;
};
// Keep unresolved commands beyond a panel's lifetime, even when storage is denied.
const pendingMemory = new WeakMap<GuildApi, Pending | null>();
function loadPending(api: GuildApi): Pending | null {
  if (pendingMemory.has(api)) return pendingMemory.get(api)!;
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
    if (
      value?.version !== 1 ||
      !PILOTS.some((p) => p.id === value.item?.session?.pilotId) ||
      typeof value.item.session.token !== "string" ||
      typeof value.item.needsSession !== "boolean"
    )
      return null;
    return {
      session: value.item.session,
      command: parseGuildCommand(value.item.command),
      needsSession: value.item.needsSession,
    };
  } catch {
    return null;
  }
}
function rememberPending(api: GuildApi, item: Pending | null) {
  pendingMemory.set(api, item);
  try {
    if (item)
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          version: 1,
          item: { ...item, needsSession: Boolean(item.needsSession) },
        }),
      );
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* The module cache preserves menu navigation when storage is denied. */
  }
}
export function useGuildOperation(api: GuildApi) {
  const [initialPending] = useState(() => loadPending(api));
  const [data, setData] = useState<GuildSnapshot | null>(null),
    dataRef = useRef<GuildSnapshot | null>(null);
  const [session, setSession] = useState<GuildSession | null>(() =>
    initialPending
      ? initialPending.needsSession
        ? null
        : initialPending.session
      : loadSession(),
  );
  const [busy, setBusy] = useState(false),
    processing = useRef(false);
  const [online, setOnline] = useState(false),
    [error, setError] = useState(
      initialPending
        ? initialPending.needsSession
          ? SESSION_MESSAGE
          : RETRY_MESSAGE
        : "",
    ),
    [notice, setNotice] = useState("");
  const [pending, setPending] = useState<Pending | null>(initialPending),
    pendingRef = useRef<Pending | null>(initialPending);
  const generation = useRef(0),
    mounted = useRef(false),
    readSequence = useRef(0);
  const activeRead = useRef<{ epoch: number; sequence: number } | null>(null);
  function updatePending(item: Pending | null) {
    pendingRef.current = item;
    rememberPending(api, item);
    setPending(item);
  }
  function accept(value: GuildSnapshot) {
    const current = dataRef.current;
    if (
      !current ||
      value.state.revision > current.state.revision ||
      (value.state.revision === current.state.revision &&
        value.serverTime >= current.serverTime)
    ) {
      dataRef.current = value;
      setData(value);
    }
  }
  async function refresh(signal?: AbortSignal) {
    if (activeRead.current?.epoch === generation.current) return;
    const epoch = generation.current,
      sequence = ++readSequence.current;
    activeRead.current = { epoch, sequence };
    try {
      const value = await api.read(signal);
      if (
        !mounted.current ||
        epoch !== generation.current ||
        sequence !== readSequence.current
      )
        return;
      accept(value);
      setOnline(true);
      setError((current) => (current === READ_ERROR ? "" : current));
    } catch {
      if (
        !mounted.current ||
        signal?.aborted ||
        epoch !== generation.current ||
        sequence !== readSequence.current
      )
        return;
      setOnline(false);
      setError((current) => current || READ_ERROR);
    } finally {
      if (activeRead.current?.sequence === sequence) activeRead.current = null;
    }
  }
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => void refresh(controller.signal), 3000);
    return () => {
      mounted.current = false;
      generation.current++;
      controller.abort();
      clearInterval(timer);
    };
  }, [api]);
  async function connect(pilotId: string) {
    const unresolved = pendingRef.current;
    if (
      processing.current ||
      (unresolved &&
        (!unresolved.needsSession || pilotId !== unresolved.session.pilotId))
    )
      return;
    generation.current++;
    const epoch = generation.current;
    processing.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await api.connect(pilotId);
      if (!mounted.current || epoch !== generation.current) return;
      setSession(next);
      remember(next);
      if (unresolved) {
        updatePending({ ...unresolved, session: next, needsSession: false });
        setError(RETRY_MESSAGE);
      }
      void refresh();
    } catch {
      if (mounted.current && epoch === generation.current)
        setError("참가자 연결에 실패했습니다. 현재 기록을 유지합니다.");
    } finally {
      if (mounted.current && epoch === generation.current) {
        processing.current = false;
        setBusy(false);
      }
    }
  }
  async function execute(item: Pending) {
    if (processing.current || item.needsSession) return;
    processing.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const epoch = generation.current;
    updatePending(item);
    try {
      const reply = await api.command(item.session, item.command);
      if (!mounted.current || epoch !== generation.current) return;
      accept(reply);
      setOnline(true);
      updatePending(null);
      setNotice(
        reply.duplicate
          ? "이전에 처리한 동일 명령을 확인했습니다. 보상은 중복 지급되지 않습니다."
          : "공동 작전 기록에 반영했습니다.",
      );
    } catch (e) {
      if (!mounted.current || epoch !== generation.current) return;
      if (e instanceof GuildApiError && e.status >= 400 && e.status < 500) {
        if (e.status === 401) {
          updatePending({ ...item, needsSession: true });
          setSession(null);
          remember(null);
          setError(SESSION_MESSAGE);
        } else {
          updatePending(null);
          setError(e.message);
          if (e.status === 409) void refresh();
        }
      } else setError(RETRY_MESSAGE);
    } finally {
      if (mounted.current && epoch === generation.current) {
        processing.current = false;
        setBusy(false);
      }
    }
  }
  function send(action: GuildAction) {
    if (
      !session ||
      !dataRef.current ||
      processing.current ||
      pendingRef.current ||
      !online
    )
      return;
    void execute({
      session,
      command: {
        commandId: crypto.randomUUID(),
        expectedRevision: dataRef.current.state.revision,
        operationId: dataRef.current.state.operation.id,
        action,
      },
    });
  }
  function retry() {
    if (pendingRef.current) void execute(pendingRef.current);
  }
  return {
    data,
    session,
    busy,
    online,
    error,
    notice,
    pending: pending !== null,
    pendingPilotId: pending?.session.pilotId,
    refresh: () => void refresh(),
    connect: (pilotId: string) => void connect(pilotId),
    send,
    retry,
  };
}
