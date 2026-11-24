// A feature is supported if the bare boolean query or "not (...)" form evaluates consistently; unsupported features never match either way.
import { ENGINES } from './harness.mjs';
const F = ['prefers-color-scheme','prefers-reduced-motion','prefers-contrast','forced-colors','prefers-reduced-transparency','prefers-reduced-data','inverted-colors','dynamic-range','prefers-text-size'];
for (const [n, e] of Object.entries(ENGINES)) {
  const b = await e.launch(); const p = await b.newPage(); await p.setContent('<p>');
  const r = await p.evaluate(F => Object.fromEntries(F.map(f => [f, matchMedia(`(${f})`).matches || matchMedia(`not (${f})`).matches ? 'supported' : '—'])), F);
  console.log(n.padEnd(8), r); await b.close();
}
