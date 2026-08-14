/**
 * Client-safe half of the import module: column metadata, limits and row types.
 * Kept separate from `import.ts` because that file pulls in `exceljs` and the
 * database, neither of which belongs in a browser bundle.
 */

export const MAX_ROWS = 500;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Columns understood in addition to the template's own data columns. */
export const EXTRA_COLUMNS = [
  {
    key: 'email',
    label: 'Email',
    hint: 'Links the certificate to an existing intern account so it shows on their dashboard',
  },
  { key: 'gender', label: 'Gender', hint: 'male / female / other — decides he/she wording' },
  { key: 'issued_on', label: 'Issue Date', hint: 'Defaults to today' },
  {
    key: 'certificate_no',
    label: 'Certificate No',
    hint: 'Only to migrate an existing certificate; leave blank to auto-generate',
  },
] as const;

export type RowStatus = 'ok' | 'warn' | 'error';

export interface ParsedRow {
  /** 1-based row number in the source sheet, for error messages */
  line: number;
  values: Record<string, string>;
  status: RowStatus;
  messages: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  /** headers found in the file, in order */
  headers: string[];
  /** headers we could not match to any known column */
  unmatched: string[];
  /** known columns missing from the file */
  missingRequired: string[];
  truncated: boolean;
}

export function summarise(rows: ParsedRow[]) {
  return {
    total: rows.length,
    ok: rows.filter((r) => r.status === 'ok').length,
    warn: rows.filter((r) => r.status === 'warn').length,
    error: rows.filter((r) => r.status === 'error').length,
  };
}
