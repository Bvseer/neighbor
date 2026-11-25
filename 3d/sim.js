// The game itself, without any picture: the house, the neighbour and his day, the players, their things and their pranks.
// The very same file runs in the browser for a game on your own and on the server for a game together.

export const W = 1500;
export const FY = [540, 300];               // where feet stand on the ground floor and upstairs
export const ROUND = 240;                   // seconds in a round
const PSPD = 225, NWALK = 140, NCHASE = 205, STAIR_T = 0.85, CATCH = 30;

export const ROOMS = [
  { id: 'street', fl: 0, x0: 0, x1: 222, name: 'Улица', out: true, safe: true },
  { id: 'hall', fl: 0, x0: 222, x1: 490, name: 'Прихожая' },
  { id: 'kitchen', fl: 0, x0: 490, x1: 880, name: 'Кухня' },
  { id: 'living', fl: 0, x0: 880, x1: 1290, name: 'Гостиная' },
  { id: 'garden', fl: 0, x0: 1290, x1: W, name: 'Сад', out: true },
  { id: 'bath', fl: 1, x0: 222, x1: 560, name: 'Ванная' },
  { id: 'bed', fl: 1, x0: 560, x1: 960, name: 'Спальня' },
  { id: 'study', fl: 1, x0: 960, x1: 1290, name: 'Кабинет' },
];
// a flight of stairs: its foot on the ground floor at b, its head upstairs at t
export const STAIRS = [{ id: 'A', b: 352, t: 468 }, { id: 'B', b: 1150, t: 1266 }];

// his day, round and round: where he goes, how long he stays, which way he looks there and how far he sees doing it
export const ACTS = [
  { id: 'cook', fl: 0, x: 640, dur: 9, face: 1, see: 260, txt: 'варит суп', ico: '🍲' },
  { id: 'eat', fl: 0, x: 818, dur: 7, face: -1, see: 600, txt: 'обедает', ico: '🍽️' },
  { id: 'tv', fl: 0, x: 990, dur: 11, face: 1, see: 170, txt: 'смотрит телевизор', ico: '📺' },
  { id: 'garden', fl: 0, x: 1400, dur: 8, face: 1, see: 380, txt: 'поливает цветы', ico: '🌷' },
  { id: 'shower', fl: 1, x: 262, dur: 8, face: -1, see: 0, txt: 'в душе', ico: '🚿' },
  { id: 'teeth', fl: 1, x: 345, dur: 5, face: -1, see: 230, txt: 'чистит зубы', ico: '🪥' },
  { id: 'sleep', fl: 1, x: 770, dur: 11, face: 1, see: 0, txt: 'спит', ico: '💤' },
  { id: 'desk', fl: 1, x: 1094, dur: 9, face: 1, see: 300, txt: 'работает', ico: '📰' },
];
export const ITEMS = {
  pepper: { name: 'Острый перец', ico: '🌶️', fl: 0, x: 540 },
  glue: { name: 'Клей', ico: '🧴', fl: 1, x: 1240 },
  saw: { name: 'Пила', ico: '🪚', fl: 0, x: 1470 },
  scissors: { name: 'Ножницы', ico: '✂️', fl: 1, x: 905 },
  dye: { name: 'Синяя краска', ico: '🎨', fl: 0, x: 248 },
  mustard: { name: 'Горчица', ico: '🌭', fl: 0, x: 852 },
  alarm: { name: 'Будильник', ico: '⏰', fl: 1, x: 1000 },
  pins: { name: 'Кнопки', ico: '📌', fl: 0, x: 905 },
  soap: { name: 'Мыло', ico: '🧼', fl: 1, x: 530 },
};
export const PRANKS = [
  { id: 'pepper', act: 'cook', item: 'pepper', fl: 0, x: 615, name: 'Перец в суп', say: 'ГОРЯЧО-О-О!' },
  { id: 'glue', act: 'eat', item: 'glue', fl: 0, x: 818, name: 'Клей на стул', say: 'Прилип!!' },
  { id: 'saw', act: 'tv', item: 'saw', fl: 0, x: 1018, name: 'Подпиленный диван', say: 'А-а-а!' },
  { id: 'hose', act: 'garden', item: 'scissors', fl: 0, x: 1365, name: 'Дырявый шланг', say: 'Тьфу! Мокро!' },
  { id: 'dye', act: 'shower', item: 'dye', fl: 1, x: 240, name: 'Краска в душе', say: 'Я СИНИЙ?!' },
  { id: 'mustard', act: 'teeth', item: 'mustard', fl: 1, x: 322, name: 'Горчица в пасте', say: 'Фу-у-у!' },
  { id: 'alarm', act: 'sleep', item: 'alarm', fl: 1, x: 702, name: 'Будильник под подушкой', say: 'ПОЖАР?!' },
  { id: 'pins', act: 'desk', item: 'pins', fl: 1, x: 1085, name: 'Кнопки на стуле', say: 'АЙ!!' },
  { id: 'soap', stair: 'A', item: 'soap', fl: 0, x: 372, name: 'Мыло на лестнице', say: 'Уо-о-о-о!' },
];
export const HIDES = [
  { id: 'coat', fl: 0, x: 298, name: 'За вешалкой' },
  { id: 'curtain', fl: 0, x: 1262, name: 'За шторой' },
  { id: 'wardrobe', fl: 1, x: 640, name: 'В шкафу' },
  { id: 'books', fl: 1, x: 1185, name: 'За стеллажом' },
];
export const COLORS = ['#ffcf3a', '#4fd6ff', '#ff6fae', '#7ee05a'];
const actById = Object.fromEntries(ACTS.map((a) => [a.id, a]));
const prankById = Object.fromEntries(PRANKS.map((p) => [p.id, p]));
const hideById = Object.fromEntries(HIDES.map((h) => [h.id, h]));

export const roomAt = (fl, x) => ROOMS.find((r) => r.fl === fl && x >= r.x0 && x < r.x1) || ROOMS[0];
export function pos(e) {                    // where a body is in the picture: on a floor, or somewhere on a flight of stairs
  if (!e.st) return { x: e.x, y: FY[e.fl] };
  const s = e.st.s, u = e.st.up ? e.st.t : 1 - e.st.t;
  return { x: s.b + (s.t - s.b)*u, y: FY[0] + (FY[1] - FY[0])*u };
}
const floorOf = (e) => e.st ? (e.st.t < 0.5 === e.st.up ? 0 : 1) : e.fl;

// ---- moving about ----
function plan(e, fl, x) {                   // a path: walk, maybe a flight of stairs, walk
  x = Math.max(4, Math.min(W - 4, x)); const from = floorOf(e);
  if (e.st) { e.path = [{ fl: fl, x: x }]; return; }   // finish the stairs first; the rest is worked out at the top or the foot
  if (from === fl) { e.path = [{ x: x }]; return; }
  const up = fl > from; let best = null, bd = 1e9;
  for (const s of STAIRS) { const a = up ? s.b : s.t, b = up ? s.t : s.b, d = Math.abs(e.x - a) + Math.abs(b - x); if (d < bd) { bd = d; best = s; } }
  e.path = [{ x: up ? best.b : best.t }, { s: best, up: up }, { x: x }];
}
function move(e, sp, dt, S) {               // returns true when the end of the path is reached
  if (e.st) { e.st.t += dt/STAIR_T; if (e.st.t >= 1) { e.fl = e.st.up ? 1 : 0; e.x = e.st.up ? e.st.s.t : e.st.s.b; e.st = null; const nx = e.path[0];
      if (nx && nx.fl !== undefined) { plan(e, nx.fl, nx.x); } } return false; }
  const w = e.path[0]; if (!w) return true;
  if (w.s) { if (e.onStair) e.onStair(w.s, S); if (e.path[0] !== w) return false; e.st = { s: w.s, up: w.up, t: 0 }; e.path.shift(); return false; }
  if (w.fl !== undefined) { plan(e, w.fl, w.x); return false; }
  const d = w.x - e.x; if (Math.abs(d) <= sp*dt) { e.x = w.x; e.path.shift(); return !e.path.length; }
  e.x += Math.sign(d)*sp*dt; e.face = Math.sign(d); e.walk = (e.walk || 0) + sp*dt; return false;
}

// ---- a game ----
export function newGame() {
  return { t: 0, left: ROUND, ph: 'play', score: 0, combo: 0, last: -99, players: [], seq: 0, ev: [],
    items: Object.fromEntries(Object.keys(ITEMS).map((k) => [k, 'spot'])), pranks: Object.fromEntries(PRANKS.map((p) => [p.id, 0])),
    n: { fl: 0, x: 1010, st: null, path: [{ x: ACTS[0].x }], face: -1, mode: 'walk', ai: 0, t: 0, tgt: null, lost: 0, say: '', sayT: 0, mood: 0, blue: 0, wet: 0, chair: 0, fx: '', fxT: 0 } };
}
export function addPlayer(S, id, name) {
  let p = S.players.find((q) => q.id === id); if (p) { p.gone = 0; return p; }
  const used = S.players.map((q) => q.c); let c = 0; while (used.includes(c) && c < 3) c++;
  p = { id: id, name: name || 'Игрок', c: c, fl: 0, x: 70 + S.players.length*40, st: null, path: [], face: 1, item: null, goal: null, act: null, hide: null, out: 0, caught: 0, pranks: 0, gone: 0 };
  S.players.push(p); return p;
}
export function removePlayer(S, id) { const p = S.players.find((q) => q.id === id); if (!p) return; if (p.item) S.items[p.item] = 'spot'; S.players.splice(S.players.indexOf(p), 1); if (S.n.tgt === id) giveUp(S); }
const say = (S, txt, t) => { S.n.say = txt; S.n.sayT = t || 1.8; };
const ev = (S, o) => { o.k = ++S.seq; S.ev.push(o); if (S.ev.length > 40) S.ev.shift(); };

// what a player asked for: {t:'go', fl, x} to walk, {t:'use', kind:'item'|'prank'|'hide', id} to do something there, {t:'leave'} to come out of hiding
export function input(S, id, c) {
  const p = S.players.find((q) => q.id === id); if (!p || S.ph !== 'play' || p.out > 0 || !c) return;
  if (p.hide) { const h = hideById[p.hide]; p.hide = null; p.x = h.x; p.fl = h.fl; ev(S, { e: 'unhide', p: id }); if (c.t === 'leave') return; }
  p.act = null; p.goal = null;
  if (c.t === 'go' && (c.fl === 0 || c.fl === 1) && isFinite(c.x)) plan(p, c.fl, +c.x);
  else if (c.t === 'use') { const o = c.kind === 'item' ? ITEMS[c.id] : c.kind === 'prank' ? prankById[c.id] : c.kind === 'hide' ? hideById[c.id] : null; if (!o) return; p.goal = { kind: c.kind, id: c.id }; plan(p, o.fl, o.x); }
}
const why = (S, p, g) => {                  // can this be done here and now? '' if it can, otherwise what to tell the player
  if (g.kind === 'item') return S.items[g.id] !== 'spot' ? 'Уже забрали' : p.item ? 'Руки заняты: сначала используй ' + ITEMS[p.item].name.toLowerCase() : '';
  if (g.kind === 'prank') { const r = prankById[g.id]; return S.pranks[g.id] ? 'Тут уже всё готово' : p.item !== r.item ? 'Нужно: ' + ITEMS[r.item].ico + ' ' + ITEMS[r.item].name.toLowerCase() : ''; }
  return '';
};
export const ACT_T = { item: 0.45, prank: 1.6, hide: 0.15 };

function stepPlayer(S, p, dt) {
  if (p.out > 0) { p.out -= dt; return; }
  if (p.hide) return;
  if (p.act) { p.act.t += dt; if (p.act.t >= ACT_T[p.act.kind]) { const g = p.act; p.act = null; const no = why(S, p, g); if (no) { ev(S, { e: 'no', p: p.id, txt: no }); return; }
      if (g.kind === 'item') { S.items[g.id] = p.id; p.item = g.id; ev(S, { e: 'pick', p: p.id, id: g.id }); }
      else if (g.kind === 'prank') { S.items[p.item] = 'used'; p.item = null; S.pranks[g.id] = 1; ev(S, { e: 'arm', p: p.id, id: g.id }); }
      else { p.hide = g.id; ev(S, { e: 'hide', p: p.id, id: g.id }); } } return; }
  if (move(p, PSPD, dt, S) && p.goal) { const g = p.goal; p.goal = null; const no = why(S, p, g); if (no) ev(S, { e: 'no', p: p.id, txt: no }); else { p.act = { kind: g.kind, id: g.id, t: 0 }; if (g.kind === 'prank') p.face = prankById[g.id].x > p.x ? 1 : -1; } }
}

// ---- the neighbour ----
function sees(S, p) {
  const n = S.n; if (p.out > 0 || p.hide || p.gone) return false; if (n.mode === 'react' || n.mode === 'gloat') return false;
  const nf = floorOf(n), pf = floorOf(p); if (nf !== pf) return false; const np = pos(n), pp = pos(p), rn = roomAt(nf, np.x), rp = roomAt(pf, pp.x);
  if (rp.safe || rn !== rp) return false; const dx = pp.x - np.x, ad = Math.abs(dx);
  const act = n.mode === 'act' ? actById[ACTS[n.ai].id] : null, range = n.mode === 'chase' || n.mode === 'search' ? 700 : act ? act.see : 430;
  if (range <= 0) return ad < 40 && n.mode !== 'act';
  return ad < 55 || (ad < range && Math.sign(dx) === n.face);
}
function goAct(S) { const a = ACTS[S.n.ai], n = S.n; n.mode = 'walk'; n.tgt = null; plan(n, a.fl, a.x); }
function giveUp(S) { const n = S.n; n.tgt = null; n.mood = Math.max(0, n.mood - 1); goAct(S); }
function startAct(S) {
  const n = S.n, a = ACTS[n.ai]; n.mode = 'act'; n.t = a.dur; n.face = a.face;
  const pr = PRANKS.find((r) => r.act === a.id); if (pr && S.pranks[pr.id] === 1) spring(S, pr);
}
function spring(S, pr) {                    // a prank goes off
  const n = S.n; S.pranks[pr.id] = 2; n.mode = 'react'; n.fx = pr.id; n.fxT = 0; n.t = 3.2; n.path = []; n.mood = Math.min(3, n.mood + 1); say(S, pr.say, 2.6);
  S.combo = S.t - S.last < 30 ? Math.min(4, S.combo + 1) : 1; S.last = S.t; const pts = 100*S.combo; S.score += pts;
  if (pr.id === 'dye') n.blue = 1; if (pr.id === 'hose') n.wet = 25; if (pr.id === 'glue') n.chair = 30;
  ev(S, { e: 'prank', id: pr.id, pts: pts, combo: S.combo });
  if (PRANKS.every((r) => S.pranks[r.id] === 2)) { S.score += Math.round(S.left)*5; end(S); }
}
function end(S) { S.ph = 'over'; ev(S, { e: 'over', score: S.score, done: PRANKS.filter((r) => S.pranks[r.id] === 2).length }); }
function stepN(S, dt) {
  const n = S.n; n.sayT = Math.max(0, n.sayT - dt); n.wet = Math.max(0, n.wet - dt); n.chair = Math.max(0, n.chair - dt); if (n.fx) n.fxT += dt;
  if (!n.onStair) n.onStair = (s, S2) => { if (s.id === 'A' && S2.pranks.soap === 1 && S2.n.mode !== 'react') { spring(S2, prankById.soap); S2.n.after = 'resume'; } };
  if (n.mode === 'react') { n.t -= dt; if (n.t <= 0) { n.fx = ''; if (n.after === 'resume') { n.after = null; goAct(S); } else { n.mode = 'act'; n.t = 2; } } return; }
  if (n.mode === 'gloat') { n.t -= dt; if (n.t <= 0) goAct(S); return; }
  if (n.mode === 'alert') { n.t -= dt; const p = S.players.find((q) => q.id === n.tgt); if (!p || p.out > 0) { goAct(S); return; } n.face = pos(p).x > pos(n).x ? 1 : -1; if (n.t <= 0) { n.mode = 'chase'; n.lost = 0; n.re = 0; say(S, 'Стой, хулиган!'); } return; }
  if (n.mode === 'chase') {
    const p = S.players.find((q) => q.id === n.tgt); if (!p || p.out > 0 || roomAt(floorOf(p), pos(p).x).safe) { if (p && roomAt(floorOf(p), pos(p).x).safe) say(S, 'И не возвращайся!'); giveUp(S); return; }
    const pp = pos(p), np = pos(n);
    if (p.hide) { if (Math.abs(pp.x - np.x) < 140 && floorOf(p) === floorOf(n)) { catchP(S, p); return; } n.mode = 'search'; n.t = 2; plan(n, p.fl, p.x); return; }
    if (sees(S, p)) { n.lost = 0; n.lx = { fl: floorOf(p), x: pp.x }; } else n.lost += dt;
    if (n.lost > 2.5) { n.mode = 'search'; n.t = 1.6; n.path = []; return; }
    n.re -= dt; if (n.re <= 0) { n.re = 0.25; const tg = n.lx || { fl: p.fl, x: pp.x }; plan(n, tg.fl, tg.x); }
    if (!p.st && !n.st && p.fl === n.fl && Math.abs(pp.x - np.x) < CATCH) { catchP(S, p); return; }
    move(n, NCHASE, dt, S); return;
  }
  if (n.mode === 'search') { if (move(n, NWALK, dt, S)) { n.t -= dt; n.face = Math.sin(S.t*3) > 0 ? 1 : -1; } for (const p of S.players) if (sees(S, p)) { spot(S, p); return; } if (n.t <= 0) { say(S, 'Показалось…', 1.2); giveUp(S); } return; }
  for (const p of S.players) if (sees(S, p)) { spot(S, p); return; }
  if (n.mode === 'walk') { if (move(n, NWALK, dt, S)) startAct(S); return; }
  if (n.mode === 'act') { n.t -= dt; if (n.t <= 0) { n.ai = (n.ai + 1) % ACTS.length; goAct(S); } }
}
function spot(S, p) { const n = S.n; n.mode = 'alert'; n.t = 0.55; n.tgt = p.id; n.path = []; say(S, '!!!', 0.6); ev(S, { e: 'spot', p: p.id }); }
function catchP(S, p) {
  const n = S.n; if (p.item) S.items[p.item] = 'spot'; p.item = null; p.hide = null; p.act = null; p.goal = null; p.path = []; p.st = null; p.fl = 0; p.x = 60 + Math.random()*120; p.out = 4; p.caught++;
  n.mode = 'gloat'; n.t = 1.4; n.tgt = null; n.path = []; say(S, 'Вон из моего дома!', 2); ev(S, { e: 'caught', p: p.id });
}

export function step(S, dt) {
  if (S.ph !== 'play') return; S.t += dt; S.left -= dt;
  for (const p of S.players) stepPlayer(S, p, dt);
  stepN(S, dt);
  if (S.left <= 0) { S.left = 0; end(S); }
}

// what goes over the wire, many times a second: short names, rounded numbers
const r1 = (v) => Math.round(v*10)/10;
export function snap(S) {
  const body = (e) => { const q = pos(e); return [r1(q.x), r1(q.y), e.fl, e.face]; };
  const n = S.n;
  return { t: r1(S.t), left: r1(S.left), ph: S.ph, sc: S.score, cb: S.combo, it: S.items, pr: S.pranks, k: S.seq,
    n: body(n).concat([n.mode, n.ai, n.mode === 'act' ? r1(n.t) : 0, n.say, r1(n.sayT), n.mood, n.blue, r1(n.wet), r1(n.chair), n.fx, r1(n.fxT), n.st ? 1 : 0, n.tgt]),
    ps: S.players.map((p) => body(p).concat([p.id, p.name, p.c, p.item || '', p.hide || '', r1(p.out), p.act ? p.act.kind : '', p.act ? r1(p.act.t) : 0, p.st ? 1 : 0, p.caught])),
    ev: S.ev };
}
