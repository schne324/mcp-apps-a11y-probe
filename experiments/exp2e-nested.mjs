import { open } from './harness.mjs';
for (const [label, launch] of [['chrome', { channel: 'chrome' }], ['electron-like chromium', {}]]) {
  const { chromium } = await import('playwright');
  const b = await chromium.launch(launch); const ctx = await b.newContext({ colorScheme: null, reducedMotion: null, contrast: null, forcedColors: null });
  const { pages } = await import('./harness.mjs'); const map = pages({ iframeStyle: 'color-scheme: light', appMode: 'src' });
  await ctx.route('**/*', r => r.fulfill({ contentType: 'text/html', body: map[r.request().url()] || '' }));
  const p = await ctx.newPage(); await p.goto('http://host.test/'); await p.waitForTimeout(500);
  await p.evaluate(() => { window.R = {}; addEventListener('message', e => { if (e.data.id) R[e.data.label] = e.data.values['(prefers-color-scheme: dark)']; }); postMessage({ ask: 'x' }, '*'); });
  await p.waitForTimeout(500); console.log(label, 'OS dark, host iframe color-scheme:light -> dark? ', JSON.stringify(await p.evaluate(() => R)));
  await b.close();
}
