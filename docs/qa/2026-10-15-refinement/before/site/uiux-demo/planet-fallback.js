// A deterministic, one-shot Canvas2D planet. No render loop, network or external assets.
const textures = new Map();
const latestRequests = new WeakMap();
function hash(x, y, z) {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}
const mix = (a, b, t) => a + (b - a) * t;
function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  return mix(mix(mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy), mix(mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy), fz);
}
function terrain(x, y, z) {
  return noise(x * 2.7, y * 2.7, z * 2.7) * .6 + noise(x * 7, y * 7, z * 7) * .25 + noise(x * 19, y * 19, z * 19) * .1 + noise(x * 47, y * 47, z * 47) * .05;
}
async function buildTexture(context, id) {
  const size = 512;
  const bitmap = context.createImageData(size, size), data = bitmap.data;
  const offset = id === 'nova' ? 6 : 23;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
    const x = (px + .5 - size / 2) / (size / 2 - 1), y = (py + .5 - size / 2) / (size / 2 - 1), rr = x * x + y * y;
    if (rr > 1) continue;
    const z = Math.sqrt(1 - rr), i = (py * size + px) * 4;
    const n = terrain(x + offset, y + 4, z + 3);
    const land = n > .49;
    let rgb = land ? [51 + n * 37, 65 + n * 40, 58 + n * 26] : [12, 38 + n * 20, 56 + n * 30];
    if (land && n < .505) rgb = [78, 89, 78];
    if (Math.abs(y) > .86 + noise(x * 7 + offset, y * 7, z * 7) * .07) rgb = [143, 163, 171];
    const light = Math.max(0, x * -.65 + y * -.5 + z * .56);
    const illumination = .12 + Math.pow(light, .8) * .95;
    const cloud = terrain(x * 1.6 + 30, y * 1.6 - 8, z * 1.6 + 8);
    const cloudOpacity = Math.max(0, (cloud - .51) * 3.4) * .75;
    const rim = Math.pow(1 - z, 4) * Math.min(1, light * 1.4 + .1);
    for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, mix(rgb[c], [186, 205, 211][c], cloudOpacity) * illumination + [35, 88, 126][c] * rim);
    data[i + 3] = Math.min(255, (1 - Math.sqrt(rr)) * size * 130);
    }
    // Yield bounded work so selection, drawers and urgent feedback remain responsive.
    if (py % 8 === 7) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return bitmap;
}
export async function drawPlanet(canvas, planet) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  const token = {};
  latestRequests.set(canvas, token);
  if (!textures.has(planet.id)) textures.set(planet.id, buildTexture(context, planet.id));
  const bitmap = await textures.get(planet.id);
  // A slow previous selection must never overwrite the currently selected planet.
  if (latestRequests.get(canvas) === token) context.putImageData(bitmap, 0, 0);
}
