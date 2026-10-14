import type {
  GuildCommand,
  GuildReply,
  GuildSession,
  GuildSnapshot,
} from "./types.ts";
import { validateGuildState } from "./validation.ts";
import { PILOTS } from "./content.ts";
export class GuildApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export interface GuildApi {
  read(signal?: AbortSignal): Promise<GuildSnapshot>;
  connect(pilotId: string, signal?: AbortSignal): Promise<GuildSession>;
  command(
    session: GuildSession,
    command: GuildCommand,
    signal?: AbortSignal,
  ): Promise<GuildReply & { serverTime: number }>;
}
export async function request(
  path: string,
  body?: unknown,
  token?: string,
  signal?: AbortSignal,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, 8000);
  try {
    const response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body===undefined?{}:{"Content-Type":"application/json"}),
        ...(token?{Authorization:`Bearer ${token}`}:{}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok)
      throw new GuildApiError(
        response.status,
        data.error?.code || "REQUEST_FAILED",
        data.error?.message || "서버 요청을 처리하지 못했습니다.",
      );
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
function snapshot(value: {
  state: unknown;
  serverTime: unknown;
}): GuildSnapshot {
  if (
    typeof value.serverTime !== "number" ||
    !Number.isSafeInteger(value.serverTime) ||
    value.serverTime < 0
  )
    throw Error("Invalid server clock");
  return {
    state: validateGuildState(value.state),
    serverTime: value.serverTime,
  };
}
export const guildApi: GuildApi = {
  async read(signal) {
    return snapshot(await request("/api/guild", undefined, undefined, signal));
  },
  async connect(pilotId, signal) {
    const data = await request(
      "/api/dev/session",
      { pilotId },
      undefined,
      signal,
    );
    if (
      !PILOTS.some((p) => p.id === data.pilotId) ||
      typeof data.token !== "string" ||
      !data.token.length
    )
      throw Error("Invalid session response");
    return { pilotId: data.pilotId, token: data.token };
  },
  async command(session, command, signal) {
    const data = await request(
      "/api/guild/commands",
      command,
      session.token,
      signal,
    );
    const state = snapshot(data);
    if (
      data.receipt?.commandId !== command.commandId ||
      data.receipt?.pilotId !== session.pilotId ||
      data.receipt?.revision !== state.state.revision ||
      typeof data.duplicate !== "boolean"
    )
      throw Error("Invalid command receipt");
    return { ...state, receipt: data.receipt, duplicate: data.duplicate };
  },
};
