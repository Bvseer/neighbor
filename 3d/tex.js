// Surfaces drawn by code at start-up: colour, relief and roughness for each, so that light catches the grain of wood,
// the grout between tiles and the mortar between bricks. Nothing is downloaded for them.
import * as THREE from 'three';

// Baking: drawn once by tools/bake.html and kept as pictures, so a phone only downloads them instead of drawing them.
// record() keeps every canvas made, in order; play() makes the same calls hand back the saved pictures instead.
let REC = null, PLAY = null, PBASE = '', ip = 0;
export function record() { REC = { list: [], canvases: [] }; return REC; }
export function play(manifest, base) { PLAY = manifest; PBASE = base; ip = 0; }
const LOADER = new THREE.TextureLoader();
function fileTex(i, a, b) { const srgb = a === true || b === true, rep = Array.isArray(a) ? a : Array.isArray(b) ? b : null; const t = LOADER.load(PBASE + i + '.webp'); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
const keep = (c) => { REC.canvases.push(c); return REC.canvases.length - 1; };
function fromFiles(e) { if (e.view !== undefined) return fileTex(e.view, true);
  const o = e.o, rep = o.rep || [1, 1], m = new THREE.MeshStandardMaterial({ map: fileTex(e.c, rep, true), normalMap: e.n !== null ? fileTex(e.n, false, rep) : null, roughnessMap: e.r !== null ? fileTex(e.r, false, rep) : null, roughness: o.roughness !== undefined ? o.roughness : 1, metalness: o.metal || 0 });
  if (m.normalMap) m.normalScale.set(o.ns || 1, o.ns || 1); return m; }
const baked = (f) => (...a) => PLAY ? fromFiles(PLAY.list[ip++]) : f(...a);
let seed = 7;
const rnd = () => { seed = (seed*16807) % 2147483647; return (seed - 1)/2147483646; };
const R = (a, b) => a + rnd()*(b - a);
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// value noise, tiling
function noiseLayer(w, h, cell, amp) { const gw = Math.ceil(w/cell), gh = Math.ceil(h/cell), g = []; for (let i = 0; i < gw*gh; i++) g.push(rnd());
  const at = (x, y) => g[((y % gh) + gh) % gh*gw + ((x % gw) + gw) % gw], out = new Float32Array(w*h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const fx = x/cell, fy = y/cell, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx*tx*(3 - 2*tx), sy = ty*ty*(3 - 2*ty);
    const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1); out[y*w + x] = ((a + (b - a)*sx)*(1 - sy) + (c + (d - c)*sx)*sy)*amp; }
  return out; }
function fbm(w, h, cells) { const o = new Float32Array(w*h); let tot = 0; cells.forEach(([c, a]) => { const l = noiseLayer(w, h, c, a); tot += a; for (let i = 0; i < o.length; i++) o[i] += l[i]; }); for (let i = 0; i < o.length; i++) o[i] /= tot; return o; }

// relief to normals: a height picture becomes a normal map
function normalFrom(hc, strength) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data, [c, x] = canvas(w, h), img = x.createImageData(w, h), d = img.data;
  const H = (i, j) => src[(((j + h) % h)*w + ((i + w) % w))*4]/255;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = (H(i + 1, j) - H(i - 1, j))*strength, dy = (H(i, j + 1) - H(i, j - 1))*strength, l = Math.hypot(dx, dy, 1), k = (j*w + i)*4;
    d[k] = (-dx/l*0.5 + 0.5)*255; d[k + 1] = (dy/l*0.5 + 0.5)*255; d[k + 2] = (1/l*0.5 + 0.5)*255; d[k + 3] = 255; }
  x.putImageData(img, 0, 0); return c;
}
function fileTexFix(t, rep) { return t; }
function tex(c, rep, srgb) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
function mat(col, hgt, rough, o) { o = o || {}; const rep = o.rep || [1, 1]; const nc = hgt ? normalFrom(hgt, o.bump || 2) : null;
  if (REC) REC.list.push({ c: keep(col), n: nc ? keep(nc) : null, r: rough ? keep(rough) : null, o: { rep: o.rep, roughness: o.roughness, metal: o.metal, ns: o.ns } });
  const m = new THREE.MeshStandardMaterial({ map: tex(col, rep, true), normalMap: nc ? tex(nc, rep) : null, roughnessMap: rough ? tex(rough, rep) : null, roughness: o.roughness !== undefined ? o.roughness : 1, metalness: o.metal || 0 });
  if (m.normalMap) m.normalScale.set(o.ns || 1, o.ns || 1); return m; }
function paint(c, x, f) { const id = x.getImageData(0, 0, c.width, c.height), d = id.data; for (let i = 0; i < d.length; i += 4) { const r = f(i/4 % c.width, Math.floor(i/4/c.width), d[i], d[i + 1], d[i + 2]); d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2]; d[i + 3] = 255; } x.putImageData(id, 0, 0); }
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

// ---- oak floorboards: staggered planks, grain that runs along them, dark seams
function _floorWood(tone, size) {
  const W = size || 1024, Hh = size || 1024, [c, x] = canvas(W, Hh), [hc, hx] = canvas(W, Hh), [rc, rx] = canvas(W, Hh), base = hex(tone || '#a8774a');
  const n = fbm(W, Hh, [[64*W/1024, 1], [16*W/1024, 0.5], [4, 0.25]]), PH = 128*W/1024;
  const id = x.createImageData(W, Hh), hd = hx.createImageData(W, Hh), rd = rx.createImageData(W, Hh);
  for (let row = 0; row < Hh/PH; row++) { const off = (row*373*W/1024) % W, L = (380 + (row % 3)*90)*W/1024; for (let s = -off; s < W; s += L) { const tint = R(-0.16, 0.14), knot = rnd() < 0.5 ? [R(s, s + L), R(row*PH + 20, row*PH + PH - 20)] : null;
      for (let y = row*PH; y < row*PH + PH; y++) for (let xx = Math.max(0, Math.floor(s)); xx < Math.min(W, s + L); xx++) { const k = y*W + xx, v = n[k];
        let g = Math.sin((y*1024/W + v*40 + Math.sin(xx*0.01*1024/W + row)*6)*0.55)*0.5 + 0.5; g = Math.pow(g, 3)*0.22; let kn = 0; if (knot) { const dd = Math.hypot((xx - knot[0])*0.5, y - knot[1]); kn = Math.max(0, 1 - dd/14)*0.4; }
        const seam = (y % PH < 2 || Math.abs(xx - s) < 2) ? 0.55 : 0, f = 1 + tint - g - kn - seam + (v - 0.5)*0.12;
        id.data[k*4] = base[0]*f; id.data[k*4 + 1] = base[1]*f; id.data[k*4 + 2] = base[2]*f; id.data[k*4 + 3] = 255;
        const hh = seam ? 40 : 200 - g*200 + v*30; hd.data[k*4] = hd.data[k*4 + 1] = hd.data[k*4 + 2] = hh; hd.data[k*4 + 3] = 255;
        const ro = 120 + g*300 + v*50 + (seam ? 80 : 0); rd.data[k*4] = rd.data[k*4 + 1] = rd.data[k*4 + 2] = Math.min(255, ro); rd.data[k*4 + 3] = 255; } } }
  x.putImageData(id, 0, 0); hx.putImageData(hd, 0, 0); rx.putImageData(rd, 0, 0);
  return mat(c, hc, rc, { rep: [2.5, 1.2], bump: 3 });
}
// ---- square ceramic tiles with grout
function _tiles(col, size, grout, gloss) {
  const W = 512, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), [rc, rx] = canvas(W, W), n = fbm(W, W, [[32, 1], [8, 0.4]]), b = hex(col), gc = hex(grout || '#d8d4cc'), T = W/size;
  paint(c, x, (i, j) => { const gx = i % T, gy = j % T, isG = gx < 3 || gy < 3, ti = Math.floor(i/T) + Math.floor(j/T)*7, t = 1 + (Math.sin(ti*12.9898)*43758.5453 % 1)*0.05 + (n[j*W + i] - 0.5)*0.05; return isG ? gc.map((v) => v*(0.9 + n[j*W + i]*0.15)) : b.map((v) => Math.min(255, v*t)); });
  paint(hc, hx, (i, j) => { const gx = i % T, gy = j % T, e = Math.min(gx, gy, T - gx, T - gy); const v = e < 3 ? 60 : e < 7 ? 60 + (e - 3)*45 : 240; return [v, v, v]; });
  paint(rc, rx, (i, j) => { const gx = i % T, gy = j % T, v = gx < 3 || gy < 3 ? 230 : (gloss ? 40 : 120) + n[j*W + i]*40; return [v, v, v]; });
  return mat(c, hc, rc, { bump: 4 });
}
// ---- papered or painted walls: a pattern, a little paper grain
function _wallpaper(kind, a, b) {
  const W = 512, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[48, 1], [6, 0.6], [2, 0.3]]), A = hex(a), B = hex(b || a);
  x.fillStyle = a; x.fillRect(0, 0, W, W);
  if (kind === 'stripe') { x.fillStyle = b; for (let i = 0; i < W; i += 64) x.fillRect(i, 0, 26, W); x.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < W; i += 64) x.fillRect(i + 30, 0, 3, W); }
  if (kind === 'damask') { x.fillStyle = b; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const cx0 = i*128 + (j % 2)*64, cy = j*128 + 64; x.save(); x.translate(cx0, cy); for (let k = 0; k < 4; k++) { x.rotate(Math.PI/2); x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(10, -10, 22, -30, 0, -46); x.bezierCurveTo(-22, -30, -10, -10, 0, 0); x.fill(); } x.beginPath(); x.arc(0, 0, 8, 0, 6.283); x.fill(); x.restore(); } }
  if (kind === 'floral') { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const px = i*64 + (j % 2)*32 + 8, py = j*64 + 32; x.fillStyle = b; for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(px + Math.cos(k*1.256)*7, py + Math.sin(k*1.256)*7, 5, 3, k*1.256, 0, 6.283); x.fill(); } x.fillStyle = '#e8c86a'; x.beginPath(); x.arc(px, py, 3, 0, 6.283); x.fill(); x.strokeStyle = 'rgba(90,120,70,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px + 6, py + 8); x.quadraticCurveTo(px + 16, py + 18, px + 24, py + 14); x.stroke(); } }
  if (kind === 'pinstripe') { x.fillStyle = b; for (let i = 0; i < W; i += 32) x.fillRect(i, 0, 2, W); }
  paint(c, x, (i, j, r, g, bb) => { const v = 0.94 + n[j*W + i]*0.1; return [r*v, g*v, bb*v]; });
  paint(hc, hx, (i, j) => { const v = 128 + (n[j*W + i] - 0.5)*80; return [v, v, v]; });
  return mat(c, hc, null, { bump: 1.2, roughness: 0.9 });
}
// ---- brick for the outside, with mortar
function _brick() {
  const W = 512, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[24, 1], [6, 0.5], [2, 0.3]]), BH = 32, BW = 96;
  const tints = []; for (let i = 0; i < 400; i++) tints.push(R(-0.18, 0.12));
  paint(c, x, (i, j) => { const row = Math.floor(j/BH), off = row % 2 ? BW/2 : 0, bi = Math.floor((i + off)/BW), m = j % BH < 4 || (i + off) % BW < 4, t = tints[(row*7 + bi) % 400], v = n[j*W + i];
    return m ? [190*(0.85 + v*0.2), 182*(0.85 + v*0.2), 168*(0.85 + v*0.2)] : [168*(1 + t + (v - 0.5)*0.3), 78*(1 + t + (v - 0.5)*0.35), 56*(1 + t + (v - 0.5)*0.35)]; });
  paint(hc, hx, (i, j) => { const row = Math.floor(j/BH), off = row % 2 ? BW/2 : 0, m = j % BH < 4 || (i + off) % BW < 4, v = m ? 50 : 200 + (n[j*W + i] - 0.5)*90; return [v, v, v]; });
  return mat(c, hc, null, { bump: 5, roughness: 0.95 });
}
// ---- clay roof tiles in rows
function _roofTiles() {
  const W = 512, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[32, 1], [6, 0.5]]), TW = 64, TH = 48;
  paint(c, x, (i, j) => { const row = Math.floor(j/TH), off = row % 2 ? TW/2 : 0, u = ((i + off) % TW)/TW, v = (j % TH)/TH, sh = 0.75 + 0.35*Math.sin(u*Math.PI) - v*0.25, t = (Math.sin((row*13 + Math.floor((i + off)/TW))*78.233)*43758 % 1)*0.12, nn = n[j*W + i];
    return [175*(sh + t + (nn - 0.5)*0.2), 72*(sh + t + (nn - 0.5)*0.2), 46*(sh + t + (nn - 0.5)*0.2)]; });
  paint(hc, hx, (i, j) => { const row = Math.floor(j/TH), off = row % 2 ? TW/2 : 0, u = ((i + off) % TW)/TW, v = (j % TH)/TH, hgt = Math.sin(u*Math.PI)*180 + 40 - v*60; return [hgt, hgt, hgt]; });
  return mat(c, hc, null, { bump: 4, roughness: 0.8 });
}
// ---- simple surfaces: plaster, painted wood, fabric, grass, paving
function _plaster(col) { const W = 256, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[16, 1], [4, 0.6], [2, 0.4]]), b = hex(col); paint(c, x, (i, j) => b.map((v) => v*(0.95 + n[j*W + i]*0.07))); paint(hc, hx, (i, j) => { const v = 128 + (n[j*W + i] - 0.5)*120; return [v, v, v]; }); return mat(c, hc, null, { bump: 1.5, roughness: 0.92 }); }
function _fabric(col, scale) { const W = 256, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[8, 1], [2, 0.8]]), b = hex(col); paint(c, x, (i, j) => { const w = ((i + j) % 4 < 2 ? 1 : 0.92); return b.map((v) => v*w*(0.9 + n[j*W + i]*0.15)); }); paint(hc, hx, (i, j) => { const v = (i % 4 < 2) !== (j % 4 < 2) ? 200 : 90; return [v, v, v]; }); return mat(c, hc, null, { bump: 1.5, rep: [scale || 4, scale || 4], roughness: 0.95 }); }
function _woodPainted(col) { const W = 256, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[64, 1], [8, 0.3]]), b = hex(col); paint(c, x, (i, j) => { const g = Math.sin((i + n[j*W + i]*50)*0.25)*0.03; return b.map((v) => v*(0.96 + g + n[j*W + i]*0.06)); }); paint(hc, hx, (i, j) => { const v = 128 + Math.sin((i + n[j*W + i]*50)*0.25)*30; return [v, v, v]; }); return mat(c, hc, null, { bump: 1, roughness: 0.55 }); }
function _woodGrain(col) { const W = 512, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[64, 1], [16, 0.5], [4, 0.2]]), b = hex(col); paint(c, x, (i, j) => { const g = Math.pow(Math.sin((j + n[j*W + i]*60)*0.35)*0.5 + 0.5, 3); return b.map((v) => v*(1.05 - g*0.25 + (n[j*W + i] - 0.5)*0.15)); }); paint(hc, hx, (i, j) => { const g = Math.pow(Math.sin((j + n[j*W + i]*60)*0.35)*0.5 + 0.5, 3); const v = 200 - g*120; return [v, v, v]; }); return mat(c, hc, null, { bump: 1.6, roughness: 0.6 }); }
function _grass() { const W = 512, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[32, 1], [8, 0.6], [2, 0.5]]); paint(c, x, (i, j) => { const v = n[j*W + i], s = (Math.sin(i*0.9 + j*0.3)*0.5 + 0.5)*0.15; return [60 + v*40 - s*40, 110 + v*60 + s*30, 40 + v*20]; }); paint(hc, hx, (i, j) => { const v = n[j*W + i]*255; return [v, v, v]; }); return mat(c, hc, null, { bump: 3, rep: [10, 2] }); }
function _paving() { const W = 512, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[16, 1], [4, 0.5]]), T = 128; paint(c, x, (i, j) => { const g = i % T < 3 || j % T < 3, v = n[j*W + i]; return g ? [90, 88, 84] : [178*(0.9 + v*0.15), 172*(0.9 + v*0.15), 162*(0.9 + v*0.15)]; }); paint(hc, hx, (i, j) => { const g = i % T < 3 || j % T < 3, v = g ? 40 : 190 + (n[j*W + i] - 0.5)*60; return [v, v, v]; }); return mat(c, hc, null, { bump: 3, rep: [6, 1] }); }
function _soil() { const W = 256, [c, x] = canvas(W, W), [hc, hx] = canvas(W, W), n = fbm(W, W, [[16, 1], [4, 0.7], [1, 0.5]]); paint(c, x, (i, j) => { const v = n[j*W + i]; return [92*(0.7 + v*0.5), 62*(0.7 + v*0.5), 40*(0.7 + v*0.5)]; }); paint(hc, hx, (i, j) => { const v = n[j*W + i]*255; return [v, v, v]; }); return mat(c, hc, null, { bump: 4, rep: [12, 2] }); }
// the view through a window: sky, a fence, trees, the house over the road
function _viewOutside() {
  const [c, x] = canvas(512, 384); let g = x.createLinearGradient(0, 0, 0, 384); g.addColorStop(0, '#6aaee8'); g.addColorStop(0.6, '#bfe0f6'); g.addColorStop(1, '#e8f2f0'); x.fillStyle = g; x.fillRect(0, 0, 512, 384);
  x.fillStyle = 'rgba(255,255,255,.85)'; for (const [px, py, s] of [[90, 70, 1], [330, 50, 0.8], [450, 110, 0.6]]) for (const [dx, dy, r] of [[0, 0, 26], [28, 6, 20], [-28, 8, 18]]) { x.beginPath(); x.ellipse(px + dx*s, py + dy*s, r*s*1.6, r*s, 0, 0, 6.283); x.fill(); }
  x.fillStyle = '#c9b8a0'; x.fillRect(260, 170, 160, 140); x.fillStyle = '#8a4a3a'; x.beginPath(); x.moveTo(250, 172); x.lineTo(340, 120); x.lineTo(430, 172); x.fill(); x.fillStyle = '#e8eef4'; for (let i = 0; i < 3; i++) x.fillRect(278 + i*48, 200, 26, 34);
  for (let i = 0; i < 9; i++) { const tx = i*62 + 10, r = 30 + (i % 3)*10; x.fillStyle = i % 2 ? '#4f8a3c' : '#5f9a44'; x.beginPath(); x.arc(tx, 250 - r*0.6, r, 0, 6.283); x.fill(); }
  x.fillStyle = '#7fb35a'; x.fillRect(0, 280, 512, 104); x.fillStyle = '#e8e0d0'; for (let i = 0; i < 512; i += 18) x.fillRect(i, 260, 10, 50); x.fillRect(0, 272, 512, 6);
  if (REC) REC.list.push({ view: keep(c) });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export const floorWood = baked(_floorWood);
export const tiles = baked(_tiles);
export const wallpaper = baked(_wallpaper);
export const brick = baked(_brick);
export const roofTiles = baked(_roofTiles);
export const plaster = baked(_plaster);
export const fabric = baked(_fabric);
export const woodPainted = baked(_woodPainted);
export const woodGrain = baked(_woodGrain);
export const grass = baked(_grass);
export const paving = baked(_paving);
export const soil = baked(_soil);
export const viewOutside = baked(_viewOutside);