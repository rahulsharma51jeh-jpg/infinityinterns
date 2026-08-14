import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { baseUrlFrom, certificateView, findCertificate, logVerification } from '@/lib/certificate';
import CertificatePreview from '@/components/certificate/CertificatePreview';
import VerifyForm from '@/components/VerifyForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ certNo: string }> }): Promise<Metadata> {
  const { certNo } = await params;
  const cert = findCertificate(decodeURIComponent(certNo));
  if (!cert) return { title: `Certificate not found`, robots: { index: false } };
  const data = JSON.parse(cert.data) as Record<string, string>;
  return {
    title: `${cert.cert_no} — ${data.intern_name ?? 'Certificate'}`,
    description: `Verification record for Infinity Interns certificate ${cert.cert_no} issued to ${data.intern_name ?? 'an intern'} for ${data.domain ?? 'an internship'}.`,
  };
}

export default async function VerifyResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ certNo: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { certNo: raw } = await params;
  const { src } = await searchParams;
  const certNo = decodeURIComponent(raw);

  const h = await headers();
  const baseUrl = baseUrlFrom(h);
  const cert = findCertificate(certNo);

  logVerification(
    certNo,
    Boolean(cert),
    src === 'qr' ? 'qr' : 'web',
    h.get('x-forwarded-for') ?? '',
    h.get('user-agent') ?? '',
  );

  /* ----------------------------- not found ----------------------------- */
  if (!cert) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="card overflow-hidden">
          <div className="flex items-start gap-4 border-b border-red-100 bg-red-50 p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-100">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6 l12 12 M18 6 l-12 12" stroke="#b91c1c" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold text-red-900">No certificate found</h1>
              <p className="mt-1 text-sm text-red-800">
                We have no record of certificate number{' '}
                <span className="font-mono font-semibold break-all">{certNo}</span>.
              </p>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm leading-relaxed text-navy-600">
              Double-check the number against the printed certificate — the format is{' '}
              <span className="font-mono">IIN-YYYY-NNNNN</span>. If it still fails, the document may not have been
              issued by Infinity Interns. Please report suspected forgeries to{' '}
              <a className="font-semibold text-brand-600 underline" href="mailto:info@infinityinterns.com">
                info@infinityinterns.com
              </a>
              .
            </p>

            <div className="mt-6">
              <p className="label">Try another number</p>
              <VerifyForm defaultValue={certNo} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- found ------------------------------- */
  const view = await certificateView(cert, baseUrl);
  const d = view.data as Record<string, string>;
  const revoked = cert.status === 'revoked';

  const app = cert.application_id
    ? (db.prepare('SELECT course, project_title, mentor_name FROM applications WHERE id = ?').get(cert.application_id) as
        | { course: string; project_title: string; mentor_name: string }
        | undefined)
    : undefined;

  const rows: [string, string | undefined][] = [
    ['Certificate number', cert.cert_no],
    ['Intern name', `${d.salutation ?? ''} ${d.intern_name ?? ''}`.trim()],
    ['Institute', d.college],
    ['Course / branch', app?.course || d.course],
    ['Domain', d.domain],
    ['Duration', [d.duration, d.mode].filter(Boolean).join(' · ')],
    ['Training period', [d.start_date, d.end_date].filter(Boolean).join(' to ')],
    ['Attendance', d.attendance ? `${d.attendance}%` : undefined],
    ['Assessment marks', d.marks ? `${d.marks}%` : undefined],
    ['Project', app?.project_title || d.project_title],
    ['Mentor', app?.mentor_name || d.mentor_name],
    ['Issued on', d.issue_date],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* result banner */}
      <div
        className={`card overflow-hidden ${revoked ? 'border-red-200' : 'border-emerald-200'}`}
      >
        <div className={`flex flex-wrap items-center gap-4 p-6 ${revoked ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <span
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${revoked ? 'bg-red-100' : 'bg-emerald-100'}`}
          >
            {revoked ? (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9.5" stroke="#b91c1c" strokeWidth="2" />
                <path d="M7 12 h10" stroke="#b91c1c" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2 l8.5 3.2 v7.3c0 5.3-4.3 9-8.5 10.5C7.8 21.5 3.5 17.8 3.5 12.5V5.2z" fill="#a7f3d0" />
                <path d="M8 12.3 l2.7 2.7 L16.4 9" stroke="#047857" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <h1 className={`text-2xl font-bold ${revoked ? 'text-red-900' : 'text-emerald-900'}`}>
              {revoked ? 'Certificate revoked' : 'Certificate verified'}
            </h1>
            <p className={`mt-1 text-sm ${revoked ? 'text-red-800' : 'text-emerald-800'}`}>
              {revoked
                ? 'This certificate was issued by Infinity Interns but has since been revoked and is no longer valid.'
                : 'This is a genuine certificate issued by Infinity Interns. The details below match our records exactly.'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs tracking-wide text-navy-400 uppercase">Certificate no.</p>
            <p className="font-mono text-lg font-bold text-navy-900">{cert.cert_no}</p>
          </div>
        </div>

        {revoked && cert.revoke_reason && (
          <div className="border-t border-red-100 bg-white px-6 py-4 text-sm text-red-800">
            <span className="font-semibold">Reason on record:</span> {cert.revoke_reason}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        {/* details */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-navy-900">Record on file</h2>
          <dl className="card mt-3 divide-y divide-navy-50">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex gap-4 px-4 py-3">
                  <dt className="w-36 shrink-0 text-xs font-semibold tracking-wide text-navy-400 uppercase">{k}</dt>
                  <dd className={`text-sm font-medium text-navy-900 ${k === 'Certificate number' ? 'font-mono' : ''}`}>
                    {v}
                  </dd>
                </div>
              ))}
          </dl>

          <div className="card mt-4 p-4">
            <p className="text-xs tracking-wide text-navy-400 uppercase">Verification QR</p>
            <div className="mt-3 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={view.qr} alt={`QR code for certificate ${cert.cert_no}`} className="h-28 w-28 rounded border border-navy-100" />
              <div className="min-w-0 text-xs leading-relaxed text-navy-500">
                <p>This QR is printed on the certificate and resolves to this page.</p>
                <p className="mt-2 font-medium break-all text-navy-700">{view.verifyUrl}</p>
                <p className="mt-2">
                  Verified {cert.verify_count} time{cert.verify_count === 1 ? '' : 's'}.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/certificate/${cert.cert_no}`} className="btn-primary">
              Open full certificate
            </Link>
            <Link href="/verify" className="btn-ghost">
              Verify another
            </Link>
          </div>
        </div>

        {/* artwork */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-bold text-navy-900">Certificate on record</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-white p-2 shadow-sm">
            <CertificatePreview view={view} />
          </div>
          <p className="mt-3 text-xs text-navy-400">
            Rendered live from our database — not an uploaded image. Template: {view.templateName}.
          </p>
        </div>
      </div>
    </div>
  );
}
