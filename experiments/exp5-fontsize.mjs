// Does a user's default font size (browser setting) reach the app's rem? Firefox via user pref, Chromium via CDP Page.setFontSizes.
import { chromium, firefox } from 'playwright';
const app = `<!doctype html><script>top.postMessage({where:'app', rem: getComputedStyle(document.documentElement).fontSize, dpr: devicePixelRatio}, '*')</script>`;
async function run(name, browser, before) {
  const ctx = await browser.newContext();
  await ctx.route('**/*', r => r.fulfill({ contentType: 'text/html', body: r.request().url().includes('app.test') ? app :
    `<!doctype html><script>window.got=new Promise(res=>addEventListener('message',e=>res(e.data)))</script><iframe sandbox="allow-scripts" src="http://app.test/"></iframe>` }));
  const p = await ctx.newPage(); if (before) await before(p, ctx);
  await p.goto('http://host.test/');
  const host = await p.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  console.log(name.padEnd(40), 'host rem', host, '| app', JSON.stringify(await p.evaluate(() => window.got)));
  await browser.close();
}
await run('firefox default', await firefox.launch());
await run('firefox default font size 24', await firefox.launch({ firefoxUserPrefs: { 'font.size.variable.x-western': 24 } }));
await run('chromium default', await chromium.launch());
await run('chromium CDP setFontSizes 24', await chromium.launch(), async (p, ctx) => { const s = await ctx.newCDPSession(p); await s.send('Page.enable'); await s.send('Page.setFontSizes', { fontSizes: { standard: 24 } }); });
