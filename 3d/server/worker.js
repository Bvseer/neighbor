// Pranksters online: a room is a Durable Object that runs the very game in sim.js and tells every phone in it how things stand,
// twenty times a second. Phones send only what their player asked for. The bot posts rooms into group chats.
import * as G from '../sim.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS) });
const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
const enc = new TextEncoder();
async function hmac(key, msg) { const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return crypto.subtle.sign('HMAC', k, enc.encode(msg)); }
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const FRESH = 7*24*3600, MAXP = 4, TICK = 50;
const botName = (env) => env.BOT_NAME || 'annoyNeighborBot';
const link = (env, id) => 'https://t.me/' + botName(env) + '?startapp=r_' + id;
const roomOk = (id) => typeof id === 'string' && /^[a-z0-9]{6,12}$/.test(id);
const newId = () => { const abc = 'abcdefghjkmnpqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint8Array(8)); let s = ''; for (let i = 0; i < 8; i++) s += abc[r[i] % abc.length]; return s; };
const cleanName = (u) => String(u.first_name || u.username || 'Игрок').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Игрок';

// who is asking: Telegram signs the data it hands to a Mini App with the bot's token
async function whoIs(init, env) {
  if (!init || typeof init !== 'string' || init.length > 4096 || !env.BOT_TOKEN) return null;
  const p = new URLSearchParams(init), hash = p.get('hash'); if (!hash) return null;
  const lines = []; for (const [k, v] of p) if (k !== 'hash') lines.push(k + '=' + v); lines.sort();
  const secret = await hmac('WebAppData', env.BOT_TOKEN), sign = hex(await hmac(secret, lines.join('\n')));
  if (!same(sign, hash)) return null;
  const at = parseInt(p.get('auth_date') || '0', 10); if (!(at > 0) || Date.now()/1000 - at > FRESH) return null;
  let u = null; try { u = JSON.parse(p.get('user') || 'null'); } catch (e) {}
  if (!u || !Number.isSafeInteger(u.id)) return null;
  return { id: String(u.id), name: cleanName(u), uz: String(u.language_code || '').toLowerCase().indexOf('uz') === 0 };
}
async function tg(env, method, body) { try { return await (await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json(); } catch (e) { return null; } }

// ---- one room -------------------------------------------------------------
export class Room {
  constructor(state, env) { this.state = state; this.env = env; this.socks = new Map(); this.S = null; this.ph = 'lobby'; this.timer = null; this.acc = 0; this.last = 0; this.idle = 0; }
  people() { return [...this.socks.values()].filter((v, i, a) => a.findIndex((w) => w.id === v.id) === i); }
  lobby() { const ps = this.people(); return { t: 'lobby', ph: this.ph, players: ps.map((p) => ({ id: p.id, name: p.name })), score: this.S ? this.S.score : 0 }; }
  send(ws, o) { try { ws.send(typeof o === 'string' ? o : JSON.stringify(o)); } catch (e) {} }
  all(o) { const s = JSON.stringify(o); for (const ws of this.socks.keys()) this.send(ws, s); }
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('ws only', { status: 426 });
    const id = request.headers.get('X-Uid'); let name = 'Игрок'; try { name = decodeURIComponent(request.headers.get('X-Name') || 'Игрок'); } catch (e) {}
    const playing = this.people().map((p) => p.id); if (!playing.includes(id) && playing.length >= MAXP) return new Response('full', { status: 409 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair); server.accept();
    // the same person from a second window: the older one goes
    for (const [ws, v] of this.socks) if (v.id === id) { this.send(ws, { t: 'bye', why: 'again' }); try { ws.close(4000, 'again'); } catch (e) {} this.socks.delete(ws); }
    this.socks.set(server, { id, name, seen: Date.now() }); this.sweepOn();
    if (this.ph === 'play' && this.S) G.addPlayer(this.S, id, name);
    this.send(server, { t: 'hello', me: id }); this.all(this.lobby()); if (this.ph === 'play' && this.S) this.send(server, { t: 's', s: G.snap(this.S) });
    server.addEventListener('message', (e) => this.onMessage(server, e.data));
    const gone = () => this.leave(server); server.addEventListener('close', gone); server.addEventListener('error', gone);
    return new Response(null, { status: 101, webSocket: client });
  }
  onMessage(ws, data) {
    const me = this.socks.get(ws); if (!me || typeof data !== 'string' || data.length > 500) return; me.seen = Date.now(); let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (m.t === 'in' && this.ph === 'play' && this.S && m.c && typeof m.c === 'object') G.input(this.S, me.id, { t: String(m.c.t), fl: m.c.fl | 0, x: +m.c.x, kind: String(m.c.kind || ''), id: String(m.c.id || '') });
    else if (m.t === 'start' && this.ph !== 'play') this.start();
    else if (m.t === 'ping') this.send(ws, { t: 'pong' });
  }
  leave(ws) { const me = this.socks.get(ws); if (!me) return; this.socks.delete(ws); if (this.S && !this.people().some((p) => p.id === me.id)) G.removePlayer(this.S, me.id); this.all(this.lobby()); if (!this.socks.size) this.stop(); }
  // a phone that has gone quiet for 45 s is gone, even if its connection never said so (phones ping every 20 s)
  sweepOn() { if (this.sweeper) return; this.sweeper = setInterval(() => { const t = Date.now(); for (const [ws, v] of this.socks) if (t - v.seen > 45000) { try { ws.close(4001, 'quiet'); } catch (e) {} this.leave(ws); } if (!this.socks.size) { clearInterval(this.sweeper); this.sweeper = null; } }, 10000); }
  start() { const S = G.newGame(); for (const p of this.people()) G.addPlayer(S, p.id, p.name); this.S = S; this.ph = 'play'; this.acc = 0; this.last = Date.now(); this.all(this.lobby()); this.run(); }
  run() { if (this.timer) return; this.timer = setInterval(() => this.tick(), TICK); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  tick() {
    const t = Date.now(); this.acc += Math.min(250, t - this.last); this.last = t; const S = this.S; if (!S) return this.stop();
    let n = 0; while (this.acc >= 1000/60 && n++ < 15) { G.step(S, 1/60); this.acc -= 1000/60; }
    this.all({ t: 's', s: G.snap(S) });
    if (S.ph === 'over') { this.ph = 'over'; this.stop(); this.all(this.lobby()); }
  }
}

// ---- the bot --------------------------------------------------------------
async function telegram(env, request) {
  if (!env.HOOK_SECRET || request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.HOOK_SECRET) return new Response('no', { status: 403 });
  let up = null; try { up = await request.json(); } catch (e) { return new Response('ok'); }
  const m = up && up.message; if (!m || !m.chat || typeof m.text !== 'string') return new Response('ok');
  const cmd = m.text.trim().split(/[\s@]/)[0].toLowerCase(), uz = String(m.from && m.from.language_code || '').toLowerCase().indexOf('uz') === 0;
  if (cmd === '/game' || cmd === '/play' || (cmd === '/start' && m.chat.type !== 'private')) {
    // a room for whoever is in the chat: the button takes everyone to the same one
    const id = newId(), who = m.from ? cleanName(m.from) : '';
    await tg(env, 'sendMessage', { chat_id: m.chat.id, text: uz ? '🏠 ' + who + ' qo‘shniga hazil qilishga chaqiryapti! 2–4 kishi kerak.' : '🏠 ' + who + ' зовёт пакостить соседу! Нужно 2–4 человека: заходите в одну комнату.', reply_markup: { inline_keyboard: [[{ text: uz ? '🚪 Kirish' : '🚪 Войти в комнату', url: link(env, id) }]] } });
  } else if (cmd === '/start' || cmd === '/help') {
    await tg(env, 'sendMessage', { chat_id: m.chat.id, text: uz ? 'Qo‘shni uyiga kirib, unga hazillar qiling, lekin ko‘ziga tushmang! Do‘stlar bilan o‘ynash uchun guruhda /game yozing.' : 'Пробирайся в дом к ворчливому соседу и устраивай пакости, пока он занят делами. Попадёшься на глаза — выкинет на улицу.\n\nИграть с друзьями: добавь меня в группу и напиши /game.', reply_markup: { inline_keyboard: [[{ text: uz ? '🎮 O‘ynash' : '🎮 Играть', url: 'https://t.me/' + botName(env) + '?startapp=home' }]] } });
  }
  return new Response('ok');
}
async function setup(env, origin) {
  const hook = await tg(env, 'setWebhook', { url: origin + '/tg', secret_token: env.HOOK_SECRET, allowed_updates: ['message'] });
  const cmds = await tg(env, 'setMyCommands', { commands: [{ command: 'game', description: 'Позвать всех пакостить' }, { command: 'help', description: 'Как играть' }] });
  return { webhook: !!(hook && hook.ok), commands: !!(cmds && cmds.ok) };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
      if (path === '/ws') {
        const room = url.searchParams.get('room'), me = await whoIs(url.searchParams.get('init'), env);
        if (!roomOk(room)) return json({ ok: false, err: 'room' }, 400); if (!me) return json({ ok: false, err: 'auth' }, 401);
        const h = new Headers(request.headers); h.set('X-Uid', me.id); h.set('X-Name', encodeURIComponent(me.name));
        const stub = env.ROOMS.get(env.ROOMS.idFromName(room)); const r = await stub.fetch(new Request(request.url, { headers: h }));
        return r;
      }
      if (path === '/new' && request.method === 'POST') { let q = {}; try { q = await request.json(); } catch (e) {} const me = await whoIs(q && q.init, env); if (!me) return json({ ok: false, err: 'auth' }, 401); const id = newId(); return json({ ok: true, id, link: link(env, id) }); }
      if (path === '/tg' && request.method === 'POST') return await telegram(env, request);
      if (path === '/setup') { if (!env.HOOK_SECRET || url.searchParams.get('key') !== env.HOOK_SECRET) return json({ ok: false, err: 'key' }, 403); return json(Object.assign({ ok: true }, await setup(env, url.origin))); }
      if (path === '/') return json({ ok: true, name: 'Pranksters', rooms: !!env.ROOMS, token: !!env.BOT_TOKEN, key: !!env.HOOK_SECRET });
      return json({ ok: false, err: 'path' }, 404);
    } catch (e) { return json({ ok: false, err: 'server', msg: String(e && e.message || e).slice(0, 200) }, 500); }
  },
};
