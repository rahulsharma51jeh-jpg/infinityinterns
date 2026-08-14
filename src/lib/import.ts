import ExcelJS from 'exceljs';
import { db } from './db';
import type { FieldDef, TemplateConfig } from './template';
import { EXTRA_COLUMNS, MAX_ROWS, type ParsedRow, type ParseResult, type RowStatus } from './importColumns';

/**
 * Spreadsheet ingest for bulk certificate generation.
 *
 * Parsing is deliberately server-side: the browser never decides what is valid.
 * The flow is parse -> validate -> preview -> commit, so an admin always sees
 * exactly what will be issued before anything is written.
 */

export {
  MAX_ROWS,
  MAX_FILE_BYTES,
  EXTRA_COLUMNS,
  summarise,
  type RowStatus,
  type ParsedRow,
  type ParseResult,
} from './importColumns';

/* ------------------------------------------------------------------ */
/* Header matching                                                     */
/* ------------------------------------------------------------------ */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Every spelling we accept for a given column. */
function aliases(key: string, label: string): string[] {
  const out = [key, label, key.replace(/_/g, ' ')];
  const extra: Record<string, string[]> = {
    intern_name: ['name', 'student name', 'candidate name', 'full name'],
    college: ['institute', 'institution', 'college name', 'school'],
    course: ['branch', 'stream', 'department'],
    domain: ['technology', 'subject', 'training domain', 'internship domain'],
    attendance: ['attendance percent', 'attendance %'],
    marks: ['marks percent', 'marks %', 'score'],
    start_date: ['from', 'from date'],
    end_date: ['to', 'to date'],
    salutation: ['title', 'prefix'],
    certificate_no: ['certificate number', 'cert no'],
    issued_on: ['issue date', 'date of issue'],
  };
  return [...out, ...(extra[key] ?? [])];
}

function buildHeaderMap(cfg: TemplateConfig): Map<string, string> {
  const map = new Map<string, string>();
  const add = (key: string, label: string) => {
    for (const a of aliases(key, label)) {
      const n = norm(a);
      if (n && !map.has(n)) map.set(n, key);
    }
  };
  for (const f of cfg.fields) add(f.key, f.label);
  for (const c of EXTRA_COLUMNS) add(c.key, c.label);
  return map;
}

/* ------------------------------------------------------------------ */
/* Cell coercion                                                       */
/* ------------------------------------------------------------------ */

/** Excel stores dates as days since 1899-12-30. */
function serialToIso(serial: number): string | null {
  if (serial < 1 || serial > 200000) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Normalise a date to ISO yyyy-mm-dd. Accepts Date objects, Excel serials and
 * the written forms people actually type, treating ambiguous d/m vs m/d as
 * day-first (the Indian convention, matching the printed certificate).
 */
export function toIsoDate(input: unknown): string | null {
  if (input === null || input === undefined || input === '') return null;

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input.toISOString().slice(0, 10);
  }
  if (typeof input === 'number') return serialToIso(input);

  const s = String(input).trim();
  if (!s) return null;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return isRealDate(y, m, d) ? iso(y, m, d) : null;
  }

  const m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2}|\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const mon = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    return isRealDate(year, mon, day) ? iso(year, mon, day) : null;
  }

  if (/^\d+(\.\d+)?$/.test(s)) return serialToIso(Number(s));

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function isRealDate(y: number, m: number, d: number): boolean {
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Flatten whatever ExcelJS hands back into a trimmed string. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v.text === 'string') return v.text.trim();
    if ('result' in v) return cellText(v.result); // formula cell
    if (Array.isArray(v.richText)) {
      return (v.richText as { text: string }[]).map((r) => r.text).join('').trim();
    }
    if (typeof v.hyperlink === 'string') return String(v.text ?? v.hyperlink).trim();
    return '';
  }
  return String(value).trim();
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/** RFC 4180 CSV/TSV reader — quoted fields, doubled quotes, CR/LF endings. */
export function parseDelimited(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;

  // strip a UTF-8 BOM, which Excel loves to add
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && field === '') {
      quoted = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      endField();
      i++;
      continue;
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      endRow();
      i++;
      continue;
    }
    if (ch === '\n') {
      endRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (field !== '' || row.length) endRow();
  return rows;
}

/* ------------------------------------------------------------------ */
/* Sheet -> grid                                                       */
/* ------------------------------------------------------------------ */

/** Read the first worksheet of an .xlsx buffer into a string grid. */
async function xlsxToGrid(buf: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const ws = wb.worksheets.find((w) => w.actualRowCount > 0) ?? wb.worksheets[0];
  if (!ws) return [];

  const grid: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    // row.values is 1-indexed with a leading hole
    const values = row.values as unknown[];
    for (let c = 1; c < values.length; c++) cells.push(cellText(values[c]));
    if (cells.some((c) => c !== '')) grid.push(cells);
  });
  return grid;
}

export async function fileToGrid(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
    const text = await file.text();
    return parseDelimited(text, name.endsWith('.tsv') ? '\t' : ',');
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    return xlsxToGrid(await file.arrayBuffer());
  }

  if (name.endsWith('.xls')) {
    throw new Error(
      'The old .xls format is not supported. Open the file in Excel and use “Save As → Excel Workbook (.xlsx)” or “CSV”.',
    );
  }

  throw new Error('Unsupported file type. Upload a .xlsx or .csv file.');
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Turn a raw grid into validated rows. Every row is checked independently so a
 * single bad row never blocks the rest of the import.
 */
export function validateGrid(grid: string[][], cfg: TemplateConfig): ParseResult {
  if (grid.length === 0) {
    return { rows: [], headers: [], unmatched: [], missingRequired: [], truncated: false };
  }

  const headerMap = buildHeaderMap(cfg);
  const rawHeaders = grid[0];
  const unmatched: string[] = [];

  // column index -> canonical key
  const columns = new Map<number, string>();
  rawHeaders.forEach((h, idx) => {
    const key = headerMap.get(norm(h));
    if (key && ![...columns.values()].includes(key)) columns.set(idx, key);
    else if (h.trim()) unmatched.push(h.trim());
  });

  const present = new Set(columns.values());
  const missingRequired = cfg.fields
    .filter((f) => f.required && !present.has(f.key) && !f.defaultValue)
    .map((f) => f.label);

  const body = grid.slice(1);
  const truncated = body.length > MAX_ROWS;
  const limited = body.slice(0, MAX_ROWS);

  // Explicit numbers must be unique against the database and within the file.
  const seenNumbers = new Set<string>();
  const seenPeople = new Set<string>();

  const rows: ParsedRow[] = limited.map((cells, i) => {
    const line = i + 2; // +1 for the header, +1 for 1-based counting
    const values: Record<string, string> = {};
    for (const [idx, key] of columns) values[key] = (cells[idx] ?? '').trim();

    const messages: string[] = [];
    let status: RowStatus = 'ok';
    const fail = (m: string) => {
      messages.push(m);
      status = 'error';
    };
    const warn = (m: string) => {
      messages.push(m);
      if (status === 'ok') status = 'warn';
    };

    // template-defined columns
    for (const f of cfg.fields) {
      const raw = values[f.key] ?? '';

      if (!raw) {
        if (f.defaultValue) values[f.key] = f.defaultValue;
        else if (f.required) fail(`${f.label} is required`);
        continue;
      }

      if (f.type === 'date') {
        const isoDate = toIsoDate(raw);
        if (!isoDate) fail(`${f.label} “${raw}” is not a date we recognise`);
        else values[f.key] = isoDate;
      } else if (f.type === 'number') {
        const n = Number(String(raw).replace('%', '').trim());
        if (!Number.isFinite(n)) fail(`${f.label} “${raw}” is not a number`);
        else if (isPercentField(f) && (n < 0 || n > 100)) fail(`${f.label} must be between 0 and 100 (got ${n})`);
        else values[f.key] = String(n);
      } else if (f.type === 'select' && f.options?.length) {
        const hit = f.options.find((o) => norm(o) === norm(raw));
        if (hit) values[f.key] = hit;
        else warn(`${f.label} “${raw}” is not one of ${f.options.join(' / ')} — kept as typed`);
      }
    }

    // start/end sanity
    if (values.start_date && values.end_date && values.start_date > values.end_date) {
      fail('End date falls before the start date');
    }

    // gender
    if (values.gender) {
      const g = norm(values.gender);
      const mapped =
        g.startsWith('m') ? 'male' : g.startsWith('f') ? 'female' : g.startsWith('o') || g.startsWith('n') ? 'other' : '';
      if (!mapped) warn(`Gender “${values.gender}” not understood — using neutral he/she wording`);
      values.gender = mapped || 'other';
    } else {
      values.gender = 'other';
    }

    // issue date
    if (values.issued_on) {
      const isoDate = toIsoDate(values.issued_on);
      if (!isoDate) fail(`Issue Date “${values.issued_on}” is not a date we recognise`);
      else values.issued_on = isoDate;
    }

    // email -> intern account
    if (values.email) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
        warn(`“${values.email}” is not a valid email — certificate will not be linked to an account`);
        values.email = '';
      } else {
        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(values.email.toLowerCase()) as
          | { id: number }
          | undefined;
        if (!user) warn(`No account for ${values.email} — issuing unlinked; it will not appear on a dashboard`);
      }
    }

    // explicit certificate number
    if (values.certificate_no) {
      const no = values.certificate_no.toUpperCase().replace(/\s+/g, '');
      values.certificate_no = no;
      if (seenNumbers.has(no)) fail(`Certificate number ${no} appears more than once in this file`);
      seenNumbers.add(no);
      const clash = db.prepare('SELECT 1 FROM certificates WHERE UPPER(cert_no) = ?').get(no);
      if (clash) fail(`Certificate number ${no} is already issued`);
    }

    // same person + same domain twice
    const fingerprint = `${norm(values.intern_name ?? '')}|${norm(values.domain ?? '')}|${values.start_date ?? ''}`;
    if (values.intern_name && values.domain) {
      if (seenPeople.has(fingerprint)) {
        warn('Looks like a duplicate of an earlier row in this file (same name, domain and start date)');
      }
      seenPeople.add(fingerprint);
    }

    return { line, values, status, messages };
  });

  return { rows, headers: rawHeaders.map((h) => h.trim()), unmatched, missingRequired, truncated };
}

function isPercentField(f: FieldDef): boolean {
  return /attendance|marks|percent|score/i.test(f.key) || /%/.test(f.label);
}

