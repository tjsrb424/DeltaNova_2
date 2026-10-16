// A complete longitude/latitude texture on a rotating sphere. Fixed sunlight,
// atmosphere and facility-linked night lights remain separate from the albedo.
import {cloudMotion} from './scene-motion.js';
const requests = new WeakMap(), renderers = new WeakMap(),staticOnly=new WeakSet();
let imagePromise;
const imageURL = new URL('./art/nova-albedo-v2.webp', import.meta.url).href;
const cloudURL = new URL('./art/nova-clouds-v1.webp', import.meta.url).href;
const fallbackURL = new URL('./art/nova-natural-v2.webp', import.meta.url).href;
function image() {
  const load=url=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Planet image unavailable'));img.src=url;});
  return imagePromise ||= Promise.all([load(imageURL),load(cloudURL).catch(()=>null)]);
}
const vertex=`attribute vec2 position; varying vec2 uv; void main(){uv=position;gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision mediump float;
varying vec2 uv; uniform sampler2D art; uniform sampler2D clouds; uniform float angle; uniform float cloudAngle; uniform float colony; uniform float development;
void main(){
  float radius=dot(uv,uv); if(radius>1.) discard;
  vec3 n=vec3(uv,sqrt(max(0.,1.-radius)));
  vec3 q=vec3(n.x*cos(angle)+n.z*sin(angle),n.y,-n.x*sin(angle)+n.z*cos(angle));
  vec2 sampleUV=vec2(.5+atan(q.x,q.z)/6.2831853,.5-asin(clamp(q.y,-1.,1.))/3.14159265);
  vec3 color=texture2D(art,sampleUV).rgb;
  vec3 sun=normalize(vec3(-.6,.45,.7));
  float light=.075+.925*max(0.,dot(n,sun));
  float land=smoothstep(.01,.18,color.r+color.g-color.b*1.8);
  color=pow(pow(color,vec3(2.2))*light,vec3(1./2.2));
  color=mix(color,vec3(dot(color,vec3(.2126,.7152,.0722)))*vec3(.84,1.0,1.12),colony*.5);
  vec2 cell=floor(sampleUV*vec2(128.,64.)),local=fract(sampleUV*vec2(128.,64.))-.5;
  float seed=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
  float city=step(1.-development*.06,seed)*(1.-smoothstep(.04,.16,length(local)))*land;
  color+=vec3(.7,.43,.16)*city*(1.-smoothstep(.1,.5,dot(n,sun)));
  vec3 c=vec3(n.x*cos(cloudAngle)+n.z*sin(cloudAngle),n.y,-n.x*sin(cloudAngle)+n.z*cos(cloudAngle));
  vec2 cloudUV=vec2(.5+atan(c.x,c.z)/6.2831853,.5-asin(clamp(c.y,-1.,1.))/3.14159265);
  float coverage=smoothstep(.05,.92,texture2D(clouds,cloudUV).r)*.78;
  vec3 cloudColor=vec3(.86,.91,.96)*pow(light,1./2.2);
  color=mix(color*.97,cloudColor,coverage);
  color+=vec3(.02,.09,.16)*pow(1.-n.z,4.);
  gl_FragColor=vec4(color,1.-smoothstep(.982,1.,radius));
}`;
function createRenderer(canvas,images) {
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'});
  if(!gl) throw Error('WebGL unavailable');
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Planet shader unavailable');
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  images.forEach((img,index)=>{
    const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;
    const ctx=atlas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,1024,512);if(img)ctx.drawImage(img,0,0,1024,512);
    const texture=gl.createTexture();if(!texture)throw Error('Planet texture allocation failed');
    gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.generateMipmap(gl.TEXTURE_2D);
    if(gl.getError()!==gl.NO_ERROR)throw Error('Planet texture upload failed');
    gl.uniform1i(gl.getUniformLocation(program,index?'clouds':'art'),index);
  });
  const angle=gl.getUniformLocation(program,'angle'),cloudAngle=gl.getUniformLocation(program,'cloudAngle'),colony=gl.getUniformLocation(program,'colony'),development=gl.getUniformLocation(program,'development');
  const r={planet:'nova',elapsed:0,development:.1,last:0,frame:0,visible:true,reduced:matchMedia('(prefers-reduced-motion: reduce)'),lost:false};
  r.draw=()=>{const phase=cloudMotion(r.elapsed);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(angle,phase.surface%(Math.PI*2));gl.uniform1f(cloudAngle,phase.clouds%(Math.PI*2));gl.uniform1f(colony,r.planet==='vesper'?1:0);gl.uniform1f(development,r.development);gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.surfaceAngle=String(phase.surface);canvas.dataset.cloudAngle=String(phase.clouds);};
  r.tick=t=>{r.frame=requestAnimationFrame(r.tick);if(t-r.last<50)return;if(r.last)r.elapsed+=t-r.last;r.last=t;r.draw();};
  r.reduced.addEventListener('change',()=>syncPlanetMotion(canvas));
  if(typeof IntersectionObserver==='function'){const observer=new IntersectionObserver(entries=>{r.visible=entries[0].isIntersecting;syncPlanetMotion(canvas);});observer.observe(canvas);}
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();r.lost=true;staticOnly.add(canvas);syncPlanetMotion(canvas);canvas.style.background=`url('${fallbackURL}') center / contain no-repeat`;canvas.dataset.renderer='static';});
  return r;
}
export function syncPlanetMotion(canvas) {
  const r=renderers.get(canvas);if(!r)return;
  const paused=r.lost || !r.visible || document.hidden || r.reduced.matches || document.body.classList.contains('motion-paused') || !!document.querySelector('dialog[open]');
  if(paused){cancelAnimationFrame(r.frame);r.frame=0;r.last=0;canvas.dataset.rotation='paused';}
  else if(!r.frame){r.last=0;r.frame=requestAnimationFrame(r.tick);canvas.dataset.rotation='running';}
}
export async function drawRotatingPlanet(canvas,planet,fallback) {
  const token={};requests.set(canvas,token);
  if(staticOnly.has(canvas))return;
  try {
    const img=await image();if(requests.get(canvas)!==token||staticOnly.has(canvas))return;
    let r=renderers.get(canvas);if(!r){r=createRenderer(canvas,img);renderers.set(canvas,r);}
    if(r.planet!==planet.id)r.elapsed=0;r.planet=planet.id;r.development=Math.min(.65,Object.values(planet.facilities).reduce((a,b)=>a+b,0)*.025);r.draw();
    canvas.dataset.artSource='generated';canvas.dataset.renderer='webgl';syncPlanetMotion(canvas);
  } catch {
    if(requests.get(canvas)!==token)return;
    if(canvas.getContext('2d')) await fallback(canvas,planet);
    else {staticOnly.add(canvas);canvas.style.background=`url('${fallbackURL}') center / contain no-repeat`;canvas.dataset.artSource='generated';}
    canvas.dataset.renderer='static';canvas.dataset.rotation='paused';
  }
}
