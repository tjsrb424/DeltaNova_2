import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { PILOTS } from "../src/guild/content.ts";
import { parseGuildCommand } from "../src/guild/validation.ts";
import { GuildError } from "../src/guild/types.ts";
import { parseEmpireCommand } from "../src/empire/validation.ts";
import type { GuildStore } from "./store.ts";
const BODY_LIMIT = 16 * 1024;
async function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json")
    throw new GuildError(
      415,
      "JSON_REQUIRED",
      "JSON 명령만 사용할 수 있습니다.",
    );
  if (Number(req.headers["content-length"]) > BODY_LIMIT) {
    req.resume();
    throw new GuildError(413, "BODY_LIMIT", "명령이 너무 큽니다.");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT)
      throw new GuildError(413, "BODY_LIMIT", "명령이 너무 큽니다.");
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new GuildError(400, "BAD_JSON", "명령 JSON을 읽을 수 없습니다.");
  }
}
export function createGuildServer(
  store: GuildStore,
  options: { allowedOrigins?: string[]; clock?: () => number } = {},
) {
  const allowedOrigins = options.allowedOrigins || [
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
  ];
  const clock = options.clock || Date.now;
  const sessions = new Map<string, { pilotId: string; expires: number }>();
  function requirePilot(req: IncomingMessage) {
    const token=req.headers.authorization?.match(/^Bearer ([\w-]+)$/)?.[1],session=token?sessions.get(token):undefined;
    if(!session||session.expires<=clock()) throw new GuildError(401,"SESSION_EXPIRED","개발 참가자로 다시 연결하세요.");
    return session.pilotId;
  }
  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
  };
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  async function handle(req: IncomingMessage, res: ServerResponse) {
    try {
      const port = (server.address() as { port: number }).port;
      if (req.headers.host !== `127.0.0.1:${port}`)
        throw new GuildError(403, "HOST_DENIED", "허용되지 않은 호스트입니다.");
      if (req.headers.origin && !allowedOrigins.includes(req.headers.origin))
        throw new GuildError(403, "ORIGIN_DENIED", "허용되지 않은 출처입니다.");
      if (req.method === "GET" && req.url === "/api/guild") {
        const now=clock();
        send(res, 200, { state: store.snapshot(now), serverTime: now });
        return;
      }
      if(req.method==="GET"&&req.url==="/api/empire") {send(res,200,store.empireSnapshot(requirePilot(req),clock()));return;}
      if (req.method !== "POST")
        throw new GuildError(404, "NOT_FOUND", "요청한 경로가 없습니다.");
      const body = await readBody(req);
      if(req.url==="/api/empire/commands") {send(res,200,store.executeEmpire(requirePilot(req),parseEmpireCommand(body),clock()));return;}
      if (req.url === "/api/dev/session") {
        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          Object.keys(body).length !== 1 ||
          !PILOTS.some((p) => p.id === (body as { pilotId?: unknown }).pilotId)
        )
          throw new GuildError(
            400,
            "PILOT_INVALID",
            "개발 참가자를 선택하세요.",
          );
        for (const [token, session] of sessions)
          if (session.expires <= clock()) sessions.delete(token);
        if (sessions.size >= 256)
          throw new GuildError(
            429,
            "SESSION_LIMIT",
            "개발 세션 한도에 도달했습니다.",
          );
        const pilotId = (body as { pilotId: string }).pilotId,
          token = randomUUID();
        sessions.set(token, { pilotId, expires: clock() + 6 * 60 * 60 * 1000 });
        send(res, 200, { pilotId, token });
        return;
      }
      if (req.url === "/api/guild/commands") {
        const token =
            req.headers.authorization?.match(/^Bearer ([\w-]+)$/)?.[1],
          session = token ? sessions.get(token) : undefined;
        if (!session || session.expires <= clock())
          throw new GuildError(
            401,
            "SESSION_EXPIRED",
            "개발 참가자로 다시 연결하세요.",
          );
        const result = store.execute(
          session.pilotId,
          parseGuildCommand(body),
          clock(),
        );
        send(res, 200, { ...result, serverTime: clock() });
        return;
      }
      throw new GuildError(404, "NOT_FOUND", "요청한 경로가 없습니다.");
    } catch (error) {
      if (error instanceof GuildError)
        send(res, error.status, {
          error: { code: error.code, message: error.message },
        });
      else
        send(res, 503, {
          error: {
            code: "STORAGE_UNAVAILABLE",
            message:
              "공동 작전 기록을 처리하지 못했습니다. 현재 명령은 성공으로 확인되지 않았습니다. 같은 명령으로 다시 시도하세요.",
          },
        });
    }
  }
  return server;
}
