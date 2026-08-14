/**
 * End-to-end smoke test of the critical paths:
 *   public verify → admin login → edit + approve → auto-issued certificate
 *   → public verification of the new number → designer edit persists → revoke
 *
 *   node scripts/e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3100';
const results = [];
let failures = 0;

function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept()); // auto-confirm the confirm() guards

const body = () => page.locator('body').innerText();

try {
  /* ---------------- 1. public verification of a seeded certificate --------- */
  await page.goto(`${BASE}/verify`, { waitUntil: 'networkidle' });
  await page.fill('#cert', 'iin-2026-01001'); // lowercase on purpose
  await page.click('button[type=submit]');
  await page.waitForLoadState('networkidle');
  let t = await body();
  check('lowercase certificate number verifies', t.includes('Certificate verified'), page.url());
  check('verified page shows intern name', t.includes('Mausam Kumari'));
  check('verified page shows QR block', /verification qr/i.test(t));

  /* ---------------- 2. unknown number is rejected ------------------------- */
  await page.goto(`${BASE}/verify/FAKE-9999`, { waitUntil: 'networkidle' });
  check('unknown certificate is reported as not found', (await body()).includes('No certificate found'));

  /* ---------------- 3. printable page + QR endpoint ----------------------- */
  await page.goto(`${BASE}/certificate/IIN-2026-01001`, { waitUntil: 'networkidle' });
  check('printable certificate renders artwork', await page.locator('.ii-cert').first().isVisible());
  const qrResp = await page.request.get(`${BASE}/api/qr/IIN-2026-01001`);
  check('QR endpoint returns a PNG', qrResp.ok() && qrResp.headers()['content-type'] === 'image/png');

  /* ---------------- 4. admin login ---------------------------------------- */
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'admin@infinityinterns.com');
  await page.fill('#password', 'Admin@12345');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  check('admin signs in and lands on the console', page.url().includes('/admin'));

  /* ---------------- 5. every admin page loads ----------------------------- */
  for (const path of [
    '/admin',
    '/admin/applications',
    '/admin/certificates',
    '/admin/templates',
    '/admin/programs',
    '/admin/interns',
    '/admin/settings',
  ]) {
    const r = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    const text = await body();
    check(`${path} loads`, r.status() === 200 && !/Application error|Internal Server Error/i.test(text), `status ${r.status()}`);
  }

  /* ---------------- 6. approve an application, expect auto-issue ---------- */
  await page.goto(`${BASE}/admin/applications?status=pending`, { waitUntil: 'networkidle' });
  const openLink = page.locator('table a:has-text("Open")').first();
  check('review queue has an application to open', (await openLink.count()) > 0);
  await openLink.click();
  await page.waitForURL(/\/admin\/applications\/\d+/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  const appUrl = page.url();
  check('application detail page opens', /\/admin\/applications\/\d+/.test(appUrl), appUrl);
  check('detail page previews the certificate', await page.locator('.ii-cert').first().isVisible());

  // Fill the certificate-critical fields, then save.
  await page.fill('#attendance', '92');
  await page.fill('#marks', '87');
  await page.fill('#start_date', '2026-06-01');
  await page.fill('#end_date', '2026-07-26');
  await page.click('button:has-text("Save details")');
  await page.waitForTimeout(1200);
  check('saving certificate data succeeds', (await body()).includes('Details saved'));

  await page.click('button:has-text("Approve & issue certificate")');
  await page.waitForTimeout(1800);
  t = await body();
  const issued = t.match(/Certificate (IIN-[A-Z0-9-]+) generated automatically/);
  check('approval auto-generates a certificate', Boolean(issued), issued ? issued[1] : t.slice(0, 200));

  /* ---------------- 7. the brand new number verifies publicly ------------- */
  if (issued) {
    const newNo = issued[1];
    const api = await page.request.get(`${BASE}/api/verify/${newNo}`);
    const json = await api.json();
    check('new certificate resolves via the JSON API', json.found === true && json.valid === true, JSON.stringify(json).slice(0, 160));
    check('API reports the saved attendance', String(json.attendance_percent) === '92', String(json.attendance_percent));

    await page.goto(`${BASE}/verify/${newNo}`, { waitUntil: 'networkidle' });
    check('new certificate verifies on the public page', (await body()).includes('Certificate verified'));

    /* ------------- 8. revoke it, confirm public page flips --------------- */
    await page.goto(`${BASE}/admin/certificates`, { waitUntil: 'networkidle' });
    await page.locator(`tr:has-text("${newNo}") a:has-text("Manage")`).first().click();
    await page.waitForLoadState('networkidle');
    await page.fill('#reason', 'Automated end-to-end test revocation');
    await page.click('button:has-text("Revoke certificate")');
    await page.waitForTimeout(1800);
    t = await body();
    check('revoking succeeds and keeps the confirmation on screen', t.includes(`${newNo} revoked`), t.match(/revoked[^\n]*/)?.[0] ?? '');
    check('panel switches to restore after revoking', t.includes('Restore to active'));

    await page.goto(`${BASE}/verify/${newNo}`, { waitUntil: 'networkidle' });
    t = await body();
    check('revoked certificate shows as revoked publicly', t.includes('Certificate revoked'));
    check('revocation reason is shown publicly', t.includes('Automated end-to-end test revocation'));

    const api2 = await page.request.get(`${BASE}/api/verify/${newNo}`);
    const json2 = await api2.json();
    check('API marks revoked certificate invalid', json2.found === true && json2.valid === false);
  }

  /* ---------------- 9. certificate designer round-trip -------------------- */
  await page.goto(`${BASE}/admin/templates`, { waitUntil: 'networkidle' });
  check('designer lists templates with thumbnails', (await page.locator('.ii-cert').count()) >= 1);

  await page.locator('a:has-text("Edit design")').first().click();
  await page.waitForLoadState('networkidle');
  check('designer opens with a live preview', await page.locator('.ii-cert').first().isVisible());

  // Change the title text and confirm the preview updates live.
  await page.locator('summary:has-text("Title block")').click();
  await page.getByLabel('Title', { exact: true }).first().fill('E2E TEST TITLE');
  await page.waitForTimeout(600);
  check('preview reflects the edited title live', (await page.locator('.ii-cert').first().innerText()).includes('E2E TEST TITLE'));

  await page.click('button:has-text("Save template")');
  await page.waitForTimeout(1500);
  check('template saves', (await body()).includes('Template saved'));

  await page.reload({ waitUntil: 'networkidle' });
  check('saved title persists after reload', (await page.locator('.ii-cert').first().innerText()).includes('E2E TEST TITLE'));

  // Put it back so the seeded design stays correct.
  await page.locator('summary:has-text("Title block")').click();
  await page.getByLabel('Title', { exact: true }).first().fill('CERTIFICATE');
  await page.click('button:has-text("Save template")');
  await page.waitForTimeout(1500);
  check('title restored to CERTIFICATE', (await page.locator('.ii-cert').first().innerText()).includes('CERTIFICATE'));

  /* ---------------- 10. intern dashboard --------------------------------- */
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.click('button:has-text("Sign out")');
  await page.waitForURL((u) => !u.pathname.startsWith('/admin'), { timeout: 15000 });
  check('signing out leaves the admin console', !page.url().includes('/admin'), page.url());

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.fill('#email', 'mausam@example.com');
  await page.fill('#password', 'Intern@12345');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  t = await body();
  check('intern signs in to their dashboard', page.url().includes('/dashboard'));
  check('dashboard lists the intern certificate', t.includes('IIN-2026-01001'));

  /* ---------------- 11. admin area is protected -------------------------- */
  const r = await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  check('intern cannot reach the admin console', !page.url().includes('/admin'), `${r.status()} → ${page.url()}`);
} catch (err) {
  check('test run completed without exceptions', false, err.message);
}

await browser.close();

console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
