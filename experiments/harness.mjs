// Models an MCP Apps host: host.test -> proxy.test (sandbox proxy) -> app (srcdoc, sandbox="allow-scripts", opaque origin).
// Every request is fulfilled by route interception, so the three origins are distinct sites in all engines.
import { chromium, firefox, webkit } from 'playwright';

export const QUERIES = [
  '(prefers-color-scheme: dark)',
  '(prefers-reduced-motion: reduce)',
  '(prefers-contrast: more)',
  '(prefers-contrast: less)',
  '(prefers-contrast: custom)',
  '(forced-colors: active)',
  '(prefers-reduced-transparency: reduce)',
  '(prefers-reduced-data: reduce)',
  '(inverted-colors: inverted)',
];

const probe = (label) => `
<script>
const Q = ${JSON.stringify(QUERIES)};
const label = ${JSON.stringify(label)};
function snap() {
  const r = {};
  for (const q of Q) { const m = matchMedia(q); r[q] = m.media === 'not all' ? 'unsupported' : m.matches; }
  return r;
}
window.__events = [];
for (const q of Q) { try { matchMedia(q).addEventListener('change', () => window.__events.push(q)); } catch {} }
function report(id) { top.postMessage({ id, label, values: snap(), events: window.__events.slice(), origin: String(location.origin) }, '*'); }
window.addEventListener('message', (e) => { if (e.data && e.data.ask) { report(e.data.ask); for (const f of document.querySelectorAll('iframe')) f.contentWindow.postMessage(e.data, '*'); } });
</script>`;

export function pages({ iframeStyle = '', innerStyle = '', appMode = 'srcdoc' } = {}) {
  const appHtml = `<!doctype html><html><body>app${probe('app')}</body></html>`;
  const inner =
    appMode === 'srcdoc'
      ? `<iframe sandbox="allow-scripts" style="${innerStyle}" srcdoc="${appHtml.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`
      : `<iframe sandbox="allow-scripts" style="${innerStyle}" src="http://app.test/app.html"></iframe>`;
  return {
    'http://host.test/': `<!doctype html><html><body>host<iframe id="proxy" sandbox="allow-scripts allow-same-origin" style="${iframeStyle}" src="http://proxy.test/proxy.html"></iframe>${probe('host')}</body></html>`,
    'http://proxy.test/proxy.html': `<!doctype html><html><body>proxy${inner}${probe('proxy')}</body></html>`,
    'http://app.test/app.html': appHtml,
  };
}

export const ENGINES = { chromium, firefox, webkit };

export async function open(engineName, opts = {}, launchOpts = {}) {
  const browser = await ENGINES[engineName].launch(launchOpts);
  const context = await browser.newContext();
  const map = pages(opts);
  await context.route('**/*', (route) => {
    const body = map[route.request().url()];
    if (body) return route.fulfill({ status: 200, contentType: 'text/html', body });
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await context.newPage();
  await page.goto('http://host.test/');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__reports = {};
    window.addEventListener('message', (e) => { if (e.data && e.data.id) (window.__reports[e.data.id] ||= {})[e.data.label] = e.data; });
  });
  let n = 0;
  const collect = async () => {
    const id = `r${++n}`;
    await page.evaluate((id) => window.postMessage({ ask: id }, '*'), id);
    await page.waitForTimeout(400);
    return page.evaluate((id) => window.__reports[id], id);
  };
  return { browser, page, collect };
}
