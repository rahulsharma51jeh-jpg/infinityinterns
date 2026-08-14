import QRCode from 'qrcode';
import { db, audit, getSetting, setSetting } from './db';
import { normalizeConfig, type TemplateConfig } from './template';
import { formatDate, pronouns, type CertData } from './render';

export interface ApplicationRow {
  id: number;
  user_id: number;
  full_name: string;
  salutation: string;
  gender: string;
  college: string;
  course: string;
  email: string;
  phone: string;
  duration: string;
  mode: string;
  domain: string;
  start_date: string | null;
  end_date: string | null;
  attendance: number | null;
  marks: number | null;
  project_title: string;
  mentor_name: string;
  extra: string;
  status: string;
  admin_note: string;
}

export interface CertificateRow {
  id: number;
  cert_no: string;
  application_id: number | null;
  user_id: number | null;
  template_id: number;
  data: string;
  status: 'active' | 'revoked';
  revoke_reason: string;
  issued_on: string;
  verify_count: number;
  last_verified: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export function getTemplate(id?: number): { id: number; name: string; config: TemplateConfig } {
  const row = (
    id
      ? db.prepare('SELECT id, name, config FROM templates WHERE id = ?').get(id)
      : db.prepare('SELECT id, name, config FROM templates WHERE is_default = 1 ORDER BY id LIMIT 1').get()
  ) as { id: number; name: string; config: string } | undefined;

  if (!row) {
    const fallback = db.prepare('SELECT id, name, config FROM templates ORDER BY id LIMIT 1').get() as
      | { id: number; name: string; config: string }
      | undefined;
    if (!fallback) throw new Error('No certificate template exists. Run `npm run seed`.');
    return { id: fallback.id, name: fallback.name, config: normalizeConfig(JSON.parse(fallback.config)) };
  }
  return { id: row.id, name: row.name, config: normalizeConfig(JSON.parse(row.config)) };
}

/* ------------------------------------------------------------------ */
/* Certificate numbers                                                 */
/* ------------------------------------------------------------------ */

/** Expand {YEAR} {YY} {MONTH} {SEQ} {RAND} tokens; retries until unique. */
export function generateCertNo(format: string): string {
  const now = new Date();
  for (let attempt = 0; attempt < 25; attempt++) {
    const seq = Number(getSetting('cert_seq', '1000')) + 1;
    setSetting('cert_seq', String(seq));

    const candidate = format
      .replace(/\{YEAR\}/g, String(now.getFullYear()))
      .replace(/\{YY\}/g, String(now.getFullYear()).slice(-2))
      .replace(/\{MONTH\}/g, String(now.getMonth() + 1).padStart(2, '0'))
      .replace(/\{SEQ\}/g, String(seq).padStart(5, '0'))
      .replace(/\{RAND\}/g, randomToken(4))
      .toUpperCase();

    const clash = db.prepare('SELECT 1 FROM certificates WHERE cert_no = ?').get(candidate);
    if (!clash) return candidate;
  }
  throw new Error('Unable to allocate a unique certificate number');
}

function randomToken(len: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/* ------------------------------------------------------------------ */
/* Field resolution                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build the frozen data snapshot for a certificate: pull each template field
 * from its source column on the application, then add computed placeholders.
 */
export function buildCertData(
  app: ApplicationRow,
  cfg: TemplateConfig,
  certNo: string,
  issuedOn: string,
  baseUrl: string,
): CertData {
  const extra = safeJson(app.extra);
  const record = app as unknown as Record<string, unknown>;
  const data: CertData = {};

  for (const f of cfg.fields) {
    let raw: unknown;
    if (f.source && f.source in record) raw = record[f.source];
    else if (f.key in extra) raw = extra[f.key];
    else raw = f.defaultValue ?? '';

    data[f.key] = f.type === 'date' ? formatDate(raw as string) : ((raw ?? '') as string | number);
  }

  const p = pronouns(app.gender);
  data.cert_no = certNo;
  data.issue_date = formatDate(issuedOn);
  data.year = new Date(issuedOn).getFullYear();
  data.pronoun_subject = p.subject;
  data.pronoun_object = p.object;
  data.pronoun_possessive = p.possessive;
  data.verify_url = `${baseUrl}/verify/${encodeURIComponent(certNo)}`;
  data.gender = app.gender;
  data.email = app.email;

  return data;
}

function safeJson(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s || '{}');
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Issuing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Canonical public origin for building verify URLs and QR payloads.
 * Priority: explicit env override → real request host (correct behind a proxy)
 * → the site_url setting → localhost.
 */
export function baseUrlFrom(h?: Headers | string | null): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');

  let host: string | null = null;
  let proto: string | null = null;

  if (typeof h === 'string') {
    host = h;
  } else if (h) {
    host = h.get('x-forwarded-host') || h.get('host');
    proto = h.get('x-forwarded-proto');
  }

  if (host) {
    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|169\.254\.)/.test(host);
    return `${proto || (local ? 'http' : 'https')}://${host}`;
  }

  const setting = getSetting('site_url', '');
  return setting ? setting.replace(/\/$/, '') : 'http://localhost:3000';
}

/**
 * Issue (or return the existing) certificate for an application.
 * Idempotent: a second call returns the certificate already on file.
 */
export function issueCertificate(opts: {
  applicationId: number;
  actorId: number | null;
  templateId?: number;
  baseUrl: string;
  issuedOn?: string;
}): { certificate: CertificateRow; created: boolean } {
  const existing = db
    .prepare('SELECT * FROM certificates WHERE application_id = ?')
    .get(opts.applicationId) as CertificateRow | undefined;
  if (existing) return { certificate: existing, created: false };

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(opts.applicationId) as
    | ApplicationRow
    | undefined;
  if (!app) throw new Error(`Application ${opts.applicationId} not found`);

  const tpl = getTemplate(opts.templateId);
  const issuedOn = opts.issuedOn || new Date().toISOString().slice(0, 10);
  const certNo = generateCertNo(tpl.config.certNo.format);
  const data = buildCertData(app, tpl.config, certNo, issuedOn, opts.baseUrl);

  const info = db
    .prepare(
      `INSERT INTO certificates (cert_no, application_id, user_id, template_id, data, issued_on, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(certNo, app.id, app.user_id, tpl.id, JSON.stringify(data), issuedOn, opts.actorId);

  audit(opts.actorId, 'certificate.issue', 'certificate', info.lastInsertRowid as number, certNo);

  const certificate = db.prepare('SELECT * FROM certificates WHERE id = ?').get(info.lastInsertRowid) as CertificateRow;
  return { certificate, created: true };
}

/* ------------------------------------------------------------------ */
/* QR                                                                  */
/* ------------------------------------------------------------------ */

export async function qrDataUrl(text: string, color = '#0f2547', width = 320): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width,
    color: { dark: color, light: '#ffffff' },
  });
}

export async function qrPngBuffer(text: string, color = '#0f2547', width = 512): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width,
    type: 'png',
    color: { dark: color, light: '#ffffff' },
  });
}


/* ------------------------------------------------------------------ */
/* Lookup + view assembly                                             */
/* ------------------------------------------------------------------ */

/** Case/whitespace tolerant lookup so pasted certificate numbers just work. */
export function findCertificate(certNo: string): CertificateRow | undefined {
  const clean = certNo.trim().replace(/\s+/g, '').toUpperCase();
  if (!clean) return undefined;
  return db.prepare('SELECT * FROM certificates WHERE UPPER(cert_no) = ?').get(clean) as CertificateRow | undefined;
}

export interface CertificateView {
  cert: CertificateRow;
  templateName: string;
  config: TemplateConfig;
  data: CertData;
  qr: string;
  verifyUrl: string;
}

/**
 * Everything needed to render an issued certificate: the frozen data snapshot,
 * its template, and a freshly generated QR pointing at the live verify URL.
 */
export async function certificateView(cert: CertificateRow, baseUrl: string): Promise<CertificateView> {
  const tpl = getTemplate(cert.template_id);
  const data = JSON.parse(cert.data) as CertData;

  // The QR always reflects the *current* deployment URL, even if the snapshot
  // was taken when the site lived elsewhere.
  const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(cert.cert_no)}`;
  data.verify_url = verifyUrl;
  data.cert_no = cert.cert_no;

  const qr = await qrDataUrl(verifyUrl, tpl.config.qr.color, Math.max(240, tpl.config.qr.size * 4));

  return { cert, templateName: tpl.name, config: tpl.config, data, qr, verifyUrl };
}

/** Record a verification attempt and bump the counter on a hit. */
export function logVerification(certNo: string, found: boolean, source = 'web', ip = '', ua = ''): void {
  db.prepare('INSERT INTO verification_log (cert_no, found, source, ip, user_agent) VALUES (?, ?, ?, ?, ?)').run(
    certNo,
    found ? 1 : 0,
    source,
    ip.slice(0, 60),
    ua.slice(0, 250),
  );
  if (found) {
    db.prepare(
      "UPDATE certificates SET verify_count = verify_count + 1, last_verified = datetime('now') WHERE UPPER(cert_no) = ?",
    ).run(certNo.trim().toUpperCase());
  }
}

/** Sample data for previewing a template that has no real certificate yet. */
export function sampleData(cfg: TemplateConfig, baseUrl: string): CertData {
  const demo: Record<string, string> = {
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
  };

  const data: CertData = {};
  for (const f of cfg.fields) data[f.key] = demo[f.key] ?? f.defaultValue ?? `[${f.label}]`;

  const certNo = 'IIN-2026-PREVIEW';
  data.cert_no = certNo;
  data.issue_date = formatDate(new Date().toISOString().slice(0, 10));
  data.year = new Date().getFullYear();
  const p = pronouns('female');
  data.pronoun_subject = p.subject;
  data.pronoun_object = p.object;
  data.pronoun_possessive = p.possessive;
  data.verify_url = `${baseUrl}/verify/${certNo}`;
  return data;
}


/* ------------------------------------------------------------------ */
/* Admin lifecycle operations                                          */
/* ------------------------------------------------------------------ */

/**
 * Rebuild an issued certificate's data snapshot from the current application
 * (and optionally move it to a different template). The certificate number is
 * deliberately preserved so existing printed copies and QR codes keep working.
 */
export function refreshCertificateData(opts: {
  certificateId: number;
  actorId: number | null;
  baseUrl: string;
  templateId?: number;
}): CertificateRow {
  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(opts.certificateId) as
    | CertificateRow
    | undefined;
  if (!cert) throw new Error('Certificate not found');
  if (!cert.application_id) throw new Error('This certificate is not linked to an application, so it cannot be rebuilt');

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(cert.application_id) as
    | ApplicationRow
    | undefined;
  if (!app) throw new Error('The linked application no longer exists');

  const tpl = getTemplate(opts.templateId ?? cert.template_id);
  const data = buildCertData(app, tpl.config, cert.cert_no, cert.issued_on, opts.baseUrl);

  db.prepare("UPDATE certificates SET data = ?, template_id = ?, updated_at = datetime('now') WHERE id = ?").run(
    JSON.stringify(data),
    tpl.id,
    cert.id,
  );

  audit(opts.actorId, 'certificate.refresh', 'certificate', cert.id, cert.cert_no);
  return db.prepare('SELECT * FROM certificates WHERE id = ?').get(cert.id) as CertificateRow;
}

export function revokeCertificate(certificateId: number, reason: string, actorId: number | null): void {
  const cert = db.prepare('SELECT cert_no FROM certificates WHERE id = ?').get(certificateId) as
    | { cert_no: string }
    | undefined;
  if (!cert) throw new Error('Certificate not found');

  db.prepare("UPDATE certificates SET status = 'revoked', revoke_reason = ?, updated_at = datetime('now') WHERE id = ?").run(
    reason,
    certificateId,
  );
  audit(actorId, 'certificate.revoke', 'certificate', certificateId, `${cert.cert_no}: ${reason}`);
}

export function restoreCertificate(certificateId: number, actorId: number | null): void {
  db.prepare("UPDATE certificates SET status = 'active', revoke_reason = '', updated_at = datetime('now') WHERE id = ?").run(
    certificateId,
  );
  audit(actorId, 'certificate.restore', 'certificate', certificateId);
}
