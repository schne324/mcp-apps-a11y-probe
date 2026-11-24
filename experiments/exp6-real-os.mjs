// No emulation: reads the real OS state in every frame, three distinct sites served over loopback HTTP.
// Run once with macOS Increase Contrast + Reduce Motion (+ Reduce Transparency) ON, once OFF.
import http from 'node:http';
import { chromium, firefox, webkit } from 'playwright';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const Q = ['(prefers-color-scheme: dark)', '(prefers-contrast: more)', '(prefers-reduced-motion: reduce)', '(prefers-reduced-transparency: reduce)', '(inverted-colors: inverted)'];
const probe = (l) => `<script>const r={};for(const q of ${JSON.stringify(Q)})r[q]=matchMedia(q).matches;top.postMessage({l:'${l}',r},'*')</script>`;
let PORT;
const page = (p) => ({
  '/host': `<!doctype html><script>window.got=[];addEventListener('message',e=>got.push(e.data))</script><iframe sandbox="allow-scripts allow-same-origin" src="http://127.0.0.1:${PORT}/proxy"></iframe>${probe('host')}`,
  '/proxy': `<!doctype html><iframe sandbox="allow-scripts" src="http://[::1]:${PORT}/app"></iframe>${probe('proxy')}`,
  '/app': `<!doctype html>${probe('app')}`,
})[p];
const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end(page(q.url) || ''); });
await new Promise((r) => srv.listen(0, '::', r)); PORT = srv.address().port;
const short = (r) => Q.map((q) => (r[q] ? '1' : '0')).join('');
console.log('columns:', Q.join(' | '));
const targets = [['chromium', chromium, {}], ['chrome', chromium, { channel: 'chrome' }], ['edge', chromium, { channel: 'msedge' }], ['firefox', firefox, {}], ['webkit', webkit, {}]];
for (const [name, eng, opts] of targets) {
  for (const headless of [true, false]) {
    try {
      const b = await eng.launch({ ...opts, headless });
      const p = await b.newPage({ colorScheme: null, reducedMotion: null, forcedColors: null, contrast: null });
      await p.goto(`http://localhost:${PORT}/host`); await p.waitForTimeout(800);
      const got = Object.fromEntries((await p.evaluate(() => got)).map((g) => [g.l, short(g.r)]));
      console.log(`${name.padEnd(8)} ${headless ? 'headless' : 'headed  '} host=${got.host} proxy=${got.proxy} app=${got.app}`);
      await b.close();
    } catch (e) { console.log(name, headless, 'ERR', e.message.split('\n')[0]); }
  }
}
srv.close();
for (const [label, cmd] of [['WKWebView native', here('./wk/probe')], ['Electron', null]]) {
  try {
    if (cmd) console.log('--- ' + label + '\n' + execFileSync(cmd, { encoding: 'utf8' }).split('===')[1]);
    else console.log('--- Electron\n' + execFileSync(here('./node_modules/.bin/electron'), [here('./el/main.js')], { encoding: 'utf8' }).split('===').slice(0,1).join(''));
  } catch (e) { console.log(label, 'ERR', e.message.split('\n')[0]); }
}
