import { drawPlanet as drawProcedural } from './planet-fallback.js';
// Natural art and gameplay overlays remain separate. No economy or network commands.
const textures = new Map(), requests = new WeakMap();
let naturalImage;
function loadNaturalImage() {
  if (!naturalImage) naturalImage = new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(Error('Natural planet art unavailable'));
    image.src = new URL('./art/nova-natural-v2.webp', import.meta.url).href;
  });
  return naturalImage;
}
async function buildTexture(id) {
  const image = await loadNaturalImage();
  const surface = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(512,512) : Object.assign(document.createElement('canvas'), {width:512,height:512});
  const ctx = surface.getContext('2d');
  if (!ctx) throw Error('No canvas context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = id === 'vesper' ? 'hue-rotate(24deg) saturate(.58)' : 'saturate(.86)';
  ctx.drawImage(image,0,0,512,512);
  return ctx.getImageData(0,0,512,512);
}
export async function drawPlanet(canvas, planet) {
  const token = {};
  requests.set(canvas, token);
  try {
    if (!textures.has(planet.id)) textures.set(planet.id, buildTexture(planet.id));
    const bitmap = await textures.get(planet.id);
    if (requests.get(canvas) !== token) return;
    canvas.getContext('2d')?.putImageData(bitmap,0,0);
    canvas.dataset.artSource = 'generated';
  } catch {
    if (requests.get(canvas) !== token) return;
    await drawProcedural(canvas,planet);
    if (requests.get(canvas) === token) canvas.dataset.artSource = 'procedural';
  }
}
