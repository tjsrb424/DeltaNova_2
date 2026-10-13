import { resolve } from "node:path";
import { GuildStore } from "./store.ts";
import { createGuildServer } from "./http.ts";
export async function startGuildServer(
  options: { port?: number; path?: string; allowedOrigins?: string[] } = {},
) {
  const store = new GuildStore(
    options.path || resolve(".delta-nova/guild.sqlite"),
  );
  const server = createGuildServer(store, {
    allowedOrigins: options.allowedOrigins,
  });
  try {
    await new Promise<void>((done, reject) => {
      server.once("error", reject);
      server.listen(options.port ?? 4318, "127.0.0.1", () => {
        server.off("error", reject);
        done();
      });
    });
  } catch (error) {
    store.close();
    throw error;
  }
  const port = (server.address() as { port: number }).port;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((done, reject) =>
        server.close((error) => {
          store.close();
          error ? reject(error) : done();
        }),
      ),
  };
}
