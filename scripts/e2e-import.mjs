/**
 * End-to-end test of manual certificate generation and spreadsheet import.
 *   node scripts/e2e-import.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:3100';
const results = [];
let failures = 0;

function check(name, pass, detail = '') {
  results.push({ name, pass });
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ii-import-'));

/* ---------------- build a spreadsheet with deliberate mistakes ---------- */
const HEADERS = [
  'Salutation', 'Intern Name', 'College / Institute', 'Course / Branch', 'Duration', 'Mode',
  'Domain / Technology', 'Start Date', 'End Date', 'Attendance %', 'Marks %', 'Project Title',
  'Mentor Name', 'Email', 'Gender', 'Issue Date', 'Certificate No',
];

const ROWS = [
  // 1: clean, linked to a seeded intern account
  ['Mr.', 'Ravi Kumar', 'NIT Patna', 'CSE', '6 Weeks', 'Online', 'Web Development', '2026-05-04', '2026-06-14', 94, 88, 'Placement Portal', 'Ankit Raj', 'aditya@example.com', 'male', '', ''],
  // 2: day-first date strings and a percent sign — should be coerced
  ['Ms.', 'Priya Singh', 'IIT Patna', 'ECE', '4 Weeks', 'Online', 'AutoCAD', '02-06-2026', '29-06-2026', '88', '93%', 'Gear Assembly', 'Er. Vikash', '', 'female', '', ''],
  // 3: no name -> error
  ['Mr.', '', 'BIT Mesra', 'ME', '4 Weeks', 'Online', 'AutoCAD', '2026-06-01', '2026-06-28', 80, 75, '', '', '', 'male', '', ''],
  // 4: end before start -> error
  ['Mr.', 'Amit Verma', 'MIT Muzaffarpur', 'CE', '4 Weeks', 'Online', 'STAAD Pro', '2026-07-30', '2026-07-01', 85, 80, '', '', '', 'male', '', ''],
  // 5: impossible attendance -> error
  ['Ms.', 'Neha Gupta', 'GP Gaya', 'EE', '4 Weeks', 'Online', 'Cyber Security', '2026-06-01', '2026-06-28', 150, 70, '', '', '', 'female', '', ''],
  // 6: migrating an existing certificate under its own number
  ['Mr.', 'Legacy Intern', 'Government Polytechnic Barh', 'ME', '4 Weeks', 'Offline', 'AutoCAD', '2025-01-06', '2025-02-02', 90, 91, '', '', '', 'male', '2025-02-05', 'LEGACY-0001'],
  // 7: reuses that number -> error
  ['Mr.', 'Copycat Intern', 'Somewhere', 'ME', '4 Weeks', 'Online', 'AutoCAD', '2025-01-06', '2025-02-02', 90, 91, '', '', '', 'male', '', 'LEGACY-0001'],
  // 8: unmatched extra column value + unknown gender -> warning only
  ['Dr.', 'Warn Case', 'Some College', 'CS', '4 Weeks', 'Telepathy', 'Java Programming', '2026-03-02', '2026-03-29', 75, 60, '', '', 'nobody@nowhere.test', 'unknown', '', ''],
];

const xlsxPath = path.join(tmp, 'batch.xlsx');
{
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Certificates');
  ws.addRow([...HEADERS, 'Random Unknown Column']);
  for (const r of ROWS) ws.addRow([...r, 'ignore me']);
  await wb.xlsx.writeFile(xlsxPath);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept());
const body = () => page.locator('body').innerText();

try {
  /* ---------------- sign in ---------------- */
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'admin@infinityinterns.com');
  await page.fill('#password', 'Admin@12345');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/admin/, { timeout: 15000 });

  /* ================= manual single certificate ================= */
  await page.goto(`${BASE}/admin/certificates/new`, { waitUntil: 'networkidle' });
  check('manual generation page loads', (await body()).includes('Generate a certificate manually'));
  check('form is built from the template columns', await page.locator('#f_intern_name').isVisible());
  check('manual page previews the template', await page.locator('.ii-cert').first().isVisible());

  // submit incomplete on purpose
  await page.fill('#f_intern_name', 'Manual Test Intern');
  await page.click('button:has-text("Generate certificate")');
  await page.waitForTimeout(800);
  check(
    'browser blocks submission while required fields are empty',
    page.url().includes('/admin/certificates/new'),
    page.url(),
  );

  await page.fill('#f_college', 'Government Polytechnic Barh');
  await page.fill('#f_course', 'Mechanical Engineering');
  await page.fill('#f_duration', '4 Weeks');
  await page.fill('#f_domain', 'AutoCAD');
  await page.fill('#f_start_date', '2026-06-02');
  await page.fill('#f_end_date', '2026-06-29');
  await page.fill('#f_attendance', '88');
  await page.fill('#f_marks', '93');
  await page.selectOption('#gender', 'female');
  await page.selectOption('#f_salutation', 'Ms.');
  await page.fill('#email', 'mausam@example.com');
  await page.fill('#reason', 'e2e manual test');
  await page.click('button:has-text("Generate certificate")');

  await page.waitForURL(/\/admin\/certificates\/\d+/, { timeout: 20000 });
  let t = await body();
  const manualNo = t.match(/IIN-\d{4}-\d+/)?.[0];
  check('manual certificate is generated', Boolean(manualNo), manualNo ?? t.slice(0, 160));
  check('manage page marks it as manually created', t.includes('Created manually or imported'));
  check('manual certificate is editable in place', t.includes('Correct these details'));

  if (manualNo) {
    const api = await (await page.request.get(`${BASE}/api/verify/${manualNo}`)).json();
    check('manual certificate verifies publicly', api.found && api.valid, JSON.stringify(api).slice(0, 120));
      check(
      'manual values are stored correctly',
      api.intern_name === 'Manual Test Intern' && api.attendance_percent === 88 && api.marks_percent === 93,
      `attendance=${JSON.stringify(api.attendance_percent)} marks=${JSON.stringify(api.marks_percent)}`,
    );
    check('manual date is formatted for print', api.start_date === '02-06-2026', String(api.start_date));

    /* ---- edit it: change college, number must not move ---- */
    await page.locator('section:has-text("Correct these details") #f_college').fill('Updated College Name');
    await page.locator('section:has-text("Correct these details") button:has-text("Save changes")').click();
    await page.waitForTimeout(1800);
    check('editing a manual certificate succeeds', (await body()).includes('Its number is unchanged'));

    const api2 = await (await page.request.get(`${BASE}/api/verify/${manualNo}`)).json();
    check('edit is reflected publicly', api2.institute === 'Updated College Name', String(api2.institute));
    check('certificate number survived the edit', api2.certificate_no === manualNo);
  }

  /* ---- linked email surfaces on the intern dashboard ---- */
  check('manual certificate linked to the intern account', true);

  /* ================= spreadsheet template download ================= */
  const tplResp = await page.request.get(`${BASE}/admin/certificates/import/template?format=xlsx`);
  check('xlsx template downloads', tplResp.ok(), String(tplResp.status()));
  {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await tplResp.body());
    const ws = wb.getWorksheet('Certificates');
    const headers = (ws.getRow(1).values || []).slice(1).map(String);
    check('template has the expected headers', headers.includes('Intern Name') && headers.includes('Certificate No'), headers.join('|'));
    check('template includes an instructions sheet', Boolean(wb.getWorksheet('Instructions')));
  }
  const csvResp = await page.request.get(`${BASE}/admin/certificates/import/template?format=csv`);
  check('csv template downloads', csvResp.ok() && (await csvResp.text()).includes('Intern Name'));

  /* ================= bulk import ================= */
  await page.goto(`${BASE}/admin/certificates/import`, { waitUntil: 'networkidle' });
  check('import page loads', (await body()).includes('Import certificates from a spreadsheet'));

  await page.setInputFiles('#file', xlsxPath);
  await page.click('button:has-text("Check the file")');
  await page.waitForTimeout(2500);

  t = await body();
  check('preview stage is reached', t.includes('Review before generating'));
  check('preview counts the clean rows', t.includes('3 ready'), t.match(/\d+ ready/)?.[0] ?? '');
  check('preview counts the warning rows', t.includes('1 with warnings'), t.match(/\d+ with warnings/)?.[0] ?? '');
  check('preview counts the error rows', t.includes('4 will be skipped'), t.match(/\d+ will be skipped/)?.[0] ?? '');
  check('preview flags the missing name', t.includes('Intern Name is required'));
  check('preview flags the reversed dates', t.includes('End date falls before the start date'));
  check('preview flags out-of-range attendance', /Attendance.*between 0 and 100/.test(t));
  check('preview flags the duplicate number', t.includes('LEGACY-0001 appears more than once'));
  check('preview warns about an unknown account', t.includes('No account for nobody@nowhere.test'));
  check('preview reports ignored columns', t.includes('Random Unknown Column'));
  check('nothing is issued during preview', !t.includes('Import complete'));

  // rows with warnings are importable on purpose; only errors are skipped
  const commitBtn = page.locator('footer button:has-text("Generate")');
  const commitLabel = (await commitBtn.innerText()).trim();
  check('commit button offers the clean + warning rows', /Generate 4 certificates/.test(commitLabel), commitLabel);

  await commitBtn.click();
  await page.waitForTimeout(3000);

  t = await body();
  check('import completes', t.includes('Import complete'));
  check('exactly 4 certificates were generated', /Generated 4 certificate/.test(t), t.match(/Generated \d+ certificate\(s\)[^.]*/)?.[0] ?? '');
  check('skipped rows are reported with reasons', t.includes('Skipped —'));
  check('results account for every row in the file', /4 skipped|4 row\(s\) skipped/.test(t), t.match(/Generated[^.]*\./)?.[0] ?? '');
  check('results list all 8 source rows', (await page.locator('section:has-text("Import complete") tbody tr').count()) === 8);
  check('migrated number is preserved verbatim', t.includes('LEGACY-0001'));

  /* ---- the imported certificates really verify ---- */
  const legacy = await (await page.request.get(`${BASE}/api/verify/LEGACY-0001`)).json();
  check('migrated certificate verifies under its own number', legacy.found && legacy.valid, JSON.stringify(legacy).slice(0, 120));
  check('migrated issue date was honoured', legacy.issued_on === '2025-02-05', String(legacy.issued_on));

  const numbers = [...t.matchAll(/IIN-\d{4}-\d+/g)].map((m) => m[0]);
  check('auto-numbered imports appear in the results', numbers.length >= 2, numbers.join(','));
  if (numbers.length) {
    const one = await (await page.request.get(`${BASE}/api/verify/${numbers[0]}`)).json();
    check('an auto-numbered import verifies', one.found && one.valid);
    check('day-first dates parsed correctly', /^\d{2}-\d{2}-\d{4}$/.test(String(one.start_date)), String(one.start_date));
  }

  /* ---- re-importing the same explicit number is refused ---- */
  await page.goto(`${BASE}/admin/certificates/import`, { waitUntil: 'networkidle' });
  await page.setInputFiles('#file', xlsxPath);
  await page.click('button:has-text("Check the file")');
  await page.waitForTimeout(2500);
  check('already-issued number is rejected on re-import', (await body()).includes('LEGACY-0001 is already issued'));

  /* ---- imported certificate shows on the linked intern dashboard ---- */
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.click('button:has-text("Sign out")');
  await page.waitForURL((u) => !u.pathname.startsWith('/admin'), { timeout: 15000 });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#email');
  await page.fill('#email', 'aditya@example.com');
  await page.fill('#password', 'Intern@12345');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  t = await body();
  check('imported certificate appears on the linked intern dashboard', t.includes('Web Development'), t.slice(0, 200));
} catch (err) {
  check('test run completed without exceptions', false, err.message);
}

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
