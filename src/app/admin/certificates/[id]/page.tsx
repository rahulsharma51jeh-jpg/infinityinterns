import Link from 'next/link';
import BackLink from '@/components/ui/BackLink';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { baseUrlFrom, certificateView, getTemplate, type CertificateRow } from '@/lib/certificate';
import StatusBadge from '@/components/ui/StatusBadge';
import ActionForm from '@/components/ui/ActionForm';
import SubmitButton from '@/components/ui/SubmitButton';
import CertificatePreview from '@/components/certificate/CertificatePreview';
import RevocationPanel from './RevocationPanel';
import ManualCertificateForm from '../new/ManualCertificateForm';
import Flash from '@/components/ui/Flash';
import { refreshCertificate } from '../../actions';

export const metadata: Metadata = { title: 'Manage certificate' };
export const dynamic = 'force-dynamic';

export default async function ManageCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isInteger(id)) notFound();

  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id) as CertificateRow | undefined;
  if (!cert) notFound();

  const h = await headers();
  const view = await certificateView(cert, baseUrlFrom(h));
  const d = view.data as Record<string, string>;

  const templates = db.prepare('SELECT id, name, is_default FROM templates ORDER BY is_default DESC, name').all() as {
    id: number;
    name: string;
    is_default: number;
  }[];

  const checks = db
    .prepare('SELECT found, source, created_at FROM verification_log WHERE UPPER(cert_no) = ? ORDER BY id DESC LIMIT 10')
    .all(cert.cert_no.toUpperCase()) as { found: number; source: string; created_at: string }[];

  // Manually issued certificates have no application to correct, so their
  // snapshot is editable in place.
  const isManual = cert.application_id === null;
  const editCfg = isManual ? getTemplate(cert.template_id).config : null;
  const editValues: Record<string, string> = {};
  if (editCfg) {
    for (const f of editCfg.fields) {
      const raw = d[f.key] ?? '';
      // dates are stored formatted for print; <input type=date> needs ISO
      editValues[f.key] = f.type === 'date' ? isoFromDisplay(raw) : String(raw ?? '');
    }
    editValues.gender = String(d.gender ?? 'other');
    editValues.email = String(d.email ?? '');
    editValues.issued_on = cert.issued_on;
    editValues.certificate_no = cert.cert_no;
  }

  return (
    <div>
      <BackLink href="/admin/certificates">All certificates</BackLink>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl font-bold text-navy-900">{cert.cert_no}</h1>
          <p className="mt-1 text-sm text-navy-500">
            {d.intern_name} · {d.domain} · issued {cert.issued_on} · template “{view.templateName}”
          </p>
          <p className="mt-1 text-xs text-navy-400">
            {cert.application_id ? (
              <>
                Issued on approval of{' '}
                <Link href={`/admin/applications/${cert.application_id}`} className="font-medium text-brand-600 hover:underline">
                  application #{cert.application_id}
                </Link>
              </>
            ) : (
              'Created manually or imported from a spreadsheet'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={cert.status} />
          <Link href={`/certificate/${cert.cert_no}`} className="btn-primary btn-sm">
            Open / print
          </Link>
          <Link href={`/verify/${cert.cert_no}`} className="btn-ghost btn-sm">
            Public record
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <Flash ok={sp.ok} error={sp.error} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {/* snapshot */}
          <section className="card p-5">
            <h2 className="font-bold text-navy-900">Frozen snapshot</h2>
            <p className="mt-1 text-xs text-navy-400">
              Captured when the certificate was issued. Editing the application does not change this until you rebuild.
            </p>
            <dl className="mt-4 divide-y divide-navy-50 text-sm">
              {[
                ['Name', `${d.salutation ?? ''} ${d.intern_name ?? ''}`.trim()],
                ['Institute', d.college],
                ['Domain', d.domain],
                ['Duration', `${d.duration ?? ''} ${d.mode ?? ''}`.trim()],
                ['Period', `${d.start_date ?? ''} → ${d.end_date ?? ''}`],
                ['Attendance', d.attendance ? `${d.attendance}%` : '—'],
                ['Marks', d.marks ? `${d.marks}%` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2">
                  <dt className="text-navy-400">{k}</dt>
                  <dd className="text-right font-medium text-navy-900">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* QR */}
          <section className="card p-5">
            <h2 className="font-bold text-navy-900">Verification QR</h2>
            <div className="mt-3 flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={view.qr} alt="QR code" className="h-28 w-28 rounded border border-navy-100" />
              <div className="min-w-0 text-xs text-navy-500">
                <p className="break-all">{view.verifyUrl}</p>
                <p className="mt-2">
                  {cert.verify_count} check{cert.verify_count === 1 ? '' : 's'}
                  {cert.last_verified ? `, last ${cert.last_verified.slice(0, 16)}` : ''}
                </p>
                <a href={`/api/qr/${cert.cert_no}?size=1200&download=1`} download className="btn-ghost btn-sm mt-3">
                  Download PNG
                </a>
              </div>
            </div>
          </section>

          {/* recent checks */}
          <section className="card">
            <h2 className="border-b border-navy-100 px-5 py-3 font-bold text-navy-900">Verification history</h2>
            {checks.length === 0 ? (
              <p className="p-6 text-center text-sm text-navy-400">Never checked yet.</p>
            ) : (
              <ul className="divide-y divide-navy-50">
                {checks.map((c, i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-2">
                    <span className={`h-2 w-2 rounded-full ${c.found ? 'bg-emerald-500' : 'bg-red-500'}`} aria-hidden />
                    <span className="badge bg-navy-50 text-navy-500">{c.source}</span>
                    <span className="ml-auto text-[11px] text-navy-400">{c.created_at.slice(0, 16)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* actions + preview */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            {/* rebuild */}
            <section className="card p-5">
              <h2 className="font-bold text-navy-900">Rebuild / change template</h2>
              <p className="mt-1 mb-4 text-xs text-navy-400">
                Re-reads the current application data and re-renders on the chosen template. The certificate number is
                kept, so printed copies and QR codes stay valid.
              </p>
              <ActionForm action={refreshCertificate} className="space-y-3">
                <input type="hidden" name="certificate_id" value={cert.id} />
                <div>
                  <label className="label" htmlFor="template_id">Template</label>
                  <select id="template_id" name="template_id" defaultValue={cert.template_id} className="input">
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.is_default ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <SubmitButton className="btn-primary btn-sm" pendingText="Rebuilding…">
                  Rebuild certificate
                </SubmitButton>
              </ActionForm>
            </section>

            {/* revoke / restore */}
            <RevocationPanel
              certificateId={cert.id}
              status={cert.status}
              revokeReason={cert.revoke_reason}
            />
          </div>

          {isManual && editCfg && (
            <section className="card p-5">
              <h2 className="font-bold text-navy-900">Correct these details</h2>
              <p className="mt-1 mb-4 text-xs text-navy-400">
                This certificate was not created from an application, so its record is editable here. The certificate
                number never changes, so anything already printed or scanned keeps working.
              </p>
              <ManualCertificateForm
                mode="edit"
                certificateId={cert.id}
                templateId={cert.template_id}
                templates={templates.map((t) => ({ id: t.id, name: t.name, isDefault: t.is_default === 1 }))}
                fields={editCfg.fields}
                initialValues={editValues}
              />
            </section>
          )}

          <section>
            <h2 className="mb-3 font-bold text-navy-900">Rendered certificate</h2>
            <div className="overflow-hidden rounded-xl border border-navy-100 bg-white p-2 shadow-sm">
              <CertificatePreview view={view} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** dd-MM-yyyy (as printed) back to the yyyy-MM-dd that date inputs require. */
function isoFromDisplay(value: string): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
