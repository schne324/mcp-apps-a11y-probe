// Minimal repro: with the OS high-contrast setting on, nativeTheme.shouldUseHighContrastColors is true
// but web content's (prefers-contrast: more) is false. Compare with the same HTML in Chrome.
const { app, BrowserWindow, nativeTheme } = require('electron');

const html = `<!doctype html><meta charset="utf-8"><title>prefers-contrast repro</title>
<pre id="out"></pre>
<script>
  const q = (m) => matchMedia(m).matches;
  out.textContent = JSON.stringify({
    'prefers-contrast: more': q('(prefers-contrast: more)'),
    'prefers-contrast: no-preference': q('(prefers-contrast: no-preference)'),
    'prefers-reduced-motion: reduce': q('(prefers-reduced-motion: reduce)'),
    'prefers-color-scheme: dark': q('(prefers-color-scheme: dark)'),
  }, null, 2);
</script>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 520, height: 300 });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  console.log('nativeTheme.shouldUseHighContrastColors =', nativeTheme.shouldUseHighContrastColors);
  console.log('web content:', await win.webContents.executeJavaScript('out.textContent'));
  if (process.env.REPRO_QUIT) app.quit();
});
