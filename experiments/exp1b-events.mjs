import { open } from './harness.mjs';
const ON = { colorScheme: 'dark', reducedMotion: 'reduce', forcedColors: 'active', contrast: 'more' };
const OFF = { colorScheme: 'light', reducedMotion: 'no-preference', forcedColors: 'none', contrast: 'no-preference' };
for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const appMode of ['srcdoc', 'src']) {
    const { browser, page, collect } = await open(engine, { appMode });
    await page.emulateMedia(OFF); await collect();
    await page.emulateMedia(ON); await page.waitForTimeout(1000);
    const r = await collect();
    console.log(engine, appMode, Object.fromEntries(['host','proxy','app'].map(l => [l, r[l].events.length])));
    // Is the bogus-query detector working?
    if (appMode==='src') console.log('  bogus query media =', await page.evaluate(() => matchMedia('(prefers-bogus: x)').media));
    await browser.close();
  }
}
