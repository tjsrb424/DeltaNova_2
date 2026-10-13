import { createServer } from "vite";
import { startGuildServer } from "../server/main.ts";
const api = await startGuildServer();
let vite;
try {
  vite = await createServer({
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      open: false,
      proxy: { "/api": { target: api.url, changeOrigin: true } },
    },
  });
  await vite.listen();
  console.log(
    `Guild API: ${api.url} (development participants; loopback only)`,
  );
  vite.printUrls();
} catch (error) {
  if (vite) await vite.close();
  await api.close();
  throw error;
}
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await vite.close();
  await api.close();
};
process.on("SIGINT", () => {
  void close();
});
process.on("SIGTERM", () => {
  void close();
});
