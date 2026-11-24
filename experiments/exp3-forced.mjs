// In forced-colors mode, is the app's authored color actually overridden, and can the host opt the iframe out?
import { ENGINES } from './harness.mjs';
const app = `<!doctype html><p id=t style="color: rgb(255,0,0); background: rgb(255,255,0)">x</p>
<script>top.postMessage({fc: matchMedia('(forced-colors: active)').matches, color: getComputedStyle(t).color, bg: getComputedStyle(t).backgroundColor}, '*')</script>`;
for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const iframeStyle of ['', 'forced-color-adjust: none']) {
    const b = await ENGINES[engine].launch(); const ctx = await b.newContext();
    await ctx.route('**/*', r => r.fulfill({ contentType: 'text/html', body: r.request().url().includes('app.test') ? app :
      `<!doctype html><script>window.got=new Promise(res=>addEventListener('message',e=>res(e.data)))</script><iframe sandbox="allow-scripts" style="${iframeStyle}" src="http://app.test/"></iframe>` }));
    const p = await ctx.newPage(); await p.emulateMedia({ forcedColors: 'active' });
    await p.goto('http://host.test/');
    console.log(engine.padEnd(8), (iframeStyle || 'no host opt-out').padEnd(28), JSON.stringify(await p.evaluate(() => window.got)));
    await b.close();
  }
}
