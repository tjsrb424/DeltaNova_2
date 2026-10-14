import assert from "node:assert/strict";
import { preview } from "vite";
const server = await preview({
  preview: { host: "127.0.0.1", port: 0, open: false },
});
try {
  const address = server.httpServer.address();
  const base = `http://127.0.0.1:${address.port}`;
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /id="root"/);
  const assets = [...html.matchAll(/(?:src|href)="([^\"]+\.(?:js|css))"/g)].map(
    (m) => m[1],
  );
  assert.equal(assets.length, 2);
  for (const path of assets) {
    const asset = await fetch(base + path);
    assert.equal(asset.status, 200);
    assert.ok((await asset.text()).length > 100);
  }
  for(const artPath of ["/art/orbital-base-v1.png","/art/planet-dashboard-scene-v1.png","/art/planet-facilities-v1.png"]) {
  const art = await fetch(base + artPath);
  assert.equal(art.status, 200);
  assert.match(art.headers.get("content-type"), /image\/png/);
  const bytes = new Uint8Array(await art.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
  console.log(
    "Built HTML, JavaScript, CSS, orbital art, planet scene and facility atlas served successfully over loopback HTTP. No browser or renderer opened.",
  );
} finally {
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
