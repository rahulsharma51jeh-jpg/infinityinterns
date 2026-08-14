/**
 * Screenshot admin pages that require a session.
 *   node scripts/shot-admin.mjs <baseUrl> <outDir>
 */
import { chromium } from 'playwright';
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || '.';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 1200 } })).newPage();
page.on('dialog', (d) => d.accept());

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('#email', 'admin@infinityinterns.com');
await page.fill('#password', 'Admin@12345');
await page.click('button[type=submit]');
await page.waitForURL(/\/admin/, { timeout: 15000 });

const shot = async (url, name, wait = 1200) => {
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  console.log(`saved ${name}`);
};

await shot('/admin/certificates/new', '21-manual-form.png');
await shot('/admin/certificates/import', '22-import-step1.png');

/* preview stage, with a couple of deliberately broken rows */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ii-shot-'));
const file = path.join(tmp, 'batch.xlsx');
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Certificates');
ws.addRow(['Salutation', 'Intern Name', 'College / Institute', 'Duration', 'Mode', 'Domain / Technology', 'Start Date', 'End Date', 'Attendance %', 'Marks %', 'Email', 'Gender']);
ws.addRow(['Mr.', 'Ravi Kumar', 'NIT Patna', '6 Weeks', 'Online', 'Web Development', '2026-05-04', '2026-06-14', 94, 88, 'aditya@example.com', 'male']);
ws.addRow(['Ms.', 'Priya Singh', 'IIT Patna', '4 Weeks', 'Online', 'AutoCAD', '02-06-2026', '29-06-2026', '88', '93%', '', 'female']);
ws.addRow(['Mr.', '', 'BIT Mesra', '4 Weeks', 'Online', 'AutoCAD', '2026-06-01', '2026-06-28', 80, 75, '', 'male']);
ws.addRow(['Mr.', 'Amit Verma', 'MIT Muzaffarpur', '4 Weeks', 'Online', 'STAAD Pro', '2026-07-30', '2026-07-01', 85, 80, '', 'male']);
ws.addRow(['Ms.', 'Neha Gupta', 'GP Gaya', '4 Weeks', 'Online', 'Cyber Security', '2026-06-01', '2026-06-28', 150, 70, 'nobody@nowhere.test', 'unknown']);
await wb.xlsx.writeFile(file);

await page.goto(`${BASE}/admin/certificates/import`, { waitUntil: 'networkidle' });
await page.setInputFiles('#file', file);
await page.click('button:has-text("Check the file")');
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, '23-import-preview.png'), fullPage: true });
console.log('saved 23-import-preview.png');

fs.rmSync(tmp, { recursive: true, force: true });
await browser.close();
