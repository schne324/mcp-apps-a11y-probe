// stdio MCP server exposing one MCP App that records what the host passes it (HostContext + in-frame media queries).
import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

const here = dirname(fileURLToPath(import.meta.url));
const LOG = join(here, 'reports.jsonl');
const URI = 'ui://a11y-probe/app.html';
const client = () => server.server.getClientVersion?.() ?? null;

const server = new McpServer({ name: 'a11y-preference-probe', version: '0.1.0' });

registerAppResource(server, 'A11y preference probe', URI, { description: 'Shows what the host passes to an MCP App' }, async () => ({
  contents: [{ uri: URI, mimeType: RESOURCE_MIME_TYPE, text: readFileSync(join(here, 'app.html'), 'utf8') }],
}));

registerAppTool(server, 'a11y_probe', {
  title: 'Accessibility preference probe',
  description: 'Renders a diagnostic MCP App that shows the host context and accessibility media queries the app sees. Call it when the user asks to run the a11y probe.',
  inputSchema: {},
  _meta: { ui: { resourceUri: URI } },
}, async () => ({ content: [{ type: 'text', text: 'The accessibility preference probe is displayed. No further action is needed.' }] }));

registerAppTool(server, 'a11y_probe_report', {
  title: 'Record probe report',
  description: 'Internal: called by the probe app to record a report.',
  inputSchema: { report: z.string() },
  _meta: { ui: { resourceUri: URI, visibility: ['app'] } },
}, async ({ report }) => {
  appendFileSync(LOG, JSON.stringify({ client: client(), ...JSON.parse(report) }) + '\n');
  return { content: [{ type: 'text', text: 'recorded' }] };
});

await server.connect(new StdioServerTransport());
