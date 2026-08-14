import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import {
  baseUrlFrom,
  buildCertData,
  certificateView,
  getTemplate,
  qrDataUrl,
  type ApplicationRow,
  type CertificateRow,
} from '@/lib/certificate';
import StatusBadge from '@/components/ui/StatusBadge';
import ActionForm from '@/components/ui/ActionForm';
import SubmitButton from '@/components/ui/SubmitButton';
import CertificatePreview from '@/components/certificate/CertificatePreview';
import ReviewDecisionForm from './ReviewDecisionForm';
import { issueForApplication, saveApplicationDetails } from '../../actions';

export const metadata: Metadata = { title: 'Review application' };
export const dynamic = 'force-dynamic';

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isInteger(id)) notFound();

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as ApplicationRow | undefined;
  if (!app) notFound();

  const user = db.prepare('SELECT name, email, phone FROM users WHERE id = ?').get(app.user_id) as
    | { name: string; email: string; phone: string | null }
    | undefined;

  const cert = db.prepare('SELECT * FROM certificates WHERE application_id = ?').get(app.id) as
    | CertificateRow
    | undefined;

  const templates = db.prepare('SELECT id, name, is_default FROM templates ORDER BY is_default DESC, name').all() as {
    id: number;
    name: string;
    is_default: number;
  }[];

  const h = await headers();
  const baseUrl = baseUrlFrom(h);

  // Preview: the real certificate if issued, otherwise a dry run of exactly what
  // approval would produce right now.
  let preview: { config: ReturnType<typeof getTemplate>['config']; data: ReturnType<typeof buildCertData>; qr: string } | null =
    null;
  let previewDraft: string | null = null;

  if (cert) {
    const view = await certificateView(cert, baseUrl);
    preview = { config: view.config, data: view.data, qr: view.qr };
  } else {
    const tpl = getTemplate();
    const data = buildCertData(app, tpl.config, 'IIN-XXXX-XXXXX', new Date().toISOString().slice(0, 10), baseUrl);
    const qr = await qrDataUrl(`${baseUrl}/verify/PREVIEW`, tpl.config.qr.color, 300);
    preview = { config: tpl.config, data, qr };
    previewDraft = 'PREVIEW';
  }

  const incomplete: string[] = [];
  if (app.attendance === null) incomplete.push('attendance %');
  if (app.marks === null) incomplete.push('marks %');
  if (!app.start_date) incomplete.push('start date');
  if (!app.end_date) incomplete.push('end date');

  return (
    <div>
      <Link href="/admin/applications" className="text-sm font-medium text-navy-500 hover:text-navy-800">
        ← All applications
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">{app.full_name}</h1>
          <p className="mt-1 text-sm text-navy-500">
            {app.domain} · {app.duration} · {app.mode} · applied by {user?.email ?? app.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={app.status} />
          {cert && (
            <Link href={`/admin/certificates/${cert.id}`} className="btn-ghost btn-sm">
              Manage certificate
            </Link>
          )}
        </div>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        {/* ------------------------- editable details ------------------------ */}
        <section className="card p-6">
          <h2 className="text-lg font-bold text-navy-900">Certificate data</h2>
          <p className="mt-1 mb-5 text-xs text-navy-400">
            These values feed the certificate placeholders. Edit them before approving.
          </p>

          <ActionForm action={saveApplicationDetails} className="space-y-4">
            <input type="hidden" name="id" value={app.id} />

            <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
              <div>
                <label className="label" htmlFor="salutation">Title</label>
                <select id="salutation" name="salutation" defaultValue={app.salutation} className="input">
                  {['Mr.', 'Ms.', 'Mrs.', 'Dr.'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="full_name">Full name</label>
                <input id="full_name" name="full_name" defaultValue={app.full_name} className="input" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="college">College / institute</label>
                <input id="college" name="college" defaultValue={app.college} className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="course">Course / branch</label>
                <input id="course" name="course" defaultValue={app.course} className="input" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="domain">Domain</label>
                <input id="domain" name="domain" defaultValue={app.domain} className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="duration">Duration</label>
                <input id="duration" name="duration" defaultValue={app.duration} className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="mode">Mode</label>
                <select id="mode" name="mode" defaultValue={app.mode} className="input">
                  {['Online', 'Offline', 'Hybrid'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="start_date">Start date</label>
                <input id="start_date" name="start_date" type="date" defaultValue={app.start_date ?? ''} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="end_date">End date</label>
                <input id="end_date" name="end_date" type="date" defaultValue={app.end_date ?? ''} className="input" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="attendance">Attendance %</label>
                <input id="attendance" name="attendance" type="number" min={0} max={100} defaultValue={app.attendance ?? ''} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="marks">Marks %</label>
                <input id="marks" name="marks" type="number" min={0} max={100} defaultValue={app.marks ?? ''} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="gender">Gender (pronouns)</label>
                <select id="gender" name="gender" defaultValue={app.gender} className="input">
                  <option value="male">Male (he / his)</option>
                  <option value="female">Female (she / her)</option>
                  <option value="other">Unspecified (he/she)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="project_title">Project title</label>
                <input id="project_title" name="project_title" defaultValue={app.project_title} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="mentor_name">Mentor</label>
                <input id="mentor_name" name="mentor_name" defaultValue={app.mentor_name} className="input" />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="admin_note">Internal / intern-visible note</label>
              <textarea id="admin_note" name="admin_note" rows={2} defaultValue={app.admin_note} className="input" placeholder="Shown to the intern on their dashboard" />
            </div>

            <SubmitButton className="btn-primary" pendingText="Saving…">
              Save details
            </SubmitButton>
          </ActionForm>
        </section>

        {/* ---------------------------- decisions --------------------------- */}
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-bold text-navy-900">Decision</h2>

            {incomplete.length > 0 ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Cannot approve yet — missing <strong>{incomplete.join(', ')}</strong>. Fill these in and save first.
              </p>
            ) : (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                All required certificate fields are present. Approving will generate the certificate immediately.
              </p>
            )}

            <ReviewDecisionForm applicationId={app.id} defaultNote={app.admin_note} />
          </section>

          {!cert && (
            <section className="card p-6">
              <h2 className="text-lg font-bold text-navy-900">Issue manually</h2>
              <p className="mt-1 mb-4 text-xs text-navy-400">
                Generate a certificate on a specific template without changing the application status.
              </p>
              <ActionForm action={issueForApplication} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="application_id" value={app.id} />
                <div className="min-w-52 flex-1">
                  <label className="label" htmlFor="template_id">Template</label>
                  <select id="template_id" name="template_id" className="input">
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.is_default ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <SubmitButton className="btn-ghost" pendingText="Generating…">
                  Generate certificate
                </SubmitButton>
              </ActionForm>
            </section>
          )}

          {cert && (
            <section className="card p-6">
              <h2 className="text-lg font-bold text-navy-900">Issued certificate</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-navy-400">Number</dt>
                  <dd className="font-mono font-semibold text-navy-900">{cert.cert_no}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-navy-400">Issued on</dt>
                  <dd className="font-medium text-navy-900">{cert.issued_on}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-navy-400">Status</dt>
                  <dd>
                    <StatusBadge status={cert.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-navy-400">Public checks</dt>
                  <dd className="font-medium text-navy-900">{cert.verify_count}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/certificate/${cert.cert_no}`} className="btn-primary btn-sm">
                  Open / print
                </Link>
                <Link href={`/verify/${cert.cert_no}`} className="btn-ghost btn-sm">
                  Public record
                </Link>
                <Link href={`/admin/certificates/${cert.id}`} className="btn-ghost btn-sm">
                  Manage
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ----------------------------- preview ---------------------------- */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold text-navy-900">
            {cert ? 'Issued certificate' : 'Preview — what approval will generate'}
          </h2>
          <Link href="/admin/templates" className="text-sm font-medium text-brand-600 hover:underline">
            Edit the certificate design →
          </Link>
        </div>

        {preview && (
          <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-white p-2 shadow-sm">
            <CertificatePreview
              view={{ ...preview, cert: { status: cert?.status ?? 'active' } }}
              draftLabel={previewDraft}
            />
          </div>
        )}
      </section>
    </div>
  );
}
