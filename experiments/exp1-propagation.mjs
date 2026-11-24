// Experiment 1: do emulated preferences reach the app frame, in every engine, across three sites,
// and does a live change fire `change` events inside the app?
import { open, QUERIES } from './harness.mjs';

const ON = { colorScheme: 'dark', reducedMotion: 'reduce', forcedColors: 'active', contrast: 'more' };
const OFF = { colorScheme: 'light', reducedMotion: 'no-preference', forcedColors: 'none', contrast: 'no-preference' };

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const appMode of ['srcdoc', 'src']) {
    const { browser, page, collect } = await open(engine, { appMode });
    const out = {};
    await page.emulateMedia(OFF);
    out.off = await collect();
    await page.emulateMedia(ON); // live change, no reload
    out.on = await collect();
    console.log(`\n=== ${engine} / app via ${appMode} ===`);
    for (const state of ['off', 'on']) {
      const r = out[state];
      if (!r || !r.app) { console.log(state, 'NO APP REPORT', Object.keys(r || {})); continue; }
      console.log(`[${state}] app origin=${r.app.origin}`);
      for (const q of QUERIES) {
        const v = ['host', 'proxy', 'app'].map((l) => String(r[l]?.values[q])).join(' / ');
        console.log(`  ${q.padEnd(40)} host/proxy/app = ${v}`);
      }
    }
    console.log('  change events seen in app after live switch:', out.on.app.events.join(', ') || '(none)');
    await browser.close();
  }
}
