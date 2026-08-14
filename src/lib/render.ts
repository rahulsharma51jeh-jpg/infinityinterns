import type { TemplateConfig } from './template';

export type CertData = Record<string, string | number | null | undefined>;

/** dd-MM-yyyy, matching the printed artwork. */
export function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function pronouns(gender?: string | null) {
  switch ((gender || '').toLowerCase()) {
    case 'male':
      return { subject: 'he', object: 'him', possessive: 'his' };
    case 'female':
      return { subject: 'she', object: 'her', possessive: 'her' };
    default:
      return { subject: 'he/she', object: 'him/her', possessive: 'his/her' };
  }
}

/** Replace every {{placeholder}} in `input` from `data`. Unknown keys collapse to ''. */
export function interpolate(input: string, data: CertData): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = data[key];
    return v === null || v === undefined ? '' : String(v);
  });
}

/** Split a string on **bold** markers into typed segments. */
export function boldSegments(text: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false });
  return out.length ? out : [{ text, bold: false }];
}

/** Every placeholder key referenced anywhere in the template. */
export function placeholdersUsed(cfg: TemplateConfig): string[] {
  const seen = new Set<string>();
  const scan = (s: string) => {
    for (const m of s.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) seen.add(m[1]);
  };
  cfg.body.blocks.forEach((b) => scan(b.content));
  scan(cfg.title.text);
  scan(cfg.title.subtitle);
  scan(cfg.footerNote.text);
  scan(cfg.signature.company);
  return [...seen];
}
