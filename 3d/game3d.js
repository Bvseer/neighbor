// The game in 3D: camera, light, people, things, taps, sounds. The rules live in sim.js, the house in house.js.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as SU from 'three/addons/utils/SkeletonUtils.js';
import * as G from './sim.js';
import { build, X, F, ZW, ZP, ZS } from './house.js';
import * as T from './tex.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, rnd = (a, b) => a + Math.random()*(b - a), lerp = (a, b, t) => a + (b - a)*t;
const PR = Object.fromEntries(G.PRANKS.map((p) => [p.id, p])), ACT = Object.fromEntries(G.ACTS.map((a) => [a.id, a]));
const setLoad = (u) => { $('lbar').style.width = Math.round(u*100) + '%'; };

// ---- renderer, scene, light ------------------------------------------------
const cv = $('cv'), DPR = Math.min(2, devicePixelRatio || 1);
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: DPR < 1.5, powerPreference: 'high-performance' });
// three levels of quality; a phone starts in the middle, and the game steps down by itself if frames come slow
const MOBILE = matchMedia('(pointer: coarse)').matches, QL = [{ dpr: 1, sh: 1024, soft: false }, { dpr: Math.min(1.5, DPR), sh: 1024, soft: true }, { dpr: DPR, sh: 2048, soft: true }];
let Q = MOBILE ? 1 : 2; const PERF = { n: 0, t: 0, slow: 0, fast: 0 };
R.setPixelRatio(QL[Q].dpr); R.shadowMap.enabled = true; R.shadowMap.type = QL[Q].soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
{ const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#4f8fd8'); g.addColorStop(0.55, '#a9d0f0'); g.addColorStop(1, '#f2e6d2'); x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
scene.fog = new THREE.Fog('#cfe0ec', 24, 60);
const pmrem = new THREE.PMREMGenerator(R); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.24;
const hemi = new THREE.HemisphereLight('#cfe0ff', '#8a6a4a', 0.36); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffdcb0', 5.2); sun.position.set(-6.5, 5.6, 9.5); sun.target.position.set(0, 2, -1.6); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(QL[Q].sh, QL[Q].sh); const sc = sun.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 8; sc.bottom = -4; sc.near = 1; sc.far = 40; sc.updateProjectionMatrix(); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3;
const camera = new THREE.PerspectiveCamera(28, 1, 0.3, 120);

// light thrown back by the floors and the walls: from below and from the other side, warm, no shadows
const bounce = new THREE.DirectionalLight('#ffd7a8', 0.4); bounce.position.set(5, -2, 6); scene.add(bounce);
setLoad(0.1);
// the surfaces come as ready pictures when they have been baked; otherwise they are drawn here
try { const r = await fetch('./textures/manifest.json'); if (r.ok) T.play(await r.json(), './textures/'); } catch (e) {}
const T0 = performance.now(); const H = build(scene); window.__buildMs = performance.now() - T0; setLoad(0.5);
// the house never moves: its matrices are worked out once
H.group.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; }); H.group.updateMatrixWorld(true);
const M = H.M;
// the lamps glow without lighting anything: a bright bulb and a soft halo
const halo = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,230,180,.9)'); g.addColorStop(0.35, 'rgba(255,200,130,.25)'); g.addColorStop(1, 'rgba(255,200,130,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
for (const l of H.lights) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75 })); sp.position.set(l.x, l.y, l.z + 0.05); sp.scale.setScalar(0.9); scene.add(sp); }
// a soft dark patch under each person so they stand on the floor even where the sun does not reach
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function blob() { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI/2; m.renderOrder = 1; scene.add(m); return m; }

// ---- things in the house that change: his chair, the sofa, the television, the pot's lid ---------------------
const sofa = new THREE.Group(); { const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; sofa.add(o); };
  add(new RoundedBoxGeometry(1.25, 0.24, 0.8, 3, 0.05), M.sofa, 0, 0.26, 0); add(new RoundedBoxGeometry(1.25, 0.5, 0.2, 3, 0.07), M.sofa, 0, 0.62, -0.3); for (const s of [-1, 1]) add(new RoundedBoxGeometry(0.17, 0.42, 0.82, 3, 0.07), M.sofa, s*0.62, 0.48, 0.01);
  for (const s of [-1, 1]) { add(new RoundedBoxGeometry(0.54, 0.14, 0.62, 3, 0.06), M.sofa, s*0.28, 0.45, 0.06); add(new RoundedBoxGeometry(0.52, 0.42, 0.16, 3, 0.07), M.sofa, s*0.28, 0.72, -0.16); }
  const cush = new RoundedBoxGeometry(0.3, 0.3, 0.12, 3, 0.05); const cm = new THREE.MeshStandardMaterial({ color: '#e8b84a', roughness: 0.9 }); const c1 = new THREE.Mesh(cush, cm); c1.position.set(-0.4, 0.68, -0.08); c1.rotation.z = 0.2; c1.castShadow = true; sofa.add(c1);
  for (const [x, z] of [[-0.58, -0.32], [0.58, -0.32], [-0.58, 0.32], [0.58, 0.32]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.14, 8), M.walnut); l.position.set(x, 0.07, z); l.name = x > 0 ? 'legR' : 'legL'; sofa.add(l); } }
sofa.position.set(X(990), 0, -2.42); scene.add(sofa);
const chair = new THREE.Group(); { const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; chair.add(o); };
  add(new RoundedBoxGeometry(0.42, 0.05, 0.42, 2, 0.01), M.pine, 0, 0.46, 0); for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) add(new THREE.BoxGeometry(0.04, 0.44, 0.04), M.pine, x, 0.22, z); add(new THREE.BoxGeometry(0.04, 0.48, 0.4), M.pine, 0.19, 0.72, 0); add(new THREE.BoxGeometry(0.05, 0.12, 0.42), M.pine, 0.19, 0.9, 0);
  add(new THREE.BoxGeometry(0.4, 0.04, 0.4), new THREE.MeshStandardMaterial({ color: '#d8b050', roughness: 0.9 }), 0, 0.5, 0); }
const CHAIR_HOME = new THREE.Vector3(X(836), 0, -2.05); chair.position.copy(CHAIR_HOME); scene.add(chair);
const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.46), new THREE.MeshBasicMaterial({ color: '#0c1216' })); tvScreen.position.set(X(1108), 0.85, -2.515); scene.add(tvScreen);
const tvLight = new THREE.PointLight('#9ec4ff', 0, 3.5, 1.5); tvLight.position.set(X(1108), 0.9, -2.1); scene.add(tvLight);

// ---- the things you can take, made small and real --------------------------
function itemMesh(k) {
  const g = new THREE.Group(), m = (c, r, mt) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.5 : r, metalness: mt || 0 }), add = (geo, mat, x, y, z, rx, ry, rz) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; g.add(o); return o; };
  if (k === 'pepper') { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.07, 0.02, 0), new THREE.Vector3(0, 0.03, 0), new THREE.Vector3(0.06, 0.015, 0), new THREE.Vector3(0.09, -0.01, 0)]); const tg = new THREE.TubeGeometry(c, 16, 0.018, 10); const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 0.07)/0.16; p.setY(i, p.getY(i)); } add(tg, new THREE.MeshPhysicalMaterial({ color: '#c8160e', roughness: 0.25, clearcoat: 1 }), 0, 0.02); add(new THREE.CylinderGeometry(0.006, 0.01, 0.04, 6), m('#3a7a2a'), -0.085, 0.035, 0, 0, 0, 1.2); }
  if (k === 'glue') { add(new THREE.CylinderGeometry(0.025, 0.025, 0.11, 14), m('#f4f2ea', 0.3), 0, 0.055); add(new THREE.ConeGeometry(0.022, 0.05, 12), m('#ff7a1a', 0.4), 0, 0.135); }
  if (k === 'saw') { add(new THREE.BoxGeometry(0.34, 0.08, 0.004), m('#c8ccd2', 0.25, 1), 0.04, 0.04); add(new RoundedBoxGeometry(0.1, 0.09, 0.03, 2, 0.01), m('#8a4a22', 0.6), -0.16, 0.045); }
  if (k === 'scissors') { for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.12, 0.012, 0.004), m('#d8dce2', 0.2, 1), 0.04, 0.03, 0, 0, 0, s*0.18); add(new THREE.TorusGeometry(0.022, 0.007, 8, 16), m('#d8362a', 0.4), -0.05, 0.03 + s*0.02); } }
  if (k === 'dye') { add(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 20), m('#2a5ad0', 0.35, 0.2), 0, 0.06); add(new THREE.CylinderGeometry(0.062, 0.062, 0.012, 20), m('#c8ccd2', 0.3, 1), 0, 0.125); add(new THREE.TorusGeometry(0.05, 0.004, 6, 20, Math.PI), m('#a8acb2', 0.3, 1), 0, 0.13, 0, 0, 0, 0); }
  if (k === 'mustard') { add(new THREE.CylinderGeometry(0.03, 0.034, 0.14, 14), new THREE.MeshPhysicalMaterial({ color: '#f2c814', roughness: 0.3, clearcoat: 0.6 }), 0, 0.07); add(new THREE.ConeGeometry(0.03, 0.05, 12), m('#d8362a', 0.4), 0, 0.165); }
  if (k === 'alarm') { add(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 24), m('#d8362a', 0.3, 0.4), 0, 0.07, 0, Math.PI/2); add(new THREE.CircleGeometry(0.05, 24), m('#f8f4ea', 0.6), 0, 0.07, 0.021); for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.025, 12, 8, 0, Math.PI*2, 0, Math.PI/2), m('#c8ccd2', 0.25, 1), s*0.04, 0.12, 0, 0, 0, -s*0.4); for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6), m('#333'), s*0.035, 0.02, 0, 0, 0, s*0.4); add(new THREE.BoxGeometry(0.003, 0.035, 0.002), m('#111'), 0, 0.08, 0.023); }
  if (k === 'pins') { add(new RoundedBoxGeometry(0.08, 0.03, 0.06, 2, 0.006), m('#3a6ac0', 0.5), 0, 0.015); for (let i = 0; i < 4; i++) { add(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 10), m(['#e8362a', '#f2c814', '#2ab04a', '#3a7ae8'][i], 0.3), -0.025 + i*0.017, 0.04, 0); } }
  if (k === 'soap') { add(new RoundedBoxGeometry(0.09, 0.035, 0.055, 3, 0.015), new THREE.MeshPhysicalMaterial({ color: '#f4a6c4', roughness: 0.35, clearcoat: 0.5 }), 0, 0.018); }
  g.scale.setScalar(1.35); return g;
}
// where each thing lies, and where each prank is set: metres
const SPOT = { pepper: [540, 1.23, ZW + 0.12], glue: [1240, F[1] + 1.23, ZW + 0.12], saw: [1468, 0.9, -2.17], scissors: [905, F[1] + 0.55, ZW + 0.25], dye: [248, 0.85, ZW + 0.2], mustard: [852, 1.85, ZW + 0.35], alarm: [1000, F[1] + 1.53, ZW + 0.12], pins: [905, 0.61, -2.6], soap: [530, F[1] + 1.23, ZW + 0.12] };
const PSPOT = { pepper: [625, 1.12, ZW + 0.42], glue: [836, 0.53, -2.05], saw: [1048, 0.05, -2.1], hose: [1385, 0.03, -1.45], dye: [262, F[1] + 1.92, ZW + 0.3], mustard: [324, F[1] + 0.98, ZW + 0.12], alarm: [705, F[1] + 0.74, -2.2], pins: [1086, F[1] + 0.53, -2.0], soap: [372, 0.2, ZS] };
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(0.4, 'rgba(255,220,120,.45)'); g.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const ITEMS = {}, ARMED = {};
for (const k in G.ITEMS) { const o = itemMesh(k), [x, y, z] = SPOT[k]; o.position.set(X(x), y, z); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); gl.scale.setScalar(0.5); gl.position.set(X(x), y + 0.06, z + 0.05); scene.add(o, gl); ITEMS[k] = { o, gl }; }
for (const r of G.PRANKS) { const o = itemMesh(r.item), [x, y, z] = PSPOT[r.id]; o.position.set(X(x), y, z); o.scale.setScalar(1.1); o.visible = false; scene.add(o); ARMED[r.id] = o; }
// a ring on the floor where the thing in my hands is wanted
const target = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 40), new THREE.MeshBasicMaterial({ color: '#4fd6ff', transparent: true, opacity: 0.85, depthWrite: false })); target.rotation.x = -Math.PI/2; target.visible = false; scene.add(target);
const tapRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.17, 32), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthWrite: false })); tapRing.rotation.x = -Math.PI/2; scene.add(tapRing);

// ---- where he looks: a fan of light in front of his eyes ------------------
const coneGeo = new THREE.BufferGeometry(); coneGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3)); coneGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(16), 4)); coneGeo.setIndex([0, 1, 2, 0, 2, 3]);
const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); cone.frustumCulled = false; scene.add(cone);

// ---- sparks, drops, steam: one cloud of points ------------------------------
const NP = 400, pGeo = new THREE.BufferGeometry(), pPos = new Float32Array(NP*3), pCol = new Float32Array(NP*3), pSize = new Float32Array(NP), PART = [];
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3)); pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
const pMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true, blending: THREE.NormalBlending, uniforms: { scale: { value: 400 } },
  vertexShader: 'uniform float scale; attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size*scale/-mv.z; gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, smoothstep(0.5, 0.2, d)); }' });
const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; scene.add(pts);
const col3 = new THREE.Color();
function part(x, y, z, vx, vy, vz, life, col, size, g) { if (PART.length >= NP) PART.shift(); PART.push({ x, y, z, vx, vy, vz, life, max: life, c: col3.set(col).toArray(), size, g: g === undefined ? -9 : g }); }

// ---- the people -------------------------------------------------------------
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const ONCE = { fall: 1 };                 // motions that happen once and stay where they end
const BODY = {}, PEOPLE = new Map();       // the two bodies as loaded; id -> { o, mixer, act, cur, z, rot }
// what to play when a motion has not been brought in yet: the nearest one there is
const FALLBACK = { walk: ['sneak', 'idle'], run: ['walk', 'idle'], sneak: ['walk', 'idle'], pick: ['idle'], sit: ['idle'], sleep: ['idle'], angry: ['look', 'idle'], look: ['idle'], fall: ['scared', 'idle'], scared: ['angry', 'idle'], cook: ['idle'], type: ['sit', 'idle'], eat: ['sit', 'idle'], dance: ['idle'], sad: ['idle'] };
function person(kind) {
  const B = BODY[kind], o = SU.clone(B.scene); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; if (m.material) { m.material = m.material.clone(); if (kind === 'boss') m.material.userData.skin = /Skin|Arms|Head/i.test(m.material.name + m.name); } } });
  o.scale.setScalar(kind === 'boss' ? 0.0098 : 0.0092); scene.add(o);
  const mixer = new THREE.AnimationMixer(o), act = {}; for (const c of B.animations) act[c.name] = mixer.clipAction(c);
  const P = { o, mixer, act, cur: '', z: ZP, rot: 0, kind, bones: { hips: o.getObjectByName('mixamorigHips'), lu: o.getObjectByName('mixamorigLeftUpLeg'), ru: o.getObjectByName('mixamorigRightUpLeg'), ll: o.getObjectByName('mixamorigLeftLeg'), rl: o.getObjectByName('mixamorigRightLeg'), hand: o.getObjectByName('mixamorigRightHand') } };
  P.blob = blob(); play(P, 'idle'); return P;
}
function play(P, name, fade) { if (!P.act[name]) { for (const f of FALLBACK[name] || []) if (P.act[f]) { name = f; break; } } if (P.cur === name || !P.act[name]) return; const a = P.act[name], b = P.act[P.cur]; if (ONCE[name]) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } a.reset().setEffectiveWeight(1).play(); if (b) b.crossFadeTo(a, fade || 0.25, false); P.cur = name; }
// a sitting pose laid over whatever is playing: thighs forward, shins down, hips lower
function sit(P) { if (P.act.sit) return; const b = P.bones; if (!b.lu) return; b.lu.rotation.x -= 1.45; b.ru.rotation.x -= 1.45; b.ll.rotation.x += 1.5; b.rl.rotation.x += 1.5; }

// ---- the camera -------------------------------------------------------------
const CAM = { x: 0, near: false };
function resize() {
  const w = innerWidth, h = innerHeight, rot = matchMedia('(pointer: coarse)').matches && h > w*1.05; document.body.classList.toggle('rot', rot); CAM.rot = rot;
  const CW = rot ? h : w, CH = rot ? w : h; R.setSize(CW, CH, false); cv.style.width = CW + 'px'; cv.style.height = CH + 'px'; camera.aspect = CW/CH; CAM.near = CH < 520 || CW < 760; camera.updateProjectionMatrix(); CAM.w = CW; CAM.h = CH;
}
addEventListener('resize', resize); resize();
function setQuality(q) {
  Q = q; const L = QL[q]; R.setPixelRatio(L.dpr); resize(); if (sun.shadow.mapSize.x !== L.sh) { sun.shadow.mapSize.set(L.sh, L.sh); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  const t = L.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; if (R.shadowMap.type !== t) { R.shadowMap.type = t; scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); }); }
}
// every two seconds: if frames took longer than about 1/45 s, one step down; if they came quickly for long, one step back up
function watchSpeed(dt) { PERF.n++; PERF.t += dt; if (PERF.t < 2) return; const avg = PERF.t/PERF.n; PERF.n = 0; PERF.t = 0;
  if (avg > 1/45) { PERF.fast = 0; if (Q > 0 && ++PERF.slow >= 1) { PERF.slow = 0; setQuality(Q - 1); } } else if (avg < 1/57) { PERF.slow = 0; if (Q < QL.length - 1 && ++PERF.fast >= 8) { PERF.fast = 0; setQuality(Q + 1); } } else { PERF.slow = 0; PERF.fast = 0; } }
function placeCamera(dt, fx) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov/2)), a = camera.aspect;
  // the whole house and its yards, or on a small screen the two floors and a part of the width, following you
  const W = CAM.near ? 9.5 : 15.6, Hh = CAM.near ? 5.1 : 7.9, cy = CAM.near ? 2.35 : 3.1, d = Math.max(W/2/(t*a), Hh/2/t) + 0.6;
  const half = W/2, tx = CAM.near ? clamp(fx, -7.2 + half, 7.6 - half) : 0.2; CAM.x = dt ? lerp(CAM.x, tx, Math.min(1, dt*3)) : tx;
  camera.position.set(CAM.x, cy + 1.1, d - 1.6); camera.lookAt(CAM.x, cy - 0.05, -1.6); camera.updateMatrixWorld();
}

// ---- hud, taps, sounds: as in the flat version --------------------------------
let toastT = 0; function toast(t, ms) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), ms || 1800); }
for (const r of G.PRANKS) { const d = document.createElement('div'); d.className = 'chip'; d.id = 'c_' + r.id; d.textContent = G.ITEMS[r.item].ico; d.onclick = () => { const it = G.ITEMS[r.item], room = G.roomAt(it.fl, it.x), st = HUD.pr && HUD.pr[r.id]; toast(r.name + (st === 2 ? ' — готово ✓' : st === 1 ? ' — ждёт соседа' : ': ' + it.ico + ' ' + it.name.toLowerCase() + ' — ' + room.name.toLowerCase()), 2600); }; $('chips').appendChild(d); }
const HUD = {};
function hud(S) {
  const m = Math.max(0, Math.ceil(S.left)), t = Math.floor(m/60) + ':' + String(m % 60).padStart(2, '0'); if (HUD.t !== t) { HUD.t = t; $('tm').textContent = t; $('tm').classList.toggle('low', m <= 30); }
  const a = G.ACTS[S.n[5]], md = S.n[4], nt = md === 'chase' ? '😡 Гонится за кем-то!' : md === 'alert' ? '😠 Кого-то заметил!' : md === 'search' ? '🧐 Ищет…' : md === 'react' ? '🤯 Попался!' : md === 'gloat' ? '😤 Выгоняет' : a.ico + ' Сосед ' + (md === 'walk' ? 'идёт: ' : '') + a.txt, nx = G.ACTS[(S.n[5] + 1) % G.ACTS.length], nt2 = 'потом ' + nx.txt;
  if (HUD.n !== nt + nt2) { HUD.n = nt + nt2; $('nst').innerHTML = nt + '<small>' + nt2 + '</small>'; }
  const sc = S.sc + '|' + S.cb; if (HUD.sc !== sc) { HUD.sc = sc; $('sc').innerHTML = S.sc + '<small>' + (S.cb > 1 ? 'серия ×' + S.cb : '') + '</small>'; }
  const me = S.ps.find((p) => p[4] === ME), item = me ? me[7] : '', hide = me ? me[8] : ''; if (HUD.item !== item) { HUD.item = item; $('slot').textContent = item ? G.ITEMS[item].ico : ''; }
  if (HUD.hide !== hide) { HUD.hide = hide; $('leave').style.display = hide ? 'block' : 'none'; }
  HUD.pr = S.pr; const key = JSON.stringify(S.pr) + item; if (HUD.chips !== key) { HUD.chips = key; for (const r of G.PRANKS) $('c_' + r.id).className = 'chip' + (S.pr[r.id] === 2 ? ' done' : S.pr[r.id] === 1 ? ' arm' : item === r.item ? ' need' : ''); }
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), walkPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -ZP), hit = new THREE.Vector3();
cv.addEventListener('pointerdown', (e) => {
  if (!GAME && !NET) return; audioOn(); const S = VIEW; if (!S || S.ph !== 'play') return;
  let px = e.clientX, py = e.clientY; if (CAM.rot) { px = e.clientY; py = innerWidth - e.clientX; }
  ndc.set(px/CAM.w*2 - 1, -(py/CAM.h)*2 + 1); ray.setFromCamera(ndc, camera);
  // a thing hit straight on counts first; otherwise where the ray crosses the plane people walk in
  const objs = []; for (const k in ITEMS) if (S.it[k] === 'spot') objs.push(ITEMS[k].o); const hits = ray.intersectObjects(objs, true);
  if (hits.length) { let o = hits[0].object; while (o.parent && !Object.values(ITEMS).some((it) => it.o === o)) o = o.parent; const k = Object.keys(ITEMS).find((q) => ITEMS[q].o === o); if (k) { send({ t: 'use', kind: 'item', id: k }); toast(G.ITEMS[k].ico + ' ' + G.ITEMS[k].name + ' — для: ' + G.PRANKS.find((r) => r.item === k).name.toLowerCase(), 2000); ring(G.ITEMS[k].x, G.ITEMS[k].fl); return; } }
  if (!ray.ray.intersectPlane(walkPlane, hit)) return; const wx = hit.x*100 + 756, fl = hit.y > F[1] - 0.25 ? 1 : 0; if (hit.y < -0.6 || hit.y > F[1] + 2.4) return;
  const me = S.ps.find((p) => p[4] === ME), have = me && me[7];
  let best = null, bd = CAM.near ? 55 : 45; const near = (o, kind, id) => { if (o.fl !== fl) return; const d = Math.abs(o.x - wx); if (d < bd) { bd = d; best = { kind, id }; } };
  for (const r of G.PRANKS) if (!S.pr[r.id] && have === r.item) near(r, 'prank', r.id);
  if (!best) for (const k in G.ITEMS) if (S.it[k] === 'spot') near(G.ITEMS[k], 'item', k);
  if (!best) for (const h of G.HIDES) near(h, 'hide', h.id);
  if (best) { send({ t: 'use', kind: best.kind, id: best.id }); const o = best.kind === 'item' ? G.ITEMS[best.id] : best.kind === 'prank' ? PR[best.id] : G.HIDES.find((h) => h.id === best.id); ring(o.x, o.fl);
    if (best.kind === 'item') toast(G.ITEMS[best.id].ico + ' ' + G.ITEMS[best.id].name + ' — для: ' + G.PRANKS.find((r) => r.item === best.id).name.toLowerCase(), 2000); else if (best.kind === 'hide') toast('Прячусь: ' + G.HIDES.find((h) => h.id === best.id).name.toLowerCase()); }
  else { for (const r of G.PRANKS) if (!S.pr[r.id] && r.fl === fl && Math.abs(r.x - wx) < 30) toast(r.name + ': нужно ' + G.ITEMS[r.item].ico + ' ' + G.ITEMS[r.item].name.toLowerCase(), 2200); send({ t: 'go', fl: fl, x: wx }); ring(wx, fl); }
});
function ring(x, fl) { tapRing.position.set(X(x), F[fl] + 0.03, ZP); tapRing.material.opacity = 1; tapRing.scale.setScalar(0.6); }
$('leave').onclick = () => send({ t: 'leave' });
let AC = null; function audioOn() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); }
function sfx(kind) { if (!AC) return; const t = AC.currentTime, out = AC.createGain(); out.gain.value = 0.6; out.connect(AC.destination);
  const tone = (type, f0, f1, dur, vol, at) => { const o = AC.createOscillator(), g = AC.createGain(), s = t + (at || 0); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + dur); g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.001, s + dur); o.connect(g); g.connect(out); o.start(s); o.stop(s + dur + 0.02); };
  const noise = (dur, f0, f1, vol) => { const n = Math.floor(AC.sampleRate*dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random()*2 - 1; const s = AC.createBufferSource(), lp = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = b; lp.frequency.setValueAtTime(f0, t); lp.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(lp); lp.connect(g); g.connect(out); s.start(t); };
  if (kind === 'pick') { tone('triangle', 660, 990, 0.1, 0.25); tone('triangle', 990, 1320, 0.12, 0.2, 0.08); }
  else if (kind === 'arm') { tone('square', 300, 200, 0.08, 0.1); tone('square', 400, 260, 0.08, 0.1, 0.1); }
  else if (kind === 'spot') { tone('sawtooth', 880, 880, 0.12, 0.15); tone('sawtooth', 660, 660, 0.18, 0.15, 0.14); }
  else if (kind === 'caught') { noise(0.3, 3000, 300, 0.4); tone('sine', 300, 80, 0.4, 0.4); }
  else if (kind === 'prank') { tone('triangle', 520, 1040, 0.15, 0.3); tone('triangle', 660, 1320, 0.15, 0.3, 0.12); tone('triangle', 784, 1568, 0.3, 0.3, 0.24); noise(0.5, 1800, 400, 0.15); }
  else if (kind === 'no') tone('square', 200, 150, 0.12, 0.1);
  else if (kind === 'over') { tone('triangle', 523, 523, 0.14, 0.25); tone('triangle', 659, 659, 0.14, 0.25, 0.14); tone('triangle', 784, 784, 0.4, 0.25, 0.28); } }

// ---- labels over the picture: speech, points, the progress of an action -----------------
const tags = $('tags'), TAG = {};
function tag(id, cls, html, x, y, z) { let e = TAG[id]; if (!e) { e = TAG[id] = document.createElement('div'); tags.appendChild(e); } if (e._c !== cls) { e.className = cls; e._c = cls; } if (e._h !== html) { e.innerHTML = html; e._h = html; } const v = new THREE.Vector3(x, y, z).project(camera); e.style.left = ((v.x + 1)/2*CAM.w).toFixed(1) + 'px'; e.style.top = ((1 - v.y)/2*CAM.h).toFixed(1) + 'px'; e.style.display = v.z < 1 ? '' : 'none'; e._seen = true; }
const FLOATS = [];

// ---- one frame --------------------------------------------------------------
const worldZ = (P, y, mode) => { const dy = Math.min(Math.abs(y - F[0]), Math.abs(y - F[1])); return lerp(ZP, ZS, clamp(dy/0.35, 0, 1)); };
const SIT_UP = 0.4;
const SLEEP = { x: 790, y: 0.56, z: -2.15, ry: -Math.PI/2 };
const ACTZ = { cook: [-2.05, -0.5], eat: [-2.05, 0], tv: [-2.38, 0.9], garden: [-1.35, 0.3], shower: [-2.45, 1.2], teeth: [-2.1, -0.4], sleep: [-2.15, 0], desk: [-1.95, -0.2] };
function frameDraw(S, dt, now) {
  for (const k in TAG) TAG[k]._seen = false;
  const me = S.ps.find((p) => p[4] === ME), have = me && me[7];
  // the neighbour
  const N = S.n, mode = N[4], act = G.ACTS[N[5]], fx = N[13];
  let P = PEOPLE.get('n'); if (!P) { P = person('boss'); PEOPLE.set('n', P); }
  { const x = X(N[0]), y = (540 - N[1])/100, inAct = mode === 'act' || (mode === 'react' && !['soap'].includes(fx)), az = inAct && ACTZ[act.id] ? ACTZ[act.id][0] : worldZ(P, y);
    P.z = lerp(P.z, az, Math.min(1, dt*4)); let ry = N[3] > 0 ? Math.PI/2 - 0.35 : -Math.PI/2 + 0.35; if (mode === 'act' && ACTZ[act.id]) ry = N[3] > 0 ? Math.PI/2 - 0.35 + ACTZ[act.id][1] : -Math.PI/2 + 0.35 - ACTZ[act.id][1];
    if (mode === 'act' && act.id === 'shower') ry = 0.2; if (mode === 'act' && act.id === 'desk') ry = Math.PI*0.92; if (mode === 'act' && act.id === 'tv') ry = 0.9; if (mode === 'act' && act.id === 'eat') ry = -Math.PI/2 + 0.6;
    P.rot = lerp(P.rot, ry, Math.min(1, dt*8)); P.o.rotation.set(0, P.rot, 0); P.o.position.set(x, y, P.z);
    const lie = (mode === 'act' && act.id === 'sleep') || (mode === 'react' && (fx === 'saw' || fx === 'soap'));
    const sitting = mode === 'act' && ['eat', 'tv', 'desk'].includes(act.id) || (mode === 'react' && ['glue', 'pins'].includes(fx) && N[14] < 0.3);
    const busy = { cook: 'cook', eat: 'eat', tv: 'sit', desk: 'type', sleep: 'sleep', garden: 'idle', shower: 'idle', teeth: 'idle' };
    play(P, mode === 'chase' ? 'run' : mode === 'walk' ? 'walk' : mode === 'search' ? 'look' : mode === 'react' ? (lie ? 'fall' : 'scared') : mode === 'gloat' ? 'angry' : mode === 'alert' ? 'angry' : mode === 'act' ? busy[act.id] : 'idle');
    P.mixer.timeScale = 1; P.mixer.update(dt); if (sitting) { sit(P); P.o.position.y = P.act.sit ? y + SIT_UP : y - 0.42; }
    // with a real sleeping motion he lies on the bed by himself: put him there, head to the pillow
    if (mode === 'act' && act.id === 'sleep' && P.act.sleep) { P.o.position.set(X(SLEEP.x), F[1] + SLEEP.y, SLEEP.z); P.o.rotation.set(0, SLEEP.ry, 0); }
    if (lie && !(P.act.sleep && mode === 'act') && !(P.act.fall && mode === 'react')) { P.o.rotation.set(0, 0, act.id === 'sleep' && mode === 'act' ? Math.PI/2 : -Math.PI/2); P.o.position.set(act.id === 'sleep' && mode === 'act' ? X(800) : x, y + (act.id === 'sleep' && mode === 'act' ? 0.72 : 0.22), act.id === 'sleep' && mode === 'act' ? -2.15 : P.z); }
    if (mode === 'react' && ['alarm', 'pins', 'pepper'].includes(fx)) P.o.position.y += Math.abs(Math.sin(N[14]*9))*0.35;
    P.blob.position.set(P.o.position.x, Math.max(y, P.o.position.y) + 0.012, P.o.position.z); P.blob.visible = !lie; P.blob.scale.setScalar(sitting ? 1.2 : 1);
    // skin goes blue for good after the dye
    const tint = N[10] ? '#7aa0ff' : fx === 'pepper' && mode === 'react' ? '#ff8a70' : fx === 'mustard' && mode === 'react' ? '#d8e070' : '#ffffff'; if (P.tint !== tint) { P.tint = tint; P.o.traverse((m) => { if (m.isMesh && m.material.userData.skin) m.material.color.set(tint); }); }
    // his own chair rides along once the glue has done its work
    if (N[12] > 0) { chair.position.set(x - (N[3] > 0 ? 0.25 : -0.25), y + 0.25, P.z - 0.05); chair.rotation.set(0, P.rot + Math.PI/2, 0.4); } else if (S.pr.glue === 2) { chair.position.set(X(836), 0, -2.05); chair.rotation.set(0, 0, Math.PI/2); chair.position.y = 0.22; } else { chair.position.copy(CHAIR_HOME); chair.rotation.set(0, 0, 0); }
    // where he looks
    const see = mode === 'act' ? act.see : mode === 'walk' ? 430 : ['chase', 'search', 'alert'].includes(mode) ? 700 : 0, pp = cone.geometry.attributes.position, cc = cone.geometry.attributes.color;
    if (see > 0 && !N[15] && !lie) { const room = G.roomAt(N[2], N[0]), ex = X(clamp(N[0] + N[3]*see, room.x0, room.x1)), red = mode === 'chase' || mode === 'alert', hy = y + 1.62, zc = P.z + 0.05;
      pp.setXYZ(0, x + N[3]*0.12, hy + 0.05, zc); pp.setXYZ(1, ex, y + 2.0, zc); pp.setXYZ(2, ex, y + 0.02, zc); pp.setXYZ(3, x + N[3]*0.12, hy - 0.08, zc);
      const c = red ? [1, 0.25, 0.15] : [1, 0.85, 0.35]; for (let i = 0; i < 4; i++) cc.setXYZW(i, c[0], c[1], c[2], i === 0 || i === 3 ? 0.32 : 0); pp.needsUpdate = cc.needsUpdate = true; cone.visible = true; } else cone.visible = false;
    if (N[7] && N[8] > 0) tag('say', 'bub' + (['chase', 'alert', 'gloat'].includes(mode) ? ' hot' : mode === 'react' ? ' joy' : ''), N[7], x, y + (lie ? 0.9 : sitting ? 1.6 : 2.05), P.z);
    else if (mode === 'alert') tag('say', 'bub hot', '!', x, y + 2.05, P.z);
    // what he is busy with: steam, a lit television, water
    if (mode === 'act' && act.id === 'cook' && Math.random() < 0.35) part(X(625) + rnd(-0.06, 0.06), 1.15, ZW + 0.42, rnd(-0.05, 0.05), rnd(0.25, 0.4), 0, 1.6, '#ffffff', 0.09, 0.05);
    const watching = mode === 'act' && act.id === 'tv'; tvScreen.material.color.setHSL(watching ? (now*0.08) % 1 : 0.55, watching ? 0.55 : 0.3, watching ? 0.55 + Math.sin(now*17)*0.05 : 0.04); tvLight.intensity = watching ? 1.6 + Math.sin(now*13)*0.3 : 0;
    if (mode === 'act' && act.id === 'shower') for (let i = 0; i < 3; i++) part(X(262) + rnd(-0.07, 0.07), F[1] + 1.9, ZW + 0.3 + rnd(-0.06, 0.06), rnd(-0.1, 0.1), -1.5, rnd(-0.1, 0.1), 0.6, '#bfe2ff', 0.03);
    if ((mode === 'act' && act.id === 'garden') || (mode === 'react' && fx === 'hose')) for (let i = 0; i < 3; i++) { if (mode === 'react') part(X(1385), 0.05, -1.45, rnd(-0.5, 0.5), rnd(2, 3.4), rnd(-0.3, 0.3), 0.9, '#9ed4ff', 0.035); else part(x + 0.45, y + 1.1, P.z + 0.1, rnd(1.3, 1.7), rnd(0.2, 0.6), rnd(-0.1, 0.1), 0.8, '#9ed4ff', 0.03); }
    if (mode === 'react' && fx === 'pepper' && Math.random() < 0.8) part(x + N[3]*0.15, y + 1.65, P.z, N[3]*rnd(1.2, 2.2), rnd(-0.2, 0.3), rnd(-0.2, 0.2), 0.45, Math.random() < 0.5 ? '#ffd23f' : '#ff5a2a', 0.08, 1);
    if (N[11] > 0 && Math.random() < 0.4) part(x + rnd(-0.2, 0.2), y + rnd(0.3, 1.7), P.z + 0.15, 0, -0.3, 0, 0.6, '#9ed4ff', 0.025);
    if (mode === 'act' && act.id === 'sleep' && Math.random() < 0.03) FLOATS.push({ t: 'z', html: '💤', x: x + 0.3, y: y + 1.1, z: P.z, life: 2, max: 2 }); }
  // the sofa leans once a leg is sawn through
  sofa.rotation.z = lerp(sofa.rotation.z, S.pr.saw === 2 ? -0.09 : 0, Math.min(1, dt*6)); sofa.position.y = S.pr.saw === 2 ? 0.06 : 0;
  // the players
  for (const p of S.ps) { const [px, py, , f, id, name, c, item, hide, out, ak, at] = p; let Q = PEOPLE.get(id); if (!Q) { Q = person('aj'); PEOPLE.set(id, Q); }
    const x = X(px), y = (540 - py)/100, l = Q.last || { x, y }, moving = Math.abs(l.x - x) + Math.abs(l.y - y) > 0.0005; Q.last = { x, y };
    Q.o.visible = !hide; if (Q.blob) Q.blob.visible = !hide; if (hide) { const h = G.HIDES.find((q) => q.id === hide); if (id === ME) tag('hide' + id, 'bub', '👀 ' + h.name.toLowerCase(), X(h.x), F[h.fl] + 1.4, ZP); continue; }
    const az = ak === 'item' || ak === 'prank' ? -2.0 : worldZ(Q, y); Q.z = lerp(Q.z, az, Math.min(1, dt*5)); const ry = ak ? Math.PI*0.9*(f > 0 ? 1 : -1) : f > 0 ? Math.PI/2 - 0.3 : -Math.PI/2 + 0.3; Q.rot = lerp(Q.rot, ry, Math.min(1, dt*10)); Q.o.rotation.set(0, Q.rot, 0); Q.o.position.set(x, y, Q.z);
    // after a prank of ours goes off, a little dance where he can't see
    const party = S.t - (LASTPRANK || -99) < 3 && !moving && !ak;
    const chased = (N[4] === 'chase' || N[4] === 'alert') && N[16] === id;
    // near him he creeps, the motion sped up to the pace the game moves him at; elsewhere he runs, as the pace really is a jog
    const nearN = N[2] === p[2] && Math.abs(N[0] - px) < 520 && !chased, stairs = Math.abs(l.y - y) > 0.0005, loco = chased || !nearN ? 'run' : stairs ? 'walk' : 'sneak';
    play(Q, out > 0 ? 'sad' : ak === 'prank' ? 'pick' : ak === 'item' ? 'pick' : moving ? loco : party ? 'dance' : 'idle', 0.2);
    Q.mixer.timeScale = moving ? (loco === 'sneak' ? 1.9 : loco === 'run' ? 0.78 : 1.3) : 1; Q.mixer.update(dt);
    Q.blob.position.set(x, y + 0.012, Q.z); Q.blob.visible = true;
    if (item) { const it = Q.carry && Q.carry.k === item ? Q.carry : (() => { if (Q.carry) Q.carry.o.removeFromParent(); const o = itemMesh(item); o.scale.setScalar(1.6); scene.add(o); return Q.carry = { k: item, o }; })(); Q.bones.hand.getWorldPosition(it.o.position); it.o.position.y += 0.03; it.o.rotation.y = now; }
    else if (Q.carry) { Q.carry.o.removeFromParent(); Q.carry = null; }
    if (ak) { const u = clamp(at/G.ACT_T[ak], 0, 1); tag('act' + id, 'ring', '', x, y + 2.0, Q.z); TAG['act' + id].style.background = 'conic-gradient(#ffcf3a ' + (u*360) + 'deg, rgba(0,0,0,.4) 0)'; }
    if (out > 0) tag('out' + id, 'bub', '😵 выгнали', x, y + 2.0, Q.z);
    if (S.ps.length > 1) { tag('nm' + id, 'name', name, x, y - 0.05, Q.z); TAG['nm' + id].style.color = G.COLORS[c]; } }
  for (const [id, Q] of PEOPLE) if (id !== 'n' && !S.ps.some((p) => p[4] === id)) { Q.o.removeFromParent(); Q.blob.removeFromParent(); if (Q.carry) Q.carry.o.removeFromParent(); PEOPLE.delete(id); }
  // things on their spots, armed pranks, where my thing is wanted
  for (const k in ITEMS) { const on = S.it[k] === 'spot'; ITEMS[k].o.visible = on; ITEMS[k].gl.visible = on; if (on) { ITEMS[k].gl.material.opacity = 0.55 + Math.sin(now*3 + G.ITEMS[k].x)*0.3; ITEMS[k].o.rotation.y = Math.sin(now*1.5 + G.ITEMS[k].x)*0.4; } }
  for (const r of G.PRANKS) ARMED[r.id].visible = S.pr[r.id] === 1;
  const want = have && G.PRANKS.find((r) => r.item === have && !S.pr[r.id]); target.visible = !!want; if (want) { const [x, y, z] = PSPOT[want.id]; target.position.set(X(x), F[want.fl] + 0.03, ZP); target.scale.setScalar(1 + Math.sin(now*6)*0.12); tag('want', 'bub', '⬇ сюда', X(x), F[want.fl] + 1.0, ZP); }
  tapRing.material.opacity = Math.max(0, tapRing.material.opacity - dt*2); tapRing.scale.setScalar(tapRing.scale.x + dt*1.2);
  // particles
  for (let i = PART.length - 1; i >= 0; i--) { const p = PART[i]; p.life -= dt; if (p.life <= 0) { PART.splice(i, 1); continue; } p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; }
  for (let i = 0; i < NP; i++) { const p = PART[i]; if (p) { pPos[i*3] = p.x; pPos[i*3 + 1] = p.y; pPos[i*3 + 2] = p.z; const u = p.life/p.max; pCol[i*3] = p.c[0]; pCol[i*3 + 1] = p.c[1]; pCol[i*3 + 2] = p.c[2]; pSize[i] = p.size*(p.g > 0 ? 2.4 - u*1.4 : 1); } else pSize[i] = 0; }
  pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = pGeo.attributes.size.needsUpdate = true; pGeo.setDrawRange(0, NP);
  // floating labels
  for (let i = FLOATS.length - 1; i >= 0; i--) { const f = FLOATS[i]; f.life -= dt; if (f.life <= 0) { FLOATS.splice(i, 1); if (TAG['f' + f.id]) { TAG['f' + f.id].remove(); delete TAG['f' + f.id]; } continue; } if (!f.id) f.id = Math.random().toString(36).slice(2); const u = f.life/f.max; tag('f' + f.id, 'float', f.html, f.x, f.y + (1 - u)*0.6, f.z); TAG['f' + f.id].style.opacity = Math.min(1, u*2); }
  for (const k in TAG) if (!TAG[k]._seen) TAG[k].style.display = 'none';
  placeCamera(dt, me ? X(me[0]) : X(N[0]));
  R.render(scene, camera);
}

// ---- events: sounds, points, bursts -------------------------------------------
let SEEN = 0, LASTPRANK = -99;
function events(S) {
  for (const e of S.ev) { if (e.k <= SEEN) continue; SEEN = e.k; const p = e.p !== undefined ? S.ps.find((q) => q[4] === e.p) : null, mine = e.p === ME;
    if (e.e === 'pick' && mine) { sfx('pick'); const [x, y, z] = SPOT[e.id]; for (let i = 0; i < 14; i++) part(X(x), y + 0.1, z, rnd(-0.8, 0.8), rnd(0.5, 1.6), rnd(-0.3, 0.6), 0.6, '#ffe17a', 0.05, -4); }
    else if (e.e === 'arm') { if (mine) sfx('arm'); toast((p ? (mine ? 'Готово: ' : p[5] + ': ') : '') + PR[e.id].name.toLowerCase() + ' — ждём соседа', 2000); }
    else if (e.e === 'no' && mine) { sfx('no'); toast(e.txt, 2000); }
    else if (e.e === 'spot') { sfx('spot'); if (mine) toast('Тебя заметили! Беги на улицу или прячься', 2200); }
    else if (e.e === 'caught') { sfx('caught'); if (mine) toast('Тебя выгнали! Возвращайся, когда очухаешься', 2400); for (let i = 0; i < 24; i++) part(X(100), 1, ZP, rnd(-1, 1), rnd(0.3, 1.5), rnd(-0.5, 0.5), 0.9, '#ffffff', 0.12, -1); }
    else if (e.e === 'prank') { LASTPRANK = S.t; sfx('prank'); const N = S.n, x = X(N[0]), y = (540 - N[1])/100; FLOATS.push({ html: '+' + e.pts + (e.combo > 1 ? ' ×' + e.combo : ''), x, y: y + 2.3, z: -1.5, life: 1.8, max: 1.8 }); for (let i = 0; i < 40; i++) part(x, y + 1.2, -1.5, rnd(-2, 2), rnd(1, 3.5), rnd(-1, 1.5), 1.1, ['#ffcf3a', '#ff6fae', '#4fd6ff', '#7ee05a'][i % 4], 0.06, -6); }
    else if (e.e === 'over') { sfx('over'); setTimeout(() => showOver(e), 1300); } }
}

// ---- a game on your own -------------------------------------------------------
let GAME = null, VIEW = null, ME = 'me';
function send(c) { if (NET) { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify({ t: 'in', c })); } else if (GAME) G.input(GAME, ME, c); }

// ---- playing together: a room on the server; this game only shows what the server says and sends taps --------
const API = 'https://neighbor.basirxujamuradov.workers.dev', BOT = 'annoyNeighborBot';
const TG = window.Telegram && Telegram.WebApp && Telegram.WebApp.initData ? Telegram.WebApp : null;
const zt = () => window.ZT || {}, initStr = () => zt().init || (TG ? TG.initData : '');
let NET = null;
function netJoin(room) {
  netLeave(); GAME = null; const N = NET = { room, ws: null, view: null, ph: 'lobby', players: [], tries: 0, link: 'https://t.me/' + BOT + '?startapp=r_' + room }; SEEN = 0; PART.length = 0; show('lobby'); $('lWho').textContent = 'Подключаюсь…'; $('lList').innerHTML = '';
  const open = () => { if (NET !== N) return; const ws = N.ws = new WebSocket((zt().ws || API.replace('https:', 'wss:')) + '/ws?room=' + room + '&init=' + encodeURIComponent(initStr()));
    ws.onopen = () => { N.tries = 0; }; ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } netMsg(N, m); };
    ws.onclose = (e) => { if (NET !== N) return; if (e.code === 4000) { toast('Ты зашёл в эту комнату с другого устройства', 3000); netLeave(); show('home'); return; } if (++N.tries > 4) { toast('Нет связи с комнатой', 3000); netLeave(); show('home'); return; } $('lWho').textContent = 'Связь пропала, переподключаюсь…'; setTimeout(open, 800*N.tries); }; };
  open(); N.ping = setInterval(() => { if (N.ws && N.ws.readyState === 1) N.ws.send('{"t":"ping"}'); }, 20000);
}
function netMsg(N, m) {
  if (m.t === 'hello') { N.me = m.me; ME = m.me; }
  else if (m.t === 'lobby') { N.ph = m.ph; N.players = m.players; $('lList').innerHTML = m.players.map((p) => '<span>' + (p.id === N.me ? '⭐ ' : '') + p.name.replace(/[<>&]/g, '') + '</span>').join('');
    $('lWho').textContent = m.players.length < 2 ? 'Пока ты один. Позови друзей — или начинай, они смогут зайти и во время игры.' : 'В комнате ' + m.players.length + ' из 4. Начать может любой.';
    if (m.ph === 'play' && !$('lobby').classList.contains('hidden')) { show(null); toast('Поехали! Сосед пошёл варить суп', 2500); }
    if (m.ph === 'lobby' && $('over').classList.contains('hidden')) show('lobby'); }
  else if (m.t === 's') { if (N.view && m.s.k < SEEN) SEEN = 0; N.view = m.s; if (m.s.ph === 'play' && !$('lobby').classList.contains('hidden')) show(null); }
}
function netLeave() { if (!NET) return; const N = NET; NET = null; clearInterval(N.ping); try { N.ws && N.ws.close(); } catch (e) {} ME = 'me'; DISP.clear(); }
async function netNew() { if (!initStr()) { toast('Игра с друзьями — в Telegram: @' + BOT, 3000); return; } try { const r = await (await fetch((zt().api || API) + '/new', { method: 'POST', body: JSON.stringify({ init: initStr() }) })).json(); if (r.ok) netJoin(r.id); else toast('Не получилось создать комнату', 2500); } catch (e) { toast('Нет связи с сервером', 2500); } }
function netInvite() { if (!NET) return; const url = 'https://t.me/share/url?url=' + encodeURIComponent(NET.link) + '&text=' + encodeURIComponent('Пошли пакостить соседу! Заходи в мою комнату 🏠'); if (TG && TG.openTelegramLink) TG.openTelegramLink(url); else { try { navigator.clipboard.writeText(NET.link); toast('Ссылка скопирована'); } catch (e) { toast(NET.link, 4000); } } }
// what the server says comes twenty times a second; in between, bodies glide to where they were last said to be
const DISP = new Map();
function smooth(v, dt) {
  const k = Math.min(1, dt*14), go = (id, a) => { const d = DISP.get(id); if (!d || Math.hypot(a[0] - d[0], a[1] - d[1]) > 160) { DISP.set(id, [a[0], a[1]]); return a; } d[0] += (a[0] - d[0])*k; d[1] += (a[1] - d[1])*k; const b = a.slice(); b[0] = d[0]; b[1] = d[1]; return b; };
  return Object.assign({}, v, { n: go('n', v.n), ps: v.ps.map((p) => go(p[4], p)) });
}
function startSolo() { GAME = G.newGame(); G.addPlayer(GAME, ME, 'Ты'); SEEN = 0; PART.length = 0; show(null); toast('Сосед пошёл варить суп. Возьми что-нибудь и действуй!', 3000); }
function show(id) { for (const s of ['home', 'help', 'over', 'lobby']) $(s).classList.toggle('hidden', s !== id); }
function showOver(e) { const n = e.done; $('ores').textContent = n === 9 ? 'Сосед повержен!' : 'Время вышло'; $('ostars').textContent = n >= 9 ? '⭐⭐⭐' : n >= 6 ? '⭐⭐☆' : n >= 3 ? '⭐☆☆' : '☆☆☆'; $('oline').textContent = 'Пакостей: ' + n + ' из 9 · очков: ' + e.score; show('over'); }
$('goSolo').onclick = () => { audioOn(); netLeave(); startSolo(); }; $('again').onclick = () => { if (NET && NET.ws) { NET.ws.send('{"t":"start"}'); show('lobby'); } else startSolo(); }; $('toHome').onclick = () => { netLeave(); GAME = null; show('home'); };
$('lStart').onclick = () => { audioOn(); if (NET && NET.ws && NET.ws.readyState === 1) NET.ws.send('{"t":"start"}'); }; $('lInvite').onclick = netInvite; $('lLeave').onclick = () => { netLeave(); show('home'); };
$('goHelp').onclick = () => show('help'); $('helpOk').onclick = () => show(GAME ? null : 'home'); $('goNet').onclick = () => { audioOn(); netNew(); };

const IDLE = G.newGame(); let lastT = 0, acc = 0, SHF = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastT)/1000 || 0); lastT = ts; const now = ts/1000;
  SHF = (SHF + 1) % 2; sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = Q === 2 || SHF === 0;
  if (NET && NET.view) { VIEW = smooth(NET.view, dt); frameDraw(VIEW, dt, now); hud(VIEW); events(NET.view); }
  else { const S = GAME || IDLE; acc += dt; let n = 0; while (acc >= 1/60 && n++ < 6) { G.step(S, 1/60); acc -= 1/60; } if (S === IDLE && S.ph !== 'play') Object.assign(IDLE, G.newGame());
    VIEW = G.snap(S); frameDraw(VIEW, dt, now); if (GAME) { hud(VIEW); events(VIEW); } }
  if (dt > 0) watchSpeed(dt);
  requestAnimationFrame(loop);
}

// ---- start: the mannequin and its animations, then the game -------------------------
(async () => {
  let got = [0, 0]; const prog = (i) => (e) => { if (e.total) { got[i] = e.loaded/e.total; setLoad(0.5 + 0.45*(got[0] + got[1])/2); } };
  const [b, a] = await Promise.all([loader.loadAsync('./models/boss.json', prog(0)), loader.loadAsync('./models/aj.json', prog(1))]); BODY.boss = b; BODY.aj = a;
  setLoad(1); placeCamera(0, 0); $('load').style.display = 'none'; requestAnimationFrame(loop);
  // opened from a room's button in a chat: straight into that room
  if (TG) { try { TG.ready(); TG.expand(); if (TG.disableVerticalSwipes) TG.disableVerticalSwipes(); } catch (e) {} }
  const sp = zt().start || (TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param) || '', rm = /^r_([a-z0-9]{6,12})$/.exec(sp); if (rm && initStr()) netJoin(rm[1]);
})().catch((e) => { $('load').innerHTML = '<div>Не удалось загрузить: ' + e.message + '</div>'; });
window.__G = G; window.__net = () => NET; window.__netJoin = netJoin; window.__Q = () => Q; window.__setQ = setQuality; window.__SLEEP = SLEEP; window.__S = () => GAME; window.__start = startSolo; window.__view = () => VIEW; window.__R = R; window.__scene = scene; window.__cam = camera;
