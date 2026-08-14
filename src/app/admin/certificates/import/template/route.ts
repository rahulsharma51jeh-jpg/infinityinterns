import ExcelJS from 'exceljs';
import { getSession } from '@/lib/auth';
import { getTemplate } from '@/lib/certificate';
import { EXTRA_COLUMNS } from '@/lib/import';

/**
 * Blank import workbook, with headers derived from the chosen certificate
 * template so the columns always match what the importer expects.
 *   GET /admin/certificates/import/template?template=2&format=xlsx|csv
 */
export async function GET(req: Request) {
  const user = await getSession();
  if (!user || user.role !== 'admin') return new Response('Not authorised', { status: 403 });

  const url = new URL(req.url);
  const templateId = Number(url.searchParams.get('template')) || undefined;
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';

  const tpl = getTemplate(templateId);

  const columns = [
    ...tpl.config.fields.map((f) => ({
      header: f.label,
      key: f.key,
      required: f.required,
      hint:
        f.type === 'date'
          ? 'Date (dd-mm-yyyy)'
          : f.type === 'number'
            ? 'Number'
            : f.type === 'select'
              ? `One of: ${(f.options ?? []).join(' / ')}`
              : 'Text',
    })),
    ...EXTRA_COLUMNS.map((c) => ({ header: c.label, key: c.key, required: false, hint: c.hint })),
  ];

  const example: Record<string, string> = {
    salutation: 'Ms.',
    intern_name: 'Mausam Kumari',
    college: 'Government Polytechnic Barh',
    course: 'Mechanical Engineering',
    duration: '4 Weeks',
    mode: 'Online',
    domain: 'AutoCAD',
    start_date: '02-06-2026',
    end_date: '29-06-2026',
    attendance: '88',
    marks: '93',
    project_title: 'Isometric Assembly Drawing Set',
    mentor_name: 'Er. Vikash Singh',
    email: 'mausam@example.com',
    gender: 'female',
    issued_on: '',
    certificate_no: '',
  };

  const exampleRow = columns.map((c) => example[c.key] ?? '');
  const fileBase = `infinity-interns-certificate-import`;

  if (format === 'csv') {
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const csv = [columns.map((c) => esc(c.header)).join(','), exampleRow.map((v) => esc(String(v))).join(',')].join('\r\n');

    return new Response(`\uFEFF${csv}`, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${fileBase}.csv"`,
        'cache-control': 'no-store',
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Infinity Interns';
  wb.created = new Date();

  const ws = wb.addWorksheet('Certificates');
  ws.addRow(columns.map((c) => c.header));
  ws.addRow(exampleRow);

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.height = 22;
  header.alignment = { vertical: 'middle' };
  header.eachCell((cell, col) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: columns[col - 1]?.required ? 'FF16295E' : 'FF4F72C4' },
    };
    const c = columns[col - 1];
    if (c) cell.note = `${c.required ? 'Required. ' : 'Optional. '}${c.hint}`;
  });

  // the example row is guidance, not data — make that visually obvious
  const sample = ws.getRow(2);
  sample.font = { italic: true, color: { argb: 'FF9AA3B2' } };

  ws.columns.forEach((col, i) => {
    const headerLen = String(columns[i]?.header ?? '').length;
    const valueLen = String(exampleRow[i] ?? '').length;
    col.width = Math.min(34, Math.max(14, headerLen + 4, valueLen + 4));
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // a second sheet documenting each column
  const guide = wb.addWorksheet('Instructions');
  guide.addRow(['Column', 'Required', 'Expected value']);
  guide.getRow(1).font = { bold: true };
  for (const c of columns) guide.addRow([c.header, c.required ? 'Yes' : 'Optional', c.hint]);
  guide.addRow([]);
  guide.addRow(['Notes:']);
  guide.addRow(['• Delete the grey example row before uploading.']);
  guide.addRow(['• Keep the header row exactly as it is.']);
  guide.addRow(['• Leave "Certificate No" blank unless migrating an existing certificate.']);
  guide.addRow(['• "Email" links the certificate to an existing intern account.']);
  guide.columns.forEach((col, i) => (col.width = [30, 12, 60][i] ?? 20));

  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${fileBase}.xlsx"`,
      'cache-control': 'no-store',
    },
  });
}
