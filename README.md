# MCP Apps accessibility preference experiments

Evidence behind the comment on [modelcontextprotocol/ext-apps#431](https://github.com/modelcontextprotocol/ext-apps/issues/431#issuecomment-6983549669). Tested on macOS 27.2 (arm64), November 2026.

## probe-app

A stdio MCP server with one MCP App. When a host renders it, the app records the `HostContext` it received and the accessibility media queries inside its own frame, and reports again on every `host-context-changed` and media query change. Reports are appended to `probe-app/reports.jsonl`.

1. `cd probe-app && npm install`
2. Check it works without a host: `npm run selftest`
3. Add it to a host, using absolute paths:
   - Claude desktop, in `claude_desktop_config.json` under `mcpServers`: `"a11y-preference-probe": { "command": "<path to node>", "args": ["<this folder>/probe-app/server.mjs"] }`
   - VS Code, in a workspace `.vscode/mcp.json` under `servers`: `"a11y-preference-probe": { "type": "stdio", "command": "<path to node>", "args": ["<this folder>/probe-app/server.mjs"] }`
4. Ask the agent to "run the a11y probe", then change the host's theme and the OS accessibility settings while the app is visible.

`evidence/claude-desktop-and-vscode-reports.jsonl` is the raw log from the run cited in the comment (Claude desktop 2.31226.1 on Electron 44, VS Code 1.146 on Electron 43, with macOS Increase Contrast, Reduce Motion and Reduce Transparency on).

## experiments

Browser and native-host experiments: host page → sandbox proxy → app, three different sites. Run `npm install` first.

| Script | Question |
|---|---|
| `exp6-real-os.mjs` | With real OS settings (no emulation), what does the app frame see in Chromium, Chrome, Edge, Firefox, WebKit, WKWebView and Electron? Run with the macOS settings on, then off. |
| `exp2d-real-os-dark.mjs`, `exp2e-nested.mjs` | Can the host set the app's `prefers-color-scheme` with `color-scheme` on the iframe? (Run with the Mac in Dark mode.) |
| `wk/probe.swift` | Can a native macOS host change what WKWebView content sees via `NSAppearance`? Build with `swiftc -O wk/probe.swift -o wk/probe`. |
| `el/main.js`, `el/control.js` | Can an Electron host change it via `nativeTheme.themeSource`, and does `prefers-contrast` ever reach web content? Run with `npx electron el/control.js`. |
| `exp3-forced.mjs` | Are forced colors applied inside the app, and can the host opt out? |
| `exp4-support.mjs` | Which preference media features does each engine support? |
| `exp5-fontsize.mjs` | Does the browser's default font size reach the app's `rem`? |
| `exp1*.mjs`, `exp2-embedder-override.mjs`, `exp2c-chrome-variants.mjs` | Early runs using Playwright emulation. |

**Caveat:** Playwright's `emulateMedia` (and its default `colorScheme: 'light'`) sets values in each Chromium frame separately. That hides whether the browser passes a real setting down, and it masks iframe `color-scheme` inheritance. That's why the early `exp1*`/`exp2` Chromium results differ from `exp2d`/`exp6`. Use the real-OS scripts for claims.

## electron-contrast-repro

The minimal repro for the Electron bug: with macOS Increase Contrast on, `nativeTheme.shouldUseHighContrastColors` is `true` but `(prefers-contrast: more)` is `false` in web content. `npm install && npm start`.
