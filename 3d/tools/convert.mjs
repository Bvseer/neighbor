import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: 'new' });
const p = await b.newPage(); const errs = []; p.on('response', (r) => { if (r.status() >= 400) errs.push('404 ' + r.url()); }); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 160)); });
await p.goto('http://localhost:8801/convert.html#' + encodeURIComponent(JSON.stringify(process.argv.slice(2)))); await p.waitForFunction(() => document.title === 'ok', { timeout: 240000 }).catch(() => errs.push('timeout'));
console.log(JSON.stringify(await p.evaluate(() => window.__out), null, 1));
for (const n of ['boss', 'aj']) { const arr = await p.evaluate((n) => window['glb_' + n] ? Array.from(window['glb_' + n]) : null, n); if (arr) fs.writeFileSync('/home/claude/sosed3d/raw/' + n + '.glb', Buffer.from(arr)); }
console.log('errors', errs.slice(0, 6).join(' | ')); await b.close();
