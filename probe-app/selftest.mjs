import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { chromium } from 'playwright';
const c = new Client({ name: 'selftest', version: '0' });
await c.connect(new StdioClientTransport({ command: process.execPath, args: ['server.mjs'] }));
const tools = (await c.listTools()).tools.map(t => `${t.name} ui=${JSON.stringify(t._meta?.ui)}`);
console.log('tools:', tools);
const res = await c.readResource({ uri: 'ui://a11y-probe/app.html' });
const html = res.contents[0].text; console.log('resource mime:', res.contents[0].mimeType, 'bytes:', html.length);
// Fake host: srcdoc sandboxed iframe, answers ui/initialize, forwards tools/call to the real server, then sends a context change.
const b = await chromium.launch(); const p = await b.newPage({ colorScheme: 'dark', contrast: 'more' });
await p.exposeFunction('callTool', async (params) => JSON.stringify(await c.callTool(params)));
await p.setContent(`<iframe id=f sandbox="allow-scripts"></iframe><script>
f.srcdoc = ${JSON.stringify(html).replace(/<\//g, "<\\/")};
window.log = [];
addEventListener('message', async (e) => { const d = e.data; log.push(d.method || ('result ' + d.id));
  const reply = (result) => f.contentWindow.postMessage({ jsonrpc: '2.0', id: d.id, result }, '*');
  if (d.method === 'ui/initialize') reply({ protocolVersion: '2026-01-26', hostInfo: { name: 'fake-host', version: '1' }, hostCapabilities: {}, hostContext: { theme: 'dark', platform: 'desktop' } });
  if (d.method === 'ui/notifications/initialized') setTimeout(() => f.contentWindow.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/host-context-changed', params: { theme: 'light' } }, '*'), 300);
  if (d.method === 'tools/call') reply(JSON.parse(await callTool(d.params)));
});</script>`);
await p.waitForTimeout(1500);
console.log('host saw:', await p.evaluate(() => log));
console.log('status:', await p.frameLocator('#f').locator('#status').textContent());
await b.close(); await c.close();
