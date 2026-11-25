import * as G from '../3d/sim.js';
const ok = [], bad = []; const check = (c, what) => (c ? ok : bad).push(what);
const run = (S, sec) => { for (let i = 0; i < sec*60 && S.ph === 'play'; i++) G.step(S, 1/60); };
const evs = (S, e) => S.ev.filter((x) => x.e === e);
// 1. the neighbour as a player walks to the stove and cooks: one chore done; the pepper set there goes off as he starts
{ const S = G.newGame('H'); G.addPlayer(S, 'a', 'A'); check(!S.players.some((p) => p.id === 'H'), 'the neighbour is not among the pranksters');
  S.pranks.pepper = 1; G.input(S, 'H', { t: 'use', kind: 'act', id: 'cook' }); run(S, 20);
  check(S.pranks.pepper === 2 && S.fired === 1, 'prank fires when he starts that chore'); check(!S.tdone.cook, 'a prank spoils the chore: it has to be done again'); G.input(S, 'H', { t: 'use', kind: 'act', id: 'cook' }); run(S, 8); check(S.tdone.cook === 1, 'done the second time (' + Object.keys(S.tdone) + ')'); }
// 2. a prankster creeping up in front of him is caught; one behind his back is not
{ const S = G.newGame('H'); G.addPlayer(S, 'a', 'A'); G.addPlayer(S, 'b', 'B'); const n = S.n; n.fl = 0; n.x = 700; n.face = 1; n.mode = 'idle';
  const [a, b] = S.players; a.fl = 0; a.x = 760; b.fl = 0; b.x = 650; G.input(S, 'a', { t: 'go', fl: 0, x: 705 }); G.input(S, 'b', { t: 'go', fl: 0, x: 672 }); run(S, 1.5);
  check(a.caught === 1, 'caught in front'); check(b.caught === 0, 'not caught behind his back');
  const seen = G.snapFor(S, 'H').ps.map((p) => p[4]); check(!seen.includes('b') && seen.includes('a'), 'the neighbour is shown only who he sees and who is out (' + seen + ')');
  check(G.snapFor(S, 'b').ps.length === 2, 'pranksters see everyone'); }
// 3. hiding: checking the wardrobe finds whoever is in it; checking an empty one finds nobody
{ const S = G.newGame('H'); G.addPlayer(S, 'a', 'A'); const a = S.players[0]; a.hide = 'wardrobe'; const n = S.n; n.fl = 1; n.x = 900; n.mode = 'idle';
  G.input(S, 'H', { t: 'use', kind: 'hide', id: 'books' }); run(S, 5); check(a.caught === 0, 'an empty hiding place: nobody');
  G.input(S, 'H', { t: 'use', kind: 'hide', id: 'wardrobe' }); run(S, 6); check(a.caught === 1 && a.out > 0, 'found in the wardrobe'); }
// 4. running is heard, creeping is not; the bell is heard and cools down
{ const S = G.newGame('H'); G.addPlayer(S, 'a', 'A'); G.addPlayer(S, 'b', 'B'); const [a, b] = S.players; a.x = 300; b.x = 300;
  G.input(S, 'a', { t: 'run', on: true }); G.input(S, 'a', { t: 'go', fl: 0, x: 800 }); G.input(S, 'b', { t: 'go', fl: 0, x: 600 }); run(S, 2);
  const steps = evs(S, 'noise').filter((x) => x.kind === 'steps'); check(steps.length >= 2 && steps.every((x) => x.p === 'a'), 'running is heard, creeping not (' + steps.length + ')');
  check(a.x > b.x + 100, 'running is faster');
  G.input(S, 'b', { t: 'use', kind: 'bell' }); run(S, 4); check(evs(S, 'noise').some((x) => x.kind === 'bell'), 'the bell rings'); G.input(S, 'b', { t: 'use', kind: 'bell' }); run(S, 3); check(evs(S, 'noise').filter((x) => x.kind === 'bell').length === 1 && evs(S, 'no').some((x) => /остыл/.test(x.txt)), 'the bell cools down'); }
// 5. who wins: chores done and few pranks -> the neighbour; five pranks -> the pranksters; time out with chores undone -> the pranksters
{ const S = G.newGame('H'); for (const id of ['cook', 'eat', 'tv', 'desk']) S.tdone[id] = 1; S.left = 0.05; run(S, 1); check(S.win === 'n', 'neighbour wins with his chores done'); }
{ const S = G.newGame('H'); S.left = 0.05; run(S, 1); check(S.win === 'pr', 'pranksters win if he did not do his chores'); }
{ const S = G.newGame('H'); const n = S.n; for (const r of G.PRANKS.filter((r) => r.act).slice(0, 5)) { S.pranks[r.id] = 1; const a = G.ACTS.find((x) => x.id === r.act); n.mode = 'idle'; n.path = []; n.st = null; n.fl = a.fl; n.x = a.x; G.input(S, 'H', { t: 'use', kind: 'act', id: a.id }); run(S, 6); } check(S.win === 'pr' && S.ph === 'over', 'five pranks: pranksters win (' + S.fired + ')'); }
// 6. the computer neighbour hears the bell and goes to the door
{ const S = G.newGame(); G.addPlayer(S, 'a', 'A'); run(S, 4); G.input(S, 'a', { t: 'use', kind: 'bell' }); run(S, 2); check(S.n.mode === 'search' || S.n.path.some((w) => w.x !== undefined && w.x < 400), 'the computer neighbour goes to the bell (' + S.n.mode + ')'); }
console.log(ok.length + ' ok' + (bad.length ? '\nFAILED: ' + bad.join('\n        ') : ''));
