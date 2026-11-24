// Why does Chrome ignore iframe color-scheme? Vary where color-scheme is declared and whether the child opts in.
import http from 'node:http';
import { chromium, firefox, webkit } from 'playwright';
let PORT, V;
const childMeta = { none: '', 'light dark': '<meta name="color-scheme" content="light dark">', normal: '<meta name="color-scheme" content="normal">' };
const app = () => `<!doctype html>${childMeta[V.child]}<script>setTimeout(()=>top.postMessage({app:matchMedia('(prefers-color-scheme: dark)').matches},'*'),300)</script>`;
const host = () => `<!doctype html><html style="${V.root}"><script>window.got=null;addEventListener('message',e=>got=e.data)</script><iframe style="${V.iframe}" ${V.sandbox ? 'sandbox="allow-scripts"' : ''} src="http://127.0.0.1:${PORT}/app"></iframe>`;
const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end(q.url === '/app' ? app() : host()); });
await new Promise((r) => srv.listen(0, '::', r)); PORT = srv.address().port;
const variants = [];
for (const root of ['', 'color-scheme: light']) for (const iframe of ['', 'color-scheme: light']) for (const child of ['none', 'light dark', 'normal']) for (const sandbox of [true, false])
  if (root || iframe) variants.push({ root, iframe, child, sandbox });
for (const [name, eng, opts] of [['chrome', chromium, { channel: 'chrome' }], ['chromium', chromium, {}], ['firefox', firefox, {}], ['webkit', webkit, {}]]) {
  const b = await eng.launch(opts); const rows = [];
  for (const v of variants) {
    V = v; const p = await b.newPage({ colorScheme: null, reducedMotion: null, contrast: null, forcedColors: null });
    await p.goto(`http://localhost:${PORT}/host`); await p.waitForFunction(() => got, null, { timeout: 5000 }).catch(() => {});
    rows.push(`${(await p.evaluate(() => got?.app)) ? 'dark' : 'LIGHT'}  root=${v.root ? 'light' : '-'} iframe=${v.iframe ? 'light' : '-'} child-meta=${v.child} sandbox=${v.sandbox}`);
    await p.close();
  }
  console.log(`\n${name} ${b.version()}\n  ` + rows.join('\n  ')); await b.close();
}
srv.close();
