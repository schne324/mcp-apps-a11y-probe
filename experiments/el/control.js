// Electron host levers: nativeTheme.themeSource (in-app theme), and anything for contrast/motion.
// Sites: localhost (host) -> 127.0.0.1 (proxy) -> [::1] (app); three distinct sites.
const { app, BrowserWindow, nativeTheme } = require('electron');
const http = require('http');
const Q = ['(prefers-color-scheme: dark)', '(prefers-contrast: more)', '(prefers-reduced-motion: reduce)', '(forced-colors: active)'];
const probe = (l) => `<script>const r={};for(const q of ${JSON.stringify(Q)})r[q]=matchMedia(q).matches;top.postMessage({l:'${l}',r},'*')</script>`;
let PORT;
const page = (path) => ({
  '/host': `<!doctype html><script>window.got=[];addEventListener('message',e=>got.push(e.data))</script><iframe sandbox="allow-scripts allow-same-origin" src="http://127.0.0.1:${PORT}/proxy"></iframe>${probe('host')}`,
  '/proxy': `<!doctype html><iframe sandbox="allow-scripts" src="http://[::1]:${PORT}/app"></iframe>${probe('proxy')}`,
  '/app': `<!doctype html>${probe('app')}`,
})[path];
const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end(page(q.url) || ''); });
async function run(w, name, setup) {
  if (setup) await setup(w);
  await w.loadURL(`http://localhost:${PORT}/host`);
  await new Promise((r) => setTimeout(r, 800));
  const got = await w.webContents.executeJavaScript('got');
  console.log('=== ' + name);
  for (const g of got.sort((a, b) => a.l.localeCompare(b.l))) console.log('  ' + g.l.padEnd(6), JSON.stringify(g.r));
}
app.whenReady().then(async () => {
  await new Promise((r) => srv.listen(0, '::', r)); PORT = srv.address().port;
  const w = new BrowserWindow({ show: false });
  console.log('OS: shouldUseDarkColors', nativeTheme.shouldUseDarkColors, '| shouldUseHighContrastColors', nativeTheme.shouldUseHighContrastColors);
  for (const src of ['system', 'light', 'dark', 'system']) {
    nativeTheme.themeSource = src;
    await run(w, `themeSource='${src}' | nativeTheme.shouldUseHighContrastColors=${nativeTheme.shouldUseHighContrastColors}`);
  }
  app.quit();
});
