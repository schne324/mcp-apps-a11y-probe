// Can the embedder change the child's prefers-color-scheme via `color-scheme` on the <iframe> element?
import { open } from './harness.mjs';
const Q = '(prefers-color-scheme: dark)';
const cases = [
  ['OS light, host iframe color-scheme:dark', 'light', { iframeStyle: 'color-scheme: dark' }],
  ['OS dark, host iframe color-scheme:light', 'dark', { iframeStyle: 'color-scheme: light' }],
  ['OS light, proxy inner iframe color-scheme:dark', 'light', { innerStyle: 'color-scheme: dark' }],
  ['OS light, both iframes color-scheme:dark', 'light', { iframeStyle: 'color-scheme: dark', innerStyle: 'color-scheme: dark' }],
  ['OS light, no override (control)', 'light', {}],
];
for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const appMode of ['srcdoc', 'src']) {
    for (const [name, os, opts] of cases) {
      const { browser, page, collect } = await open(engine, { ...opts, appMode });
      await page.emulateMedia({ colorScheme: os });
      const r = await collect();
      console.log(`${engine.padEnd(8)} ${appMode.padEnd(6)} ${name.padEnd(46)} dark? host/proxy/app = ${['host','proxy','app'].map(l=>r[l].values[Q]).join(' / ')}`);
      await browser.close();
    }
  }
}
