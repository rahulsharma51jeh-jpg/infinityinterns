'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db, audit, getSetting, setSetting } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import {
  baseUrlFrom,
  getTemplate,
  issueCertificate,
  issueManualCertificate,
  refreshCertificateData,
  restoreCertificate,
  revokeCertificate,
  updateManualCertificate,
} from '@/lib/certificate';
import { DEFAULT_TEMPLATE, normalizeConfig, type TemplateConfig } from '@/lib/template';
import { fileToGrid, toIsoDate, validateGrid } from '@/lib/import';
import { EXTRA_COLUMNS, MAX_FILE_BYTES, summarise, type ParsedRow } from '@/lib/importColumns';

export type ActionState = { error?: string; ok?: string };

/** Wraps an action so thrown errors surface in the UI instead of a 500 page. */
async function guard(fn: () => Promise<ActionState> | ActionState): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    // `redirect()` works by throwing — let those through untouched.
    if (e && typeof e === 'object' && 'digest' in e && String(e.digest).startsWith('NEXT_')) throw e;
    return { error: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}

/** Turn a Zod failure into a message that names the field at fault. */
function firstIssue(err: z.ZodError): string {
  const i = err.issues[0];
  const field = i.path.filter((p) => typeof p === 'string').join('.');
  const generic = /^required$/i.test(i.message);
  if (field && generic) return `“${field}” is required.`;
  return field ? `${field}: ${i.message}` : i.message;
}

function revalidateAdmin() {
  revalidatePath('/admin');
  revalidatePath('/admin/applications');
  revalidatePath('/admin/certificates');
  revalidatePath('/dashboard');
}

/* ================================================================== */
/* Applications                                                        */
/* ================================================================== */

const detailsSchema = z.object({
  id: z.coerce.number().int().positive(),
  full_name: z.string().trim().min(2, 'Full name is required'),
  salutation: z.enum(['Mr.', 'Ms.', 'Mrs.', 'Dr.']),
  gender: z.enum(['male', 'female', 'other']),
  college: z.string().trim().min(2, 'College / institute is required'),
  course: z.string().trim().max(120).optional().default(''),
  domain: z.string().trim().min(1, 'Domain is required'),
  duration: z.string().trim().min(1, 'Duration is required'),
  mode: z.enum(['Online', 'Offline', 'Hybrid']),
  start_date: z.string().trim().optional().default(''),
  end_date: z.string().trim().optional().default(''),
  attendance: z.union([z.coerce.number().min(0).max(100), z.literal('')]).optional(),
  marks: z.union([z.coerce.number().min(0).max(100), z.literal('')]).optional(),
  project_title: z.string().trim().max(200).optional().default(''),
  mentor_name: z.string().trim().max(120).optional().default(''),
  admin_note: z.string().trim().max(500).optional().default(''),
});

/** Save the values that get printed on the certificate. */
export async function saveApplicationDetails(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const v = parsed.data;

    db.prepare(
      `UPDATE applications SET
         full_name = ?, salutation = ?, gender = ?, college = ?, course = ?, domain = ?, duration = ?, mode = ?,
         start_date = ?, end_date = ?, attendance = ?, marks = ?, project_title = ?, mentor_name = ?, admin_note = ?
       WHERE id = ?`,
    ).run(
      v.full_name,
      v.salutation,
      v.gender,
      v.college,
      v.course ?? '',
      v.domain,
      v.duration,
      v.mode,
      v.start_date || null,
      v.end_date || null,
      v.attendance === '' || v.attendance === undefined ? null : v.attendance,
      v.marks === '' || v.marks === undefined ? null : v.marks,
      v.project_title ?? '',
      v.mentor_name ?? '',
      v.admin_note ?? '',
    /* id */ v.id,
    );

    audit(admin.id, 'application.update', 'application', v.id);
    revalidateAdmin();
    revalidatePath(`/admin/applications/${v.id}`);
    return { ok: 'Details saved.' };
  });
}

const reviewSchema = z.object({
  id: z.coerce.number().int().positive(),
  decision: z.enum(['approved', 'rejected', 'under_review', 'pending']),
  note: z.string().trim().max(500).optional().default(''),
});

/**
 * Approve / reject an application. Approving issues the certificate
 * automatically when the `auto_issue_on_approval` setting is on.
 */
export async function reviewApplication(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const { id, decision, note } = parsed.data;

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as
      | { id: number; attendance: number | null; marks: number | null; start_date: string | null; end_date: string | null }
      | undefined;
    if (!app) return { error: 'Application not found.' };

    if (decision === 'approved') {
      const missing: string[] = [];
      if (app.attendance === null) missing.push('attendance %');
      if (app.marks === null) missing.push('assessment marks %');
      if (!app.start_date) missing.push('start date');
      if (!app.end_date) missing.push('end date');
      if (missing.length) {
        return { error: `Fill in ${missing.join(', ')} before approving — these are printed on the certificate.` };
      }
    }

    db.prepare(
      "UPDATE applications SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?",
    ).run(decision, note ?? '', admin.id, id);
    audit(admin.id, `application.${decision}`, 'application', id, note ?? '');

    let message = `Application marked ${decision.replace('_', ' ')}.`;

    if (decision === 'approved' && getSetting('auto_issue_on_approval', '1') === '1') {
      const h = await headers();
      const { certificate, created } = issueCertificate({
        applicationId: id,
        actorId: admin.id,
        baseUrl: baseUrlFrom(h),
      });
      message = created
        ? `Approved. Certificate ${certificate.cert_no} generated automatically.`
        : `Approved. Certificate ${certificate.cert_no} was already on file.`;
    }

    revalidateAdmin();
    revalidatePath(`/admin/applications/${id}`);
    return { ok: message };
  });
}

/** Approve every selected application in one pass. */
export async function bulkApprove(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const ids = formData
      .getAll('ids')
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) return { error: 'Select at least one application.' };

    const h = await headers();
    const baseUrl = baseUrlFrom(h);
    const autoIssue = getSetting('auto_issue_on_approval', '1') === '1';

    let approved = 0;
    let issued = 0;
    const skipped: string[] = [];

    for (const id of ids) {
      const app = db.prepare('SELECT id, full_name, attendance, marks, start_date, end_date FROM applications WHERE id = ?').get(id) as
        | { id: number; full_name: string; attendance: number | null; marks: number | null; start_date: string | null; end_date: string | null }
        | undefined;
      if (!app) continue;

      if (app.attendance === null || app.marks === null || !app.start_date || !app.end_date) {
        skipped.push(app.full_name);
        continue;
      }

      db.prepare(
        "UPDATE applications SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?",
      ).run(admin.id, id);
      audit(admin.id, 'application.approved', 'application', id, 'bulk');
      approved++;

      if (autoIssue) {
        const { created } = issueCertificate({ applicationId: id, actorId: admin.id, baseUrl });
        if (created) issued++;
      }
    }

    revalidateAdmin();
    const parts = [`${approved} approved`, autoIssue ? `${issued} certificate(s) issued` : ''].filter(Boolean);
    if (skipped.length) {
      return {
        error: `${parts.join(', ')}. Skipped ${skipped.length} (incomplete records): ${skipped.join(', ')}.`,
      };
    }
    return { ok: `${parts.join(', ')}.` };
  });
}

/* ================================================================== */
/* Certificates                                                        */
/* ================================================================== */

export async function issueForApplication(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const id = Number(formData.get('application_id'));
    const templateId = Number(formData.get('template_id')) || undefined;
    if (!id) return { error: 'Missing application.' };

    const h = await headers();
    const { certificate, created } = issueCertificate({
      applicationId: id,
      actorId: admin.id,
      templateId,
      baseUrl: baseUrlFrom(h),
    });

    revalidateAdmin();
    revalidatePath(`/admin/applications/${id}`);
    return {
      ok: created
        ? `Certificate ${certificate.cert_no} generated.`
        : `Certificate ${certificate.cert_no} already exists for this application.`,
    };
  });
}

export async function refreshCertificate(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const id = Number(formData.get('certificate_id'));
    const templateId = Number(formData.get('template_id')) || undefined;
    if (!id) return { error: 'Missing certificate.' };

    const h = await headers();
    const cert = refreshCertificateData({
      certificateId: id,
      actorId: admin.id,
      baseUrl: baseUrlFrom(h),
      templateId,
    });

    revalidateAdmin();
    revalidatePath(`/verify/${cert.cert_no}`);
    return { ok: `Certificate ${cert.cert_no} rebuilt from the current application data.` };
  });
}

/**
 * Revoke or restore, behind a single action so the confirmation message survives
 * the status flip (the panel swaps its form when the status changes).
 */
export async function setCertificateStatus(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const id = Number(formData.get('certificate_id'));
    const intent = String(formData.get('intent') ?? '');
    if (!id) return { error: 'Missing certificate.' };

    const cert = db.prepare('SELECT cert_no FROM certificates WHERE id = ?').get(id) as
      | { cert_no: string }
      | undefined;
    if (!cert) return { error: 'Certificate not found.' };

    if (intent === 'revoke') {
      const reason = String(formData.get('reason') ?? '').trim();
      if (reason.length < 4) {
        return { error: 'Give a short reason — it is shown on the public verification page.' };
      }
      revokeCertificate(id, reason, admin.id);
      revalidateAdmin();
      revalidatePath(`/verify/${cert.cert_no}`);
      return { ok: `Certificate ${cert.cert_no} revoked. The public verify page now shows it as invalid.` };
    }

    if (intent === 'restore') {
      restoreCertificate(id, admin.id);
      revalidateAdmin();
      revalidatePath(`/verify/${cert.cert_no}`);
      return { ok: `Certificate ${cert.cert_no} restored to active.` };
    }

    return { error: 'Unknown action.' };
  });
}

/* ================================================================== */
/* Templates                                                           */
/* ================================================================== */

export async function saveTemplate(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const id = Number(formData.get('id'));
    const name = String(formData.get('name') ?? '').trim();
    const configRaw = String(formData.get('config') ?? '');
    if (!id) return { error: 'Missing template.' };
    if (name.length < 2) return { error: 'Give the template a name.' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(configRaw);
    } catch {
      return { error: 'The template configuration is not valid JSON.' };
    }

    // normalize fills in any missing keys so an older/partial config stays renderable
    const config = normalizeConfig(parsed);

    db.prepare("UPDATE templates SET name = ?, config = ?, updated_at = datetime('now') WHERE id = ?").run(
      name,
      JSON.stringify(config),
      id,
    );
    audit(admin.id, 'template.update', 'template', id, name);

    revalidatePath('/admin/templates');
    revalidatePath(`/admin/templates/${id}`);
    revalidatePath('/');
    return { ok: 'Template saved. New certificates will use this layout.' };
  });
}

export async function createTemplate(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const name = String(formData.get('name') ?? '').trim() || 'Untitled template';
  const copyFrom = Number(formData.get('copy_from')) || 0;

  let config = DEFAULT_TEMPLATE;
  if (copyFrom) {
    const src = db.prepare('SELECT config FROM templates WHERE id = ?').get(copyFrom) as { config: string } | undefined;
    if (src) config = normalizeConfig(JSON.parse(src.config));
  }

  const info = db
    .prepare('INSERT INTO templates (name, config, is_default) VALUES (?, ?, 0)')
    .run(name, JSON.stringify(config));

  audit(admin.id, 'template.create', 'template', Number(info.lastInsertRowid), name);
  revalidatePath('/admin/templates');
  redirect(`/admin/templates/${info.lastInsertRowid}`);
}

export async function setDefaultTemplate(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;

  db.transaction(() => {
    db.prepare('UPDATE templates SET is_default = 0').run();
    db.prepare('UPDATE templates SET is_default = 1 WHERE id = ?').run(id);
  })();

  audit(admin.id, 'template.set_default', 'template', id);
  revalidatePath('/admin/templates');
}

export async function deleteTemplate(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;

  const inUse = db.prepare('SELECT COUNT(*) c FROM certificates WHERE template_id = ?').get(id) as { c: number };
  const isDefault = db.prepare('SELECT is_default FROM templates WHERE id = ?').get(id) as { is_default: number } | undefined;
  const total = db.prepare('SELECT COUNT(*) c FROM templates').get() as { c: number };

  // Deleting a template that certificates reference would orphan them.
  if (inUse.c > 0 || isDefault?.is_default === 1 || total.c <= 1) {
    redirect('/admin/templates?error=' + encodeURIComponent('That template cannot be deleted: it is the default or already used by issued certificates.'));
  }

  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  audit(admin.id, 'template.delete', 'template', id);
  revalidatePath('/admin/templates');
  redirect('/admin/templates?ok=' + encodeURIComponent('Template deleted.'));
}

/* ================================================================== */
/* Programs                                                            */
/* ================================================================== */

const programSchema = z.object({
  id: z.coerce.number().int().optional(),
  title: z.string().trim().min(2, 'Title is required'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens'),
  summary: z.string().trim().max(400).optional().default(''),
  description: z.string().trim().max(2000).optional().default(''),
  duration: z.string().trim().min(1).default('4 Weeks'),
  mode: z.enum(['Online', 'Offline', 'Hybrid']),
  stipend: z.string().trim().max(120).optional().default(''),
  skills: z.string().trim().max(500).optional().default(''),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
});

export async function saveProgram(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const parsed = programSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const v = parsed.data;

    const skills = JSON.stringify(
      (v.skills ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

    const clash = db.prepare('SELECT id FROM programs WHERE slug = ? AND id IS NOT ?').get(v.slug, v.id ?? null) as
      | { id: number }
      | undefined;
    if (clash) return { error: 'Another domain already uses that slug.' };

    if (v.id) {
      db.prepare(
        `UPDATE programs SET title = ?, slug = ?, summary = ?, description = ?, duration = ?, mode = ?,
                             stipend = ?, skills = ?, is_active = ? WHERE id = ?`,
      ).run(v.title, v.slug, v.summary ?? '', v.description ?? '', v.duration, v.mode, v.stipend ?? '', skills, v.is_active, v.id);
      audit(admin.id, 'program.update', 'program', v.id, v.title);
    } else {
      const info = db
        .prepare(
          `INSERT INTO programs (title, slug, summary, description, duration, mode, stipend, skills, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(v.title, v.slug, v.summary ?? '', v.description ?? '', v.duration, v.mode, v.stipend ?? '', skills, v.is_active);
      audit(admin.id, 'program.create', 'program', Number(info.lastInsertRowid), v.title);
    }

    revalidatePath('/admin/programs');
    revalidatePath('/programs');
    revalidatePath('/');
    return { ok: v.id ? 'Domain updated.' : 'Domain created.' };
  });
}

export async function toggleProgram(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  db.prepare('UPDATE programs SET is_active = 1 - is_active WHERE id = ?').run(id);
  revalidatePath('/admin/programs');
  revalidatePath('/programs');
}

/* ================================================================== */
/* Users                                                               */
/* ================================================================== */

export async function setUserRole(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  const role = String(formData.get('role'));
  if (!id || !['admin', 'intern'].includes(role)) return;

  // Never let the last administrator demote themselves out of the system.
  if (role === 'intern') {
    const admins = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'admin'").get() as { c: number };
    if (admins.c <= 1) {
      redirect('/admin/interns?error=' + encodeURIComponent('You cannot remove the last administrator.'));
    }
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  audit(admin.id, 'user.set_role', 'user', id, role);
  revalidatePath('/admin/interns');
}

export async function resetUserPassword(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const id = Number(formData.get('id'));
    const password = String(formData.get('password') ?? '');
    if (!id) return { error: 'Missing user.' };
    if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), id);
    audit(admin.id, 'user.reset_password', 'user', id);
    revalidatePath('/admin/interns');
    return { ok: 'Password reset. Share the new password with the intern securely.' };
  });
}

/* ================================================================== */
/* Settings                                                            */
/* ================================================================== */

export async function saveSettings(_p: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await requireAdmin();

    const siteUrl = String(formData.get('site_url') ?? '').trim();
    if (siteUrl && !/^https?:\/\//.test(siteUrl)) {
      return { error: 'Site URL must start with http:// or https://' };
    }

    const seq = String(formData.get('cert_seq') ?? '').trim();
    if (seq && !/^\d+$/.test(seq)) return { error: 'Certificate counter must be a whole number.' };

    setSetting('site_url', siteUrl.replace(/\/$/, ''));
    setSetting('org_name', String(formData.get('org_name') ?? '').trim());
    setSetting('support_email', String(formData.get('support_email') ?? '').trim());
    setSetting('auto_issue_on_approval', formData.get('auto_issue_on_approval') ? '1' : '0');
    if (seq) setSetting('cert_seq', seq);

    audit(admin.id, 'settings.update', 'settings');
    revalidatePath('/admin/settings');
    revalidatePath('/');
    return { ok: 'Settings saved.' };
  });
}


/* ================================================================== */
/* Manual certificate generation                                       */
/* ================================================================== */

/** Collect the template's own columns plus the extras from a submitted form. */
function valuesFromForm(formData: FormData, cfg: TemplateConfig): Record<string, string> {
  const values: Record<string, string> = {};
  for (const f of cfg.fields) values[f.key] = String(formData.get(`f_${f.key}`) ?? '').trim();
  for (const c of EXTRA_COLUMNS) values[c.key] = String(formData.get(c.key) ?? '').trim();
  return values;
}

/** Validate typed values the same way an imported row is validated. */
function checkValues(values: Record<string, string>, cfg: TemplateConfig): string[] {
  const errors: string[] = [];

  for (const f of cfg.fields) {
    const raw = values[f.key];
    if (!raw) {
      if (f.required && !f.defaultValue) errors.push(`${f.label} is required.`);
      continue;
    }
    if (f.type === 'date') {
      const d = toIsoDate(raw);
      if (!d) errors.push(`${f.label} is not a valid date.`);
      else values[f.key] = d;
    } else if (f.type === 'number') {
      const n = Number(String(raw).replace('%', ''));
      if (!Number.isFinite(n)) errors.push(`${f.label} must be a number.`);
      else values[f.key] = String(n);
    }
  }

  if (values.start_date && values.end_date && values.start_date > values.end_date) {
    errors.push('The end date falls before the start date.');
  }
  if (values.issued_on) {
    const d = toIsoDate(values.issued_on);
    if (!d) errors.push('Issue date is not valid.');
    else values.issued_on = d;
  }
  if (values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
    errors.push('Email address is not valid.');
  }
  return errors;
}

export type ManualState = ActionState & { values?: Record<string, string> };

/** Create a certificate from values typed straight into the admin console. */
export async function createManualCertificate(_p: ManualState, formData: FormData): Promise<ManualState> {
  const admin = await requireAdmin();
  const templateId = Number(formData.get('template_id')) || undefined;

  let cfg: TemplateConfig;
  try {
    cfg = getTemplate(templateId).config;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No template available.' };
  }

  const values = valuesFromForm(formData, cfg);
  const errors = checkValues(values, cfg);
  if (errors.length) return { error: errors[0], values };

  let cert;
  try {
    const h = await headers();
    cert = issueManualCertificate({
      values,
      templateId,
      actorId: admin.id,
      baseUrl: baseUrlFrom(h),
      reason: String(formData.get('reason') ?? '').trim() || 'manual entry',
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not generate the certificate.', values };
  }

  revalidateAdmin();
  redirect(`/admin/certificates/${cert.id}?ok=${encodeURIComponent(`Certificate ${cert.cert_no} generated.`)}`);
}

/** Correct the snapshot of a manually-issued certificate, keeping its number. */
export async function editManualCertificate(_p: ManualState, formData: FormData): Promise<ManualState> {
  return guard(async () => {
    const admin = await requireAdmin();
    const id = Number(formData.get('certificate_id'));
    if (!id) return { error: 'Missing certificate.' };

    const cert = db.prepare('SELECT template_id FROM certificates WHERE id = ?').get(id) as
      | { template_id: number }
      | undefined;
    if (!cert) return { error: 'Certificate not found.' };

    const templateId = Number(formData.get('template_id')) || cert.template_id;
    const cfg = getTemplate(templateId).config;

    const values = valuesFromForm(formData, cfg);
    const errors = checkValues(values, cfg);
    if (errors.length) return { error: errors[0], values };

    const h = await headers();
    const updated = updateManualCertificate({
      certificateId: id,
      values,
      templateId,
      actorId: admin.id,
      baseUrl: baseUrlFrom(h),
    });

    revalidateAdmin();
    revalidatePath(`/verify/${updated.cert_no}`);
    revalidatePath(`/admin/certificates/${id}`);
    return { ok: `Certificate ${updated.cert_no} updated. Its number is unchanged.` };
  });
}

/* ================================================================== */
/* Spreadsheet import                                                  */
/* ================================================================== */

export interface ImportResultRow {
  line: number;
  name: string;
  certNo?: string;
  error?: string;
}

export type ImportState = ActionState & {
  stage?: 'idle' | 'preview' | 'done';
  templateId?: number;
  fileName?: string;
  headers?: string[];
  unmatched?: string[];
  missingRequired?: string[];
  truncated?: boolean;
  rows?: ParsedRow[];
  summary?: { total: number; ok: number; warn: number; error: number };
  results?: ImportResultRow[];
  issuedCount?: number;
};

/**
 * Two-stage bulk import.
 *  - `intent=preview`: parse and validate the upload, return every row with its
 *    status. Nothing is written.
 *  - `intent=commit`: re-validate the reviewed rows server-side, then issue the
 *    valid ones inside a single transaction.
 */
export async function importCertificates(_p: ImportState, formData: FormData): Promise<ImportState> {
  const admin = await requireAdmin();
  const intent = String(formData.get('intent') ?? 'preview');
  const templateId = Number(formData.get('template_id')) || undefined;

  let cfg: TemplateConfig;
  let resolvedTemplateId: number;
  try {
    const tpl = getTemplate(templateId);
    cfg = tpl.config;
    resolvedTemplateId = tpl.id;
  } catch (e) {
    return { stage: 'idle', error: e instanceof Error ? e.message : 'No template available.' };
  }

  // Clears a finished or previewed batch without a page reload.
  if (intent === 'reset') return { stage: 'idle', templateId: resolvedTemplateId };

  /* ------------------------------ preview ----------------------------- */
  if (intent === 'preview') {
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { stage: 'idle', templateId: resolvedTemplateId, error: 'Choose a .xlsx or .csv file to upload.' };
    }
    if (file.size > MAX_FILE_BYTES) {
      return {
        stage: 'idle',
        templateId: resolvedTemplateId,
        error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
      };
    }

    let grid: string[][];
    try {
      grid = await fileToGrid(file);
    } catch (e) {
      return { stage: 'idle', templateId: resolvedTemplateId, error: e instanceof Error ? e.message : 'Could not read that file.' };
    }

    if (grid.length === 0) {
      return { stage: 'idle', templateId: resolvedTemplateId, error: 'That file has no rows in it.' };
    }
    if (grid.length === 1) {
      return {
        stage: 'idle',
        templateId: resolvedTemplateId,
        error: 'That file has a header row but no data rows beneath it.',
      };
    }

    const parsed = validateGrid(grid, cfg);
    const summary = summarise(parsed.rows);

    if (parsed.missingRequired.length) {
      return {
        stage: 'preview',
        templateId: resolvedTemplateId,
        fileName: file.name,
        ...parsed,
        summary,
        error: `The file is missing required column(s): ${parsed.missingRequired.join(', ')}. Download the template below to get the exact headers.`,
      };
    }

    return {
      stage: 'preview',
      templateId: resolvedTemplateId,
      fileName: file.name,
      ...parsed,
      summary,
      ok: `Read ${summary.total} row(s) from ${file.name}. ${summary.ok + summary.warn} ready to import${
        summary.error ? `, ${summary.error} with errors that will be skipped` : ''
      }.`,
    };
  }

  /* ------------------------------ commit ------------------------------ */
  let rows: ParsedRow[];
  try {
    rows = JSON.parse(String(formData.get('rows') ?? '[]')) as ParsedRow[];
  } catch {
    return { stage: 'idle', error: 'The reviewed rows could not be read. Please upload the file again.' };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { stage: 'idle', error: 'Nothing to import. Please upload the file again.' };
  }

  // Never trust the posted statuses — re-validate from the values themselves.
  const grid: string[][] = [
    Object.keys(rows[0].values),
    ...rows.map((r) => Object.keys(rows[0].values).map((k) => r.values[k] ?? '')),
  ];
  const revalidated = validateGrid(grid, cfg);

  const h = await headers();
  const baseUrl = baseUrlFrom(h);
  const results: ImportResultRow[] = [];
  let issued = 0;

  // One transaction: a mid-way failure must not leave a partial batch behind.
  const run = db.transaction(() => {
    revalidated.rows.forEach((row, i) => {
      const line = rows[i]?.line ?? row.line;
      const name = String(row.values.intern_name ?? '').trim() || '(no name)';

      if (row.status === 'error') {
        results.push({ line, name, error: row.messages.join('; ') });
        return;
      }
      try {
        const cert = issueManualCertificate({
          values: row.values,
          templateId: resolvedTemplateId,
          actorId: admin.id,
          baseUrl,
          reason: `bulk import${formData.get('file_name') ? ` from ${formData.get('file_name')}` : ''}`,
        });
        results.push({ line, name, certNo: cert.cert_no });
        issued++;
      } catch (e) {
        results.push({ line, name, error: e instanceof Error ? e.message : 'Failed to issue' });
      }
    });
  });

  try {
    run();
  } catch (e) {
    return { stage: 'idle', error: `Import aborted, nothing was saved: ${e instanceof Error ? e.message : 'unknown error'}` };
  }

  audit(admin.id, 'certificate.bulk_import', 'certificate', '', `${issued} issued of ${revalidated.rows.length} rows`);
  revalidateAdmin();

  const failed = results.length - issued;
  return {
    stage: 'done',
    templateId: resolvedTemplateId,
    results,
    issuedCount: issued,
    ok: `Generated ${issued} certificate(s)${failed ? `; ${failed} row(s) skipped` : ''}.`,
  };
}
