// The house in three dimensions, cut open at the front like a doll's house. Built once from boxes, cylinders and
// the surfaces of tex.js; everything that does not move is merged by material so the whole house costs few draw calls.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './tex.js';
import * as G from './sim.js';

export const X = (x) => (x - 756)/100;     // the game's units are centimetres along the house; the middle of the house is 0
export const F = [0, 2.4];                  // floor levels in metres
export const ZW = -3.0, ZP = -1.0, ZS = -2.45; // the back wall, where people walk, where they climb the stairs
const CEIL = 2.22;

export function build(scene) {
  const M = {
    oak: T.floorWood('#a87a4c'), oakDark: T.floorWood('#7a5232', 512), plaster: T.plaster('#efe9df'), white: T.plaster('#f6f4f0'),
    brick: T.brick(), roof: T.roofTiles(), grass: T.grass(), paving: T.paving(), soil: T.soil(),
    hall: T.wallpaper('stripe', '#e2d2b4', '#d6c29c'), kitchen: T.plaster('#efe2b8'), kTile: T.tiles('#f4f6f8', 16, '#b8bcc0', true), kTileBlue: T.tiles('#5d8fc8', 8, '#e8eef2', true),
    living: T.wallpaper('damask', '#9dbb98', '#8aab86'), bath: T.tiles('#bfe4e6', 14, '#f0f4f4', true), bed: T.wallpaper('floral', '#d4c4e2', '#b49ad0'), study: T.wallpaper('pinstripe', '#2e5a5e', '#5a7a6a'),
    panel: T.woodGrain('#6a4428'), walnut: T.woodGrain('#5a3a22'), pine: T.woodGrain('#c49a66'), cream: T.woodPainted('#ebe2cf'), sage: T.woodPainted('#8fa888'),
    sofa: T.fabric('#8a2e2e', 6), duvet: T.fabric('#4a6ec0', 5), linen: T.fabric('#f2efe8', 6), rugRed: T.fabric('#9a3a32', 3), rugBlue: T.fabric('#3a4a8a', 3), rugTan: T.fabric('#a88a5a', 3), curtain: T.fabric('#5a3e8a', 3), curtainRed: T.fabric('#c84a3a', 3), curtainBlue: T.fabric('#4a78c0', 3), coat: T.fabric('#3a5a8a', 3), coat2: T.fabric('#8a3a2e', 3), coat3: T.fabric('#3e6a42', 3),
    steel: new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 1, roughness: 0.28 }), chrome: new THREE.MeshStandardMaterial({ color: '#e8eaee', metalness: 1, roughness: 0.08 }),
    black: new THREE.MeshStandardMaterial({ color: '#161618', roughness: 0.25, metalness: 0.2 }), blackMatte: new THREE.MeshStandardMaterial({ color: '#202022', roughness: 0.7 }),
    enamel: new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.15 }), stone: new THREE.MeshStandardMaterial({ color: '#4a4a50', roughness: 0.35, metalness: 0.1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#dff0f4', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.22, metalness: 0 }),
    bulb: new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffe8b0', emissiveIntensity: 2.2 }), shade: new THREE.MeshStandardMaterial({ color: '#efe2c4', roughness: 0.8, emissive: '#7a5a20', emissiveIntensity: 0.35, side: THREE.DoubleSide }),
    leaf: new THREE.MeshStandardMaterial({ color: '#3f7a34', roughness: 0.8 }), leaf2: new THREE.MeshStandardMaterial({ color: '#58943f', roughness: 0.8 }), bark: T.woodGrain('#5a3e2a'), pot: new THREE.MeshStandardMaterial({ color: '#b25a3a', roughness: 0.85 }),
    fence: T.woodPainted('#ece4d2'), shed: T.woodGrain('#8a5e3a'), door: T.woodGrain('#7a4024'), frame: T.woodPainted('#f2efe8'),
    paper: new THREE.MeshStandardMaterial({ color: '#f2eee2', roughness: 0.9 }), rubber: new THREE.MeshStandardMaterial({ color: '#2f7a46', roughness: 0.6 }),
    view: new THREE.MeshBasicMaterial({ map: T.viewOutside() }),
  };
  const batches = new Map(), group = new THREE.Group(); scene.add(group);
  const tmp = new THREE.Object3D();
  // one piece of the house: its shape in place, kept until the end and merged with others of the same surface
  function put(geo, mat, x, y, z, ry, rx, rz, cast) { tmp.position.set(x, y, z); tmp.rotation.set(rx || 0, ry || 0, rz || 0); tmp.scale.set(1, 1, 1); tmp.updateMatrix(); let g = geo.clone(); g.applyMatrix4(tmp.matrix); if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const key = mat.uuid + (cast === false ? 'n' : 'c'); if (!batches.has(key)) batches.set(key, { mat, list: [], cast: cast !== false }); batches.get(key).list.push(g); }
  const uvScale = (g, su, sv) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i)*su, uv.getY(i)*sv); return g; };
  // a box from corner to corner, its surface pattern sized to the real metres
  function box(mat, x0, y0, z0, x1, y1, z1, o) { o = o || {}; const w = x1 - x0, h = y1 - y0, d = z1 - z0; let g = o.r ? new RoundedBoxGeometry(w, h, d, 3, Math.min(o.r, w/2, h/2, d/2)) : new THREE.BoxGeometry(w, h, d); if (o.tile !== 0) uvScale(g, (o.tile || 1)*Math.max(w, d), (o.tile || 1)*h); put(g, mat, (x0 + x1)/2, (y0 + y1)/2, (z0 + z1)/2, o.ry, o.rx, o.rz, o.cast); }
  function cyl(mat, x, y0, z, r0, r1, h, o) { o = o || {}; const g = new THREE.CylinderGeometry(r0, r1, h, o.seg || 20); put(g, mat, x, y0 + h/2, z, o.ry || 0, o.rx || 0, o.rz || 0, o.cast); }
  function wallPlane(mat, x0, x1, y0, y1, z, tile) { const g = uvScale(new THREE.PlaneGeometry(x1 - x0, y1 - y0), (x1 - x0)/(tile || 1), (y1 - y0)/(tile || 1)); put(g, mat, (x0 + x1)/2, (y0 + y1)/2, z, 0, 0, 0, false); }
  const xs = (a) => X(a);

  // ---- ground: street pavement, lawn, soil in section at the front
  box(M.paving, -10, -0.06, -6, xs(222), 0, 1.2); box(M.grass, xs(1290), -0.06, -6, 12, 0, 1.2); box(M.grass, -10, -0.06, -14, 12, -0.01, -6);
  box(M.soil, -10, -1.2, -6, 12, -0.06, 1.2); box(M.stone, xs(208), -0.06, ZW - 0.2, xs(1304), 0.02, 0.24, { tile: 1.5 });
  const road = new THREE.MeshStandardMaterial({ color: '#3a3a3e', roughness: 0.9 }); box(road, -10, -0.07, -14, xs(222) - 0.6, -0.005, -6, { tile: 0 });

  // ---- slabs between the storeys, with holes for the stairs
  function slab(y, th, mat, holes) {
    const xa = xs(208), xb = xs(1304); let cuts = [xa]; for (const h of holes) cuts.push(h[0], h[1]); cuts.push(xb);
    for (let i = 0; i < cuts.length - 1; i++) { const hole = i % 2 === 1; if (hole) box(mat, cuts[i], y - th, -1.85, cuts[i + 1], y, 0.24); else box(mat, cuts[i], y - th, ZW - 0.15, cuts[i + 1], y, 0.24); }
  }
  const stH = G.STAIRS.map((s) => [xs(s.b) + 0.15, xs(s.t)]);
  slab(F[0] + 0.04, 0.04, M.oak, []); slab(F[1], 0.18, M.oak, stH); box(M.white, xs(208), F[1] - 0.2, ZW, xs(1304), F[1] - 0.17, 0.2); slab(4.8, 0.18, M.oakDark, []); box(M.white, xs(208), 4.6, ZW, xs(1304), 4.63, 0.2);
  // a dark edge on the cut faces at the front, as on a drawing of a section
  const cut = new THREE.MeshStandardMaterial({ color: '#3a2a22', roughness: 0.9 }); for (const y of [F[1] - 0.18, 4.62]) box(cut, xs(208), y, 0.2, xs(1304), y + 0.18, 0.25, { tile: 0 });

  // ---- the rooms' back walls, skirting and cornice
  const WALL = { hall: M.hall, kitchen: M.kitchen, living: M.living, bath: M.bath, bed: M.bed, study: M.study };
  for (const r of G.ROOMS) { if (r.out) continue; const y0 = F[r.fl], y1 = y0 + CEIL, x0 = xs(r.x0), x1 = xs(r.x1);
    wallPlane(WALL[r.id], x0, x1, y0, y1, ZW, r.id === 'bath' ? 1.2 : 1);
    if (r.id === 'kitchen') { wallPlane(M.kTileBlue, x0, x1, y0, y0 + 0.9, ZW + 0.005, 1.1); }
    if (r.id === 'living' || r.id === 'hall' || r.id === 'study') { box(M.panel, x0, y0, ZW, x1, y0 + (r.id === 'study' ? 0.95 : 0.8), ZW + 0.03, { tile: 1.5 }); box(M.panel, x0, y0 + (r.id === 'study' ? 0.95 : 0.8), ZW, x1, y0 + (r.id === 'study' ? 1.0 : 0.85), ZW + 0.05); }
    box(M.cream, x0, y0, ZW, x1, y0 + 0.1, ZW + 0.025); box(M.white, x0, y1 - 0.08, ZW, x1, y1, ZW + 0.06); }
  // inner walls between rooms: closed at the back, a doorway where people walk, a little stub at the front
  for (const [x, fl] of [[490, 0], [880, 0], [560, 1], [960, 1]]) { const y0 = F[fl], X0 = xs(x) - 0.06, X1 = xs(x) + 0.06;
    box(M.white, X0, y0, ZW, X1, y0 + CEIL, -1.75); box(M.white, X0, y0 + 2.02, -1.75, X1, y0 + CEIL, -0.2); box(M.white, X0, y0, -0.2, X1, y0 + CEIL, 0.18);
    box(M.frame, X0 - 0.03, y0, -1.79, X1 + 0.03, y0 + 2.04, -1.72); box(M.frame, X0 - 0.03, y0, -0.24, X1 + 0.03, y0 + 2.04, -0.17); box(M.frame, X0 - 0.03, y0 + 1.98, -1.79, X1 + 0.03, y0 + 2.06, -0.17); }
  // outer walls: brick, a door to the street and one to the garden on the ground floor
  for (const [x, side] of [[208, -1], [1304, 1]]) { const X0 = xs(x) - 0.08, X1 = xs(x) + 0.08;
    box(M.brick, X0, 0, ZW - 0.15, X1, 4.8, -1.75); box(M.brick, X0, 2.05, -1.75, X1, 4.8, -0.2); box(M.brick, X0, 0, -0.2, X1, 4.8, 0.24); box(M.brick, X0, F[1], -1.75, X1, 4.8, -0.2);
    box(M.frame, X0 - 0.02, 0, -1.79, X1 + 0.02, 2.08, -1.72); box(M.frame, X0 - 0.02, 0, -0.24, X1 + 0.02, 2.08, -0.17); box(M.frame, X0 - 0.02, 2.02, -1.79, X1 + 0.02, 2.09, -0.17);
    // the door leaf stands open outwards
    const dx = xs(x) + side*0.08, door = new THREE.BoxGeometry(0.05, 2.0, 0.9); uvScale(door, 1, 2); put(door, M.door, dx + side*0.4, 1.0, -1.75 + 0.07, side*1.15, 0, 0); const knob = new THREE.SphereGeometry(0.035, 12, 8); put(knob, M.chrome, dx + side*0.62, 1.0, -1.25, 0, 0, 0); }
  box(M.brick, xs(208), 0, ZW - 0.15, xs(1304), 4.8, ZW - 0.02);
  box(M.paving, xs(130), 0, -1.9, xs(208) - 0.08, 0.04, -0.1, { tile: 2 });

  // ---- roof, gable, attic
  { const xa = xs(180), xb = xs(1332), xm = xs(756), ya = 4.8, ym = 6.55, len = Math.hypot(xm - xa, ym - ya), ang = Math.atan2(ym - ya, xm - xa);
    for (const s of [-1, 1]) { const g = uvScale(new THREE.BoxGeometry(len, 0.14, 3.7), len*0.9, 3.7*0.9); put(g, M.roof, s < 0 ? (xa + xm)/2 : (xm + xb)/2, (ya + ym)/2 + 0.07, -1.35, 0, 0, s*-ang); }
    const tri = new THREE.Shape(); tri.moveTo(xa + 0.4, ya); tri.lineTo(xm, ym - 0.12); tri.lineTo(xb - 0.4, ya); tri.closePath(); const gg = new THREE.ShapeGeometry(tri); uvScale(gg, 0.9, 0.9); put(gg, M.brick, 0, 0, ZW - 0.02, 0, 0, 0, false);
    const ridge = new THREE.CylinderGeometry(0.09, 0.09, 3.8, 10); put(ridge, M.roof, xm, ym + 0.1, -1.35, 0, Math.PI/2, 0);
    for (let x = -4.2; x <= 4.3; x += 1.05) { const yt = ym - Math.abs(x - xm)*(ym - ya)/(xm - xa) - 0.15; if (yt > ya + 0.25) box(M.oakDark, x - 0.05, ya, -2.8, x + 0.05, yt, -2.65); }
    box(M.oakDark, -3.2, 5.6, -2.85, 3.2, 5.7, -2.7);
    for (const [x, w, h, z] of [[-3.3, 0.6, 0.45, -2.2], [-2.6, 0.45, 0.35, -2.4], [2.4, 0.7, 0.5, -2.3], [3.2, 0.4, 0.7, -2.5]]) box(M.pine, x, 4.8, z - 0.25, x + w, 4.8 + h, z + 0.25, { r: 0.02 });
    const rw = new THREE.CircleGeometry(0.28, 28); put(rw, M.view, xm, 5.7, ZW - 0.0, 0, 0, 0, false); const rr = new THREE.TorusGeometry(0.3, 0.04, 8, 32); put(rr, M.frame, xm, 5.7, ZW + 0.02, 0, 0, 0);
    // chimney
    box(M.brick, xs(1040), 5.4, -2.2, xs(1076), 6.9, -1.6); box(M.stone, xs(1034), 6.9, -2.26, xs(1082), 7.0, -1.54); }

  // ---- windows on the back walls: a frame, the view outside, glass, a sill, curtains
  function win(x0, x1, y0, y1, cur) { const a = xs(x0), b = xs(x1), z = ZW + 0.01; wallPlane(M.view, a, b, y0, y1, z, 1e9);
    const t = 0.05; box(M.frame, a - t, y0 - t, z, b + t, y0, z + 0.06); box(M.frame, a - t, y1, z, b + t, y1 + t, z + 0.06); box(M.frame, a - t, y0, z, a, y1, z + 0.06); box(M.frame, b, y0, z, b + t, y1, z + 0.06); box(M.frame, (a + b)/2 - 0.02, y0, z, (a + b)/2 + 0.02, y1, z + 0.05); box(M.frame, a, (y0 + y1)/2 - 0.02, z, b, (y0 + y1)/2 + 0.02, z + 0.05);
    box(M.frame, a - 0.1, y0 - 0.08, z, b + 0.1, y0 - 0.04, z + 0.18);
    const gl = new THREE.PlaneGeometry(b - a, y1 - y0); put(gl, M.glass, (a + b)/2, (y0 + y1)/2, z + 0.03, 0, 0, 0, false);
    if (cur) { for (const s of [-1, 1]) { const cx0 = s < 0 ? a - 0.22 : b + 0.22, g = new THREE.PlaneGeometry(0.42, y1 - y0 + 0.45, 18, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i)*28)*0.035 + 0.06); g.computeVertexNormals(); uvScale(g, 0.8, 2); put(g, cur, cx0, (y0 + y1)/2 - 0.1, z + 0.06, 0, 0, 0, false); }
      box(M.walnut, a - 0.5, y1 + 0.12, z + 0.04, b + 0.5, y1 + 0.15, z + 0.1); } }
  win(700, 770, 1.15, 1.75, M.curtainRed); win(892, 948, 1.1, 1.8, M.curtain); win(388, 424, 3.55, 3.95, null); win(764, 828, 3.55, 4.15, M.curtainBlue); win(1098, 1162, 3.6, 4.15, M.curtain);

  // ---- lamps: shade and bulb, and the light itself
  const lights = [];
  function lamp(x, fl, drop, warm) { const y = F[fl] + CEIL; cyl(M.blackMatte, xs(x), y - drop, -1.6, 0.006, 0.006, drop, { cast: false }); const sh = new THREE.CylinderGeometry(0.1, 0.24, 0.2, 24, 1, true); put(sh, M.shade, xs(x), y - drop - 0.08, -1.6, 0, 0, 0, false); const bl = new THREE.SphereGeometry(0.05, 12, 8); put(bl, M.bulb, xs(x), y - drop - 0.12, -1.6, 0, 0, 0, false);
    // no light of its own: seven lamps would make every pixel of the house count seven lights. A soft glow is enough by day
    lights.push({ x: xs(x), y: y - drop - 0.12, z: -1.6, col: warm || '#ffcf8a' }); }
  lamp(380, 0, 0.45); lamp(690, 0, 0.5); lamp(1080, 0, 0.55); lamp(470, 1, 0.3, '#f4f6ff'); lamp(760, 1, 0.4); lamp(1020, 1, 0.35);

  // ---- hall: cabinet, coat stand with coats, rug, mirror
  box(M.walnut, xs(226), 0, ZW, xs(272), 0.82, ZW + 0.42, { r: 0.015 }); box(M.pine, xs(224), 0.82, ZW, xs(274), 0.85, ZW + 0.44);
  cyl(M.walnut, xs(298), 0, -2.6, 0.022, 0.022, 1.85); cyl(M.walnut, xs(298), 0, -2.6, 0.2, 0.22, 0.04); for (let i = 0; i < 4; i++) cyl(M.walnut, xs(298) + Math.cos(i*1.57)*0.08, 1.72, -2.6 + Math.sin(i*1.57)*0.08, 0.012, 0.012, 0.16, { rz: Math.cos(i*1.57)*0.6, rx: Math.sin(i*1.57)*0.6 });
  for (const [dx, dz, m, h] of [[-0.12, 0.04, M.coat, 0.95], [0.1, -0.05, M.coat2, 0.85], [0.0, 0.1, M.coat3, 1.0]]) { const g = new THREE.CylinderGeometry(0.1, 0.24, h, 16, 1); uvScale(g, 1, 1); put(g, m, xs(298) + dx, 1.72 - h/2, -2.6 + dz, 0, 0, 0); }
  const hat = new THREE.CylinderGeometry(0.11, 0.12, 0.1, 18); put(hat, M.blackMatte, xs(298), 1.9, -2.6, 0, 0, 0); cyl(M.blackMatte, xs(298), 1.84, -2.6, 0.19, 0.19, 0.015);
  box(M.rugRed, xs(232), 0.02, -1.9, xs(340), 0.03, -0.4, { tile: 2 }); box(M.frame, xs(408), 1.25, ZW, xs(452), 1.8, ZW + 0.03); { const mg = new THREE.PlaneGeometry(xs(448) - xs(412), 0.47); put(mg, M.chrome, (xs(408) + xs(452))/2, 1.525, ZW + 0.035, 0, 0, 0, false); }

  // ---- kitchen
  // base units with a stone top, doors with handles
  box(M.cream, xs(588), 0, ZW, xs(740), 0.86, ZW + 0.6, { r: 0.01 }); box(M.stone, xs(586), 0.86, ZW, xs(742), 0.9, ZW + 0.63);
  for (let x = 680; x < 738; x += 29) { box(M.cream, xs(x) + 0.01, 0.1, ZW + 0.6, xs(x + 28) - 0.01, 0.8, ZW + 0.62); box(M.chrome, xs(x + 13), 0.6, ZW + 0.62, xs(x + 15), 0.75, ZW + 0.645); }
  // the cooker: enamel body, black glass top with rings, an oven window, knobs
  box(M.enamel, xs(600), 0, ZW + 0.01, xs(672), 0.9, ZW + 0.62, { r: 0.012 }); box(M.black, xs(601), 0.9, ZW + 0.02, xs(671), 0.92, ZW + 0.61); box(M.black, xs(606), 0.2, ZW + 0.62, xs(666), 0.62, ZW + 0.63);
  box(M.chrome, xs(608), 0.68, ZW + 0.62, xs(664), 0.7, ZW + 0.66); for (let i = 0; i < 4; i++) { cyl(M.blackMatte, xs(610 + i*16), 0.79, ZW + 0.64, 0.018, 0.018, 0.04, { rx: Math.PI/2 }); }
  for (const [dx, dz] of [[-0.17, 0.15], [0.17, 0.15], [-0.17, 0.45], [0.17, 0.45]]) { const ring = new THREE.TorusGeometry(0.075, 0.006, 6, 24); put(ring, M.steel, xs(636) + dx, 0.925, ZW + dz, 0, -Math.PI/2, 0, false); }
  // the pot on the cooker and the hood above
  cyl(M.steel, xs(625), 0.92, ZW + 0.42, 0.12, 0.11, 0.17, { seg: 24 }); cyl(M.chrome, xs(625), 1.09, ZW + 0.42, 0.125, 0.125, 0.012, { seg: 24 }); cyl(M.blackMatte, xs(625), 1.1, ZW + 0.42, 0.02, 0.02, 0.03);
  box(M.steel, xs(598), 1.55, ZW, xs(674), 1.75, ZW + 0.5); box(M.steel, xs(625), 1.75, ZW, xs(648), 2.22, ZW + 0.25);
  // sink and tap
  box(M.chrome, xs(694), 0.9, ZW + 0.12, xs(734), 0.905, ZW + 0.5); cyl(M.chrome, xs(714), 0.9, ZW + 0.08, 0.015, 0.015, 0.3); cyl(M.chrome, xs(714), 1.18, ZW + 0.16, 0.012, 0.012, 0.16, { rx: Math.PI/2 });
  // wall units, a shelf with jars
  box(M.cream, xs(500), 1.55, ZW, xs(590), 2.1, ZW + 0.35, { r: 0.01 }); box(M.chrome, xs(544), 1.6, ZW + 0.35, xs(546), 1.75, ZW + 0.37);
  box(M.pine, xs(498), 1.2, ZW, xs(572), 1.23, ZW + 0.25); for (const [x, c, h] of [[506, '#e8c060', 0.16], [522, '#c84a3a', 0.12], [558, '#9ad06a', 0.14]]) { const jm = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.2, clearcoat: 1 }); cyl(jm, xs(x), 1.23, ZW + 0.12, 0.04, 0.04, h); cyl(M.steel, xs(x), 1.23 + h, ZW + 0.12, 0.042, 0.042, 0.02); }
  // the table and a chair at its far end; his own chair is in the game, since it may end up stuck to him
  box(M.pine, xs(738), 0.74, -2.35, xs(804), 0.78, -1.75, { r: 0.008 }); for (const [x, z] of [[742, -2.3], [800, -2.3], [742, -1.8], [800, -1.8]]) box(M.pine, xs(x) - 0.025, 0, z - 0.025, xs(x) + 0.025, 0.74, z + 0.025);
  const plate = new THREE.CylinderGeometry(0.11, 0.08, 0.02, 24); put(plate, M.enamel, xs(792), 0.79, -2.05, 0, 0, 0);
  function chair(x, z, face, m) { box(m, xs(x) - 0.2, 0.44, z - 0.2, xs(x) + 0.2, 0.48, z + 0.2, { r: 0.01 }); for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) box(m, xs(x) + dx - 0.02, 0, z + dz - 0.02, xs(x) + dx + 0.02, 0.44, z + dz + 0.02); box(m, xs(x) + face*0.18 - 0.02, 0.48, z - 0.19, xs(x) + face*0.18 + 0.02, 0.95, z + 0.19); box(m, xs(x) + face*0.18 - 0.025, 0.8, z - 0.2, xs(x) + face*0.18 + 0.025, 0.93, z + 0.2); }
  chair(724, -2.05, -1, M.pine);
  // the fridge
  box(M.enamel, xs(836), 0, ZW + 0.02, xs(880), 1.85, ZW + 0.66, { r: 0.03 }); box(M.chrome, xs(870), 1.05, ZW + 0.66, xs(872), 1.45, ZW + 0.7); box(M.chrome, xs(870), 0.45, ZW + 0.66, xs(872), 0.8, ZW + 0.7); box(M.blackMatte, xs(837), 0.92, ZW + 0.66, xs(879), 0.93, ZW + 0.665);

  // ---- living room
  box(M.rugRed, xs(920), 0.02, -2.6, xs(1130), 0.03, -0.6, { tile: 1.5 });
  // small table with a sewing box
  cyl(M.walnut, xs(905), 0, -2.6, 0.03, 0.03, 0.58); cyl(M.walnut, xs(905), 0.58, -2.6, 0.22, 0.22, 0.03, { seg: 28 }); cyl(M.walnut, xs(905), 0, -2.6, 0.14, 0.14, 0.02);
  // painting over the sofa
  box(M.walnut, xs(962), 1.25, ZW, xs(1034), 1.75, ZW + 0.04); { const [c, x] = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 180; return [c, c.getContext('2d')]; })(); let g = x.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#e8b070'); g.addColorStop(1, '#f6dca0'); x.fillStyle = g; x.fillRect(0, 0, 256, 180); x.fillStyle = '#6a7a4a'; x.beginPath(); x.moveTo(0, 180); x.lineTo(70, 90); x.lineTo(130, 140); x.lineTo(190, 70); x.lineTo(256, 180); x.fill(); x.fillStyle = '#4a5a3a'; x.fillRect(0, 150, 256, 30); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const pm = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); const pg = new THREE.PlaneGeometry(xs(1028) - xs(968), 0.44); put(pg, pm, (xs(962) + xs(1034))/2, 1.5, ZW + 0.045, 0, 0, 0, false); }
  // floor lamp
  cyl(M.chrome, xs(1066), 0, -2.6, 0.15, 0.15, 0.025); cyl(M.chrome, xs(1066), 0, -2.6, 0.012, 0.012, 1.5); { const sh = new THREE.CylinderGeometry(0.14, 0.2, 0.26, 24, 1, true); put(sh, M.shade, xs(1066), 1.55, -2.6, 0, 0, 0, false); }
  // the television on a low cabinet
  box(M.walnut, xs(1074), 0, -2.75, xs(1142), 0.5, -2.3, { r: 0.01 }); box(M.black, xs(1078), 0.5, -2.62, xs(1138), 0.52, -2.45); cyl(M.black, xs(1108), 0.52, -2.53, 0.015, 0.015, 0.08);
  box(M.black, xs(1066), 0.6, -2.56, xs(1150), 1.1, -2.52, { r: 0.008 });
  // the curtain by the garden door
  { const g = new THREE.PlaneGeometry(0.46, 2.15, 22, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i)*30)*0.05); g.computeVertexNormals(); uvScale(g, 1, 3); put(g, M.curtain, xs(1262), 1.08, -1.95, Math.PI/2, 0, 0); box(M.walnut, xs(1258), 2.15, -2.4, xs(1266), 2.18, -0.9); }
  // a plant in a pot
  plant(xs(1140), 0, -1.95, 1);
  function plant(x, y, z, s) { cyl(M.pot, x, y, z, 0.16*s, 0.12*s, 0.32*s); for (let i = 0; i < 14; i++) { const a = i*2.4, r = 0.06 + (i % 4)*0.05, h = 0.35 + (i % 5)*0.09, lg = new THREE.SphereGeometry(0.09*s, 8, 6); lg.scale(1, 0.35, 2.2); put(lg, i % 2 ? M.leaf : M.leaf2, x + Math.cos(a)*r*s, y + (0.32 + h)*s, z + Math.sin(a)*r*s, -a, 0.9 - (i % 3)*0.3, 0); } }

  // ---- bathroom
  // shower: a tray, glass walls, a head on its rail
  box(M.enamel, xs(224), F[1], ZW + 0.02, xs(304), F[1] + 0.06, -1.9, { r: 0.01 }); { const gl = new THREE.BoxGeometry(0.01, 1.95, 1.1); put(gl, M.glass, xs(304), F[1] + 1.03, -2.45, 0, 0, 0, false); box(M.chrome, xs(303), F[1] + 0.06, -1.92, xs(305), F[1] + 2.0, -1.9); }
  cyl(M.chrome, xs(262), F[1] + 1.0, ZW + 0.04, 0.012, 0.012, 1.05); box(M.chrome, xs(262) - 0.01, F[1] + 2.03, ZW + 0.02, xs(262) + 0.01, F[1] + 2.05, ZW + 0.3); cyl(M.chrome, xs(262), F[1] + 1.95, ZW + 0.3, 0.09, 0.07, 0.04);
  // washbasin on a pedestal, the mirror, a cup with brushes
  cyl(M.enamel, xs(343), F[1], ZW + 0.25, 0.08, 0.11, 0.75); { const bg = new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI*2, Math.PI/2, Math.PI/2); bg.scale(1, 0.5, 0.75); put(bg, M.enamel, xs(343), F[1] + 0.86, ZW + 0.28, 0, 0, 0); box(M.enamel, xs(316), F[1] + 0.84, ZW, xs(370), F[1] + 0.88, ZW + 0.5, { r: 0.02 }); }
  cyl(M.chrome, xs(343), F[1] + 0.88, ZW + 0.06, 0.012, 0.012, 0.18); box(M.frame, xs(318), F[1] + 1.25, ZW, xs(368), F[1] + 1.9, ZW + 0.03); { const mg = new THREE.PlaneGeometry(xs(364) - xs(322), 0.6); put(mg, M.chrome, (xs(318) + xs(368))/2, F[1] + 1.575, ZW + 0.035, 0, 0, 0, false); }
  { const cm = new THREE.MeshPhysicalMaterial({ color: '#4fc6e8', roughness: 0.1, clearcoat: 1 }); cyl(cm, xs(324), F[1] + 0.88, ZW + 0.12, 0.035, 0.03, 0.1); }
  // washing machine, a shelf, a towel on its rail
  box(M.enamel, xs(480), F[1], ZW + 0.02, xs(540), F[1] + 0.85, ZW + 0.62, { r: 0.02 }); { const door = new THREE.TorusGeometry(0.17, 0.03, 10, 30); put(door, M.chrome, xs(510), F[1] + 0.45, ZW + 0.63, 0, 0, 0); const gl = new THREE.CircleGeometry(0.16, 30); put(gl, M.black, xs(510), F[1] + 0.45, ZW + 0.625, 0, 0, 0, false); box(M.blackMatte, xs(484), F[1] + 0.74, ZW + 0.62, xs(530), F[1] + 0.8, ZW + 0.63); }
  box(M.white, xs(508), F[1] + 1.2, ZW, xs(558), F[1] + 1.23, ZW + 0.25); cyl(M.chrome, xs(450), F[1] + 1.35, ZW + 0.1, 0.012, 0.012, 0.44, { rz: Math.PI/2 }); box(T.fabric('#ff9a3c', 3), xs(436), F[1] + 0.95, ZW + 0.06, xs(462), F[1] + 1.37, ZW + 0.13);

  // ---- bedroom
  box(M.rugBlue, xs(700), F[1] + 0.02, -2.0, xs(900), F[1] + 0.03, -0.5, { tile: 1.5 });
  // wardrobe
  box(M.walnut, xs(604), F[1], ZW, xs(676), F[1] + 2.05, ZW + 0.6, { r: 0.012 }); box(M.walnut, xs(600), F[1] + 2.05, ZW, xs(680), F[1] + 2.1, ZW + 0.63); box(M.blackMatte, xs(639.5), F[1] + 0.05, ZW + 0.6, xs(640.5), F[1] + 2.0, ZW + 0.605); for (const x of [634, 646]) box(M.chrome, xs(x), F[1] + 0.95, ZW + 0.6, xs(x) + 0.015, F[1] + 1.15, ZW + 0.63);
  // the bed: frame, headboard at the left, mattress, a duvet, two pillows
  box(M.walnut, xs(678), F[1], ZW + 0.05, xs(690), F[1] + 1.1, -1.2, { r: 0.01 }); box(M.walnut, xs(690), F[1] + 0.12, ZW + 0.05, xs(872), F[1] + 0.38, -1.2, { r: 0.01 }); box(M.walnut, xs(866), F[1], ZW + 0.05, xs(874), F[1] + 0.55, -1.2);
  box(M.linen, xs(690), F[1] + 0.38, ZW + 0.08, xs(866), F[1] + 0.56, -1.23, { r: 0.05 }); box(M.duvet, xs(728), F[1] + 0.5, ZW + 0.06, xs(868), F[1] + 0.66, -1.18, { r: 0.07 });
  for (const z of [-2.55, -1.75]) box(M.linen, xs(692), F[1] + 0.55, z - 0.3, xs(726), F[1] + 0.72, z + 0.3, { r: 0.07 });
  // nightstand with a lamp
  box(M.walnut, xs(882), F[1], ZW + 0.05, xs(928), F[1] + 0.55, ZW + 0.45, { r: 0.01 }); box(M.chrome, xs(900), F[1] + 0.4, ZW + 0.45, xs(910), F[1] + 0.42, ZW + 0.47);
  cyl(M.chrome, xs(912), F[1] + 0.55, ZW + 0.25, 0.06, 0.06, 0.02); cyl(M.chrome, xs(912), F[1] + 0.55, ZW + 0.25, 0.01, 0.01, 0.3); { const sh = new THREE.CylinderGeometry(0.08, 0.12, 0.16, 20, 1, true); put(sh, M.shade, xs(912), F[1] + 0.9, ZW + 0.25, 0, 0, 0, false); }
  box(M.frame, xs(598), F[1] + 1.25, ZW, xs(632), F[1] + 1.65, ZW + 0.03);

  // ---- study
  box(M.rugTan, xs(1030), F[1] + 0.02, -2.4, xs(1170), F[1] + 0.03, -0.8, { tile: 1.5 });
  box(M.walnut, xs(974), F[1] + 1.5, ZW, xs(1034), F[1] + 1.53, ZW + 0.25); for (const [x, h, c] of [[978, 0.24, '#8a2a22'], [986, 0.28, '#2a4a7a'], [1018, 0.2, '#c8a040']]) box(new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }), xs(x), F[1] + 1.53, ZW + 0.03, xs(x + 7), F[1] + 1.53 + h, ZW + 0.21, { tile: 0 });
  // the desk, a typewriter, papers, a green lamp
  box(M.walnut, xs(1048), F[1] + 0.74, ZW + 0.05, xs(1168), F[1] + 0.79, ZW + 0.75, { r: 0.008 }); box(M.walnut, xs(1130), F[1], ZW + 0.05, xs(1166), F[1] + 0.74, ZW + 0.72); box(M.walnut, xs(1050), F[1], ZW + 0.05, xs(1056), F[1] + 0.74, ZW + 0.72);
  box(M.blackMatte, xs(1096), F[1] + 0.79, ZW + 0.3, xs(1126), F[1] + 0.9, ZW + 0.6, { r: 0.02 }); box(M.paper, xs(1102), F[1] + 0.9, ZW + 0.3, xs(1120), F[1] + 1.02, ZW + 0.32, { tile: 0 }); box(M.paper, xs(1060), F[1] + 0.79, ZW + 0.4, xs(1084), F[1] + 0.8, ZW + 0.7, { ry: 0.2, tile: 0 });
  { const gm = new THREE.MeshPhysicalMaterial({ color: '#2f7a46', roughness: 0.15, clearcoat: 1, emissive: '#204a20', emissiveIntensity: 0.4 }); cyl(M.chrome, xs(1144), F[1] + 0.79, ZW + 0.3, 0.06, 0.06, 0.02); cyl(M.chrome, xs(1144), F[1] + 0.79, ZW + 0.3, 0.01, 0.01, 0.3); const sh = new THREE.CylinderGeometry(0.04, 0.12, 0.08, 20, 1, false, 0, Math.PI); put(sh, gm, xs(1144) - 0.05, F[1] + 1.1, ZW + 0.3, 0, 0, Math.PI/2); }
  // office chair
  cyl(M.blackMatte, xs(1086), F[1] + 0.05, -2.0, 0.025, 0.025, 0.4); for (let i = 0; i < 5; i++) box(M.blackMatte, xs(1086) - 0.015, F[1] + 0.04, -2.0 - 0.015, xs(1086) + 0.25, F[1] + 0.07, -2.0 + 0.015, { ry: i*1.256 }); box(M.blackMatte, xs(1086) - 0.22, F[1] + 0.45, -2.22, xs(1086) + 0.22, F[1] + 0.52, -1.78, { r: 0.03 }); box(M.blackMatte, xs(1086) - 0.25, F[1] + 0.52, -2.2, xs(1086) - 0.2, F[1] + 1.05, -1.8, { r: 0.02 });
  // the bookcase, full of books
  box(M.walnut, xs(1164), F[1], ZW + 0.02, xs(1214), F[1] + 2.0, ZW + 0.38); const bookM = ['#8a2a22', '#2a4a7a', '#c8a040', '#3e6a3a', '#5a3a7a', '#a8582a', '#e8e0c8'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 }));
  for (let r = 0; r < 5; r++) { const y = F[1] + 0.06 + r*0.39; box(M.walnut, xs(1166), y - 0.03, ZW + 0.02, xs(1212), y, ZW + 0.38); let x = 1167; let i = 0; while (x < 1210) { const w = 3 + ((r*7 + i*3) % 4), h = 0.22 + ((r + i*5) % 5)*0.025; box(bookM[(r*3 + i) % 7], xs(x), y, ZW + 0.1, xs(Math.min(1211, x + w)), y + h, ZW + 0.34, { tile: 0 }); x += w + 0.4; i++; } }
  box(M.walnut, xs(1220), F[1] + 1.2, ZW, xs(1262), F[1] + 1.23, ZW + 0.25);
  // a globe
  { const gm = new THREE.MeshStandardMaterial({ color: '#4a8ac0', roughness: 0.4 }); const sp = new THREE.SphereGeometry(0.12, 24, 16); put(sp, gm, xs(1040), F[1] + 1.05, ZW + 0.45, 0, 0, 0); }

  // ---- stairs: treads, risers, a stringer, a handrail on posts
  for (const s of G.STAIRS) { const n = 13, x0 = xs(s.b), x1 = xs(s.t), za = ZW + 0.04, zb = -1.88;
    for (let i = 0; i < n; i++) { const u0 = i/n, xa = x0 + (x1 - x0)*u0, xb = x0 + (x1 - x0)*(i + 1)/n, y = F[0] + (F[1] - F[0])*(i + 1)/n; box(M.oak, xa - 0.03, y - 0.04, za, xb + 0.02, y, zb, { tile: 1 }); box(M.cream, xa - 0.01, y - (F[1] - F[0])/n, za, xa + 0.005, y - 0.04, zb); }
    const L = Math.hypot(x1 - x0, F[1] - F[0]), ang = Math.atan2(F[1] - F[0], x1 - x0); for (const z of [zb - 0.03]) { const g = new THREE.BoxGeometry(L + 0.2, 0.25, 0.05); uvScale(g, L, 0.25); put(g, M.walnut, (x0 + x1)/2, (F[0] + F[1])/2 - 0.08, z, 0, 0, ang); }
    const hr = new THREE.CylinderGeometry(0.025, 0.025, L + 0.1, 10); put(hr, M.walnut, (x0 + x1)/2, (F[0] + F[1])/2 + 0.9, zb + 0.03, 0, 0, ang - Math.PI/2);
    for (let i = 0; i <= n; i += 2) { const u = i/n, x = x0 + (x1 - x0)*u, y = F[0] + (F[1] - F[0])*u; cyl(M.cream, x, y, zb + 0.03, 0.013, 0.013, 0.9); }
    box(M.walnut, x0 - 0.05, 0, zb - 0.02, x0 + 0.05, 1.05, zb + 0.08); box(M.walnut, x1 - 0.05, F[1], zb - 0.02, x1 + 0.05, F[1] + 1.05, zb + 0.08); }

  // ---- outside: street lamp, letterbox, bushes, fence, shed, flower bed, hose reel, tree, houses beyond
  cyl(M.blackMatte, xs(30), 0, -0.6, 0.06, 0.09, 3.6); box(M.blackMatte, xs(10), 3.6, -0.75, xs(50), 3.72, -0.45); { const bl = new THREE.BoxGeometry(0.3, 0.06, 0.24); put(bl, M.bulb, xs(30), 3.56, -0.6, 0, 0, 0, false); }
  box(new THREE.MeshStandardMaterial({ color: '#3b6ec0', roughness: 0.4, metalness: 0.3 }), xs(168), 1.0, -0.5, xs(200), 1.28, -0.2, { r: 0.04, tile: 0 }); cyl(M.blackMatte, xs(184), 0, -0.35, 0.03, 0.03, 1.0);
  for (const [x, z, r] of [[100, -2.4, 0.5], [140, -2.7, 0.42], [70, -2.7, 0.36], [1340, -2.6, 0.4]]) { for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(r*(0.6 + (i % 3)*0.15), 1); put(g, i % 2 ? M.leaf : M.leaf2, xs(x) + Math.cos(i*1.1)*r*0.5, r*0.55 + (i % 2)*r*0.25, z + Math.sin(i*1.1)*r*0.35, i, 0, 0); } }
  for (let x = xs(1312); x < 12; x += 0.24) { box(M.fence, x, 0, -3.5, x + 0.13, 1.1, -3.46, { tile: 1 }); } box(M.fence, xs(1312), 0.75, -3.52, 12, 0.82, -3.5); box(M.fence, xs(1312), 0.25, -3.52, 12, 0.32, -3.5);
  for (let x = -10; x < xs(200); x += 0.24) { box(M.fence, x, 0, -3.5, x + 0.13, 1.0, -3.46, { tile: 1 }); } box(M.fence, -10, 0.7, -3.52, xs(200), 0.77, -3.5);
  // shed
  box(M.shed, xs(1430), 0, -3.2, xs(1502), 2.0, -2.2, { tile: 1.5 }); { const g = new THREE.BoxGeometry(0.95, 0.06, 1.3); uvScale(g, 1, 1.3); put(g, M.roof, xs(1446), 2.15, -2.7, 0, 0, 0.45); put(g, M.roof, xs(1486), 2.15, -2.7, 0, 0, -0.45); }
  box(M.blackMatte, xs(1446), 0, -2.21, xs(1488), 1.6, -2.19);
  // flower bed
  box(M.soil, xs(1370), 0, -2.2, xs(1450), 0.12, -1.7, { tile: 1 }); const fl = ['#ff4a5e', '#ffd23f', '#ff8fd0', '#ff7a3a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
  for (let i = 0; i < 14; i++) { const x = xs(1374 + i*5.5), z = -2.1 + (i % 3)*0.15, h = 0.25 + (i % 4)*0.06; cyl(M.leaf, x, 0.1, z, 0.006, 0.006, h, { seg: 5 }); const b = new THREE.SphereGeometry(0.04, 8, 6); b.scale(1, 1.3, 1); put(b, fl[i % 4], x, 0.12 + h, z, 0, 0, 0); }
  // hose reel and the hose
  const rub = M.rubber; { const reel = new THREE.TorusGeometry(0.16, 0.05, 10, 28); put(reel, rub, xs(1352), 0.3, -1.95, 0, 0, 0); cyl(M.blackMatte, xs(1352), 0, -1.95, 0.02, 0.02, 0.3); const path = new THREE.CatmullRomCurve3([new THREE.Vector3(xs(1352), 0.2, -1.9), new THREE.Vector3(xs(1370), 0.04, -1.6), new THREE.Vector3(xs(1395), 0.03, -1.4), new THREE.Vector3(xs(1405), 0.03, -1.7)]); const hg = new THREE.TubeGeometry(path, 30, 0.018, 8); put(hg, rub, 0, 0, 0, 0, 0, 0); }
  // tree
  cyl(M.bark, xs(1470), 0, -4.4, 0.16, 0.22, 2.6, { seg: 12 }); for (let i = 0; i < 9; i++) { const g = new THREE.IcosahedronGeometry(0.75 + (i % 3)*0.18, 1); put(g, i % 2 ? M.leaf : M.leaf2, xs(1470) + Math.cos(i*0.9)*0.8, 3.0 + (i % 3)*0.45, -4.4 + Math.sin(i*0.9)*0.6, i, 0, 0); }
  // houses over the road and along the street
  const far = [new THREE.MeshStandardMaterial({ color: '#d8cbb4', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#c2b29a', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#b8c4cc', roughness: 0.9 })], farRoof = new THREE.MeshStandardMaterial({ color: '#7a3a2e', roughness: 0.8 }), farWin = new THREE.MeshStandardMaterial({ color: '#9ab8cc', roughness: 0.15, metalness: 0.4 });
  for (let i = 0; i < 9; i++) { const x = -16 + i*4.4, w = 3 + (i % 3)*0.6, h = 3.4 + (i % 2)*1.6, z = -16 - (i % 2)*2; box(far[i % 3], x, 0, z - 3, x + w, h, z, { tile: 0 }); const rg = new THREE.ConeGeometry(w*0.72, 1.4, 4); put(rg, farRoof, x + w/2, h + 0.7, z - 1.5, Math.PI/4, 0, 0); for (let k = 0; k < 2; k++) for (let j = 0; j < Math.floor(h/1.6); j++) box(farWin, x + 0.4 + k*(w - 1.2), 0.9 + j*1.5, z, x + 0.9 + k*(w - 1.2), 1.6 + j*1.5, z + 0.03, { tile: 0 }); }

  // ---- merge everything that stays put
  for (const { mat, list, cast } of batches.values()) { const g = mergeGeometries(list, false); if (!g) continue; const m = new THREE.Mesh(g, mat); m.castShadow = cast && !mat.transparent; m.receiveShadow = true; group.add(m); }
  return { group, M, lights, chair };
}
