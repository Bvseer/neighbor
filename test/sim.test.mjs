import * as G from '../sim.js';
const out = [];
// 1: every prank set beforehand goes off as his day goes round
{ const S = G.newGame(); for (const p of G.PRANKS) S.pranks[p.id] = 1; let n = 0; while (S.ph === 'play' && n++ < 240*60) G.step(S, 1/60);
  out.push('all armed: done ' + G.PRANKS.filter((p) => S.pranks[p.id] === 2).length + '/9 at t=' + S.t.toFixed(0) + ' score ' + S.score + ' ph ' + S.ph); }
// 2: how long one round of his day takes
{ const S = G.newGame(); const seen = []; let last = -1, n = 0; while (n++ < 240*60) { G.step(S, 1/60); if (S.n.mode === 'act' && S.n.ai !== last) { last = S.n.ai; seen.push(G.ACTS[S.n.ai].id + '@' + S.t.toFixed(0)); } }
  out.push('day: ' + seen.slice(0, 10).join(' ')); }
// 3: a player who walks up to him in front is seen, chased and thrown out
{ const S = G.newGame(); G.addPlayer(S, 1, 'A'); let n = 0; while (S.n.mode !== 'act' && n++ < 6000) G.step(S, 1/60);
  const a = G.ACTS[S.n.ai]; G.input(S, 1, { t: 'go', fl: a.fl, x: a.x + a.face*150 }); const evs = []; n = 0; while (n++ < 60*20) { G.step(S, 1/60); for (const e of S.ev) if (!evs.includes(e.e + e.k)) evs.push(e.e + e.k); }
  out.push('walk in front of him at ' + a.id + ': ' + evs.join(',') + ' caught ' + S.players[0].caught); }
// 4: a player plays it the honest way: fetch the thing, put it in place while he is away, wait for him to come
{ const S = G.newGame(); G.addPlayer(S, 1, 'A'); const p = S.players[0]; let done = 0, n = 0, t0 = 0;
  const order = ['soap', 'dye', 'alarm', 'pins', 'pepper', 'glue', 'saw', 'hose', 'mustard'];
  while (S.ph === 'play' && n++ < 240*60) { G.step(S, 1/60);
    // a careful player: whenever he is on the same floor and not far, run back out to the street and wait
    const np = G.pos(S.n), nfl = np.y > 420 ? 0 : 1, pp = G.pos(p), pfl = pp.y > 420 ? 0 : 1, busy = S.n.mode === 'act' && G.ACTS[S.n.ai].see === 0;
    const danger = !busy && nfl === pfl && Math.abs(np.x - pp.x) < 520 && G.roomAt(pfl, pp.x).id !== 'street';
    if (danger && !p.act && p.hide === null) { if (!(p.path.length === 1 && p.path[0].x === 100)) G.input(S, 1, { t: 'go', fl: 0, x: 100 }); continue; }
    if (p.out > 0 || p.act || p.goal || p.path.length || p.st) continue;
    const pr = order.map((id) => G.PRANKS.find((r) => r.id === id)).find((r) => !S.pranks[r.id]); if (!pr) continue;
    { const tgt = p.item !== pr.item ? G.ITEMS[pr.item] : pr; if (!busy && tgt.fl === nfl && Math.abs(tgt.x - np.x) < 600) continue; }
    if (p.item !== pr.item) { if (S.items[pr.item] === 'spot') G.input(S, 1, { t: 'use', kind: 'item', id: pr.item }); continue; }
    // only go where he is not
    G.input(S, 1, { t: 'use', kind: 'prank', id: pr.id }); }
  out.push('honest bot: done ' + G.PRANKS.filter((r) => S.pranks[r.id] === 2).length + ' armed ' + G.PRANKS.filter((r) => S.pranks[r.id] === 1).length + ' caught ' + p.caught + ' score ' + S.score + ' snap ' + JSON.stringify(G.snap(S)).length + 'b'); }
console.log(out.join('\n'));
