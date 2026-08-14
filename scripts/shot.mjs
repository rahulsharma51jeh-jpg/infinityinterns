/**
 * Dev-only helper: capture pixel-exact screenshots of certificate artwork so the
 * design can be reviewed without a browser.
 *   node scripts/shot.mjs <url> <outfile> [selector]
 */
import { chromium } from 'playwright';

const [url, out, selector = '.ii-cert'] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [selector]');
  process.exit(1);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const target = selector === 'page' ? page : page.locator(selector).first();
await target.screenshot({ path: out });

console.log(`saved ${out}`);
await browser.close();
