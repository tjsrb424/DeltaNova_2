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
const READ_ERROR =
  "공동 작전 서버에 연결하지 못했습니다. 마지막 확인 상태를 유지합니다. 서버 연결을 확인하고 다시 시도하세요.";
const SESSION_KEY = "delta-nova.guild-dev-session.v1";
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
type Pending = { session: GuildSession; command: GuildCommand };
export function useGuildOperation(api: GuildApi) {
  const [data, setData] = useState<GuildSnapshot | null>(null),
    dataRef = useRef<GuildSnapshot | null>(null);
  const [session, setSession] = useState<GuildSession | null>(loadSession);
  const [busy, setBusy] = useState(false),
    processing = useRef(false);
  const [online, setOnline] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [pending, setPending] = useState<Pending | null>(null),
    pendingRef = useRef<Pending | null>(null);
  const generation = useRef(0),
    mounted = useRef(false),
    readSequence = useRef(0);
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
    const epoch = generation.current,
      sequence = ++readSequence.current;
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
    if (processing.current || pendingRef.current) return;
    generation.current++;
    const epoch = generation.current;
    processing.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    pendingRef.current = null;
    setPending(null);
    try {
      const next = await api.connect(pilotId);
      if (!mounted.current || epoch !== generation.current) return;
      setSession(next);
      remember(next);
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
    if (processing.current) return;
    processing.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const epoch = generation.current;
    pendingRef.current = item;
    setPending(item);
    try {
      const reply = await api.command(item.session, item.command);
      if (!mounted.current || epoch !== generation.current) return;
      accept(reply);
      setOnline(true);
      pendingRef.current = null;
      setPending(null);
      setNotice(
        reply.duplicate
          ? "이전에 처리한 동일 명령을 확인했습니다. 보상은 중복 지급되지 않습니다."
          : "공동 작전 기록에 반영했습니다.",
      );
    } catch (e) {
      if (!mounted.current || epoch !== generation.current) return;
      if (e instanceof GuildApiError && e.status >= 400 && e.status < 500) {
        pendingRef.current = null;
        setPending(null);
        setError(e.message);
        if (e.status === 401) {
          setSession(null);
          remember(null);
        }
        if (e.status === 409) void refresh();
      } else
        setError(
          "명령의 처리 여부를 확인하지 못했습니다. 같은 명령 재전송으로 결과를 확인하세요.",
        );
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
    refresh: () => void refresh(),
    connect: (pilotId: string) => void connect(pilotId),
    send,
    retry,
  };
}
