import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' }); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8801/tools/bake.html'); await p.waitForFunction(() => document.title === 'ok', { timeout: 120000 }).catch(() => errs.push('timeout'));
const m = await p.evaluate(() => window.__manifest), pics = await p.evaluate(() => window.__pics); const dir = '/home/claude/sosed3d/textures/'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
let total = 0; pics.forEach((u, i) => { const buf = Buffer.from(u.split(',')[1], 'base64'); total += buf.length; fs.writeFileSync(dir + i + '.webp', buf); }); fs.writeFileSync(dir + 'manifest.json', JSON.stringify(m));
console.log('pictures', pics.length, 'materials', m.list.length, 'total', Math.round(total/1024) + 'KB', errs.join(' | ')); await b.close();
