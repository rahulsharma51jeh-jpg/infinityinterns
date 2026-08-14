import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { baseUrlFrom, type CertificateRow } from '@/lib/certificate';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import StatusBadge from '@/components/ui/StatusBadge';
import Flash from '@/components/ui/Flash';

export const metadata: Metadata = { title: 'My dashboard' };
export const dynamic = 'force-dynamic';

interface AppRow {
  id: number;
  domain: string;
  duration: string;
  mode: string;
  status: string;
  admin_note: string;
  start_date: string | null;
  end_date: string | null;
  attendance: number | null;
  marks: number | null;
  created_at: string;
  cert_no: string | null;
  cert_status: string | null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const h = await headers();
  const baseUrl = baseUrlFrom(h);

  const apps = db
    .prepare(
      `SELECT a.id, a.domain, a.duration, a.mode, a.status, a.admin_note, a.start_date, a.end_date,
              a.attendance, a.marks, a.created_at,
              c.cert_no, c.status AS cert_status
         FROM applications a
         LEFT JOIN certificates c ON c.application_id = a.id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC`,
    )
    .all(user.id) as AppRow[];

  const certs = db
    .prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY id DESC')
    .all(user.id) as CertificateRow[];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-navy-900">Welcome, {user.name.split(' ')[0]}</h1>
            <p className="mt-1.5 text-sm text-navy-500">Track your applications and download your certificates.</p>
          </div>
          <Link href="/apply" className="btn-brand">
            + New application
          </Link>
        </div>

        <div className="mt-8">
          {sp.applied && <Flash ok="Application submitted. Our team will review it and update the status here." />}
          {sp.error === 'admin-only' && <Flash error="That area is restricted to administrators." />}
        </div>

        {/* -------------------------- certificates -------------------------- */}
        <section className="mt-4">
          <h2 className="text-lg font-bold text-navy-900">My certificates</h2>

          {certs.length === 0 ? (
            <div className="card mt-3 p-8 text-center">
              <p className="text-sm text-navy-500">
                No certificates yet. One is generated automatically as soon as an administrator approves a completed
                application.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {certs.map((c) => {
                const d = JSON.parse(c.data) as Record<string, string>;
                return (
                  <div key={c.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs tracking-wide text-navy-400 uppercase">Certificate no.</p>
                        <p className="font-mono text-sm font-bold text-navy-900">{c.cert_no}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    <p className="mt-3 text-base font-semibold text-navy-900">{d.domain}</p>
                    <p className="text-xs text-navy-400">
                      {d.duration} · {d.mode} · issued {d.issue_date}
                    </p>

                    {c.status === 'revoked' && c.revoke_reason && (
                      <p className="mt-2 rounded bg-red-50 px-2.5 py-1.5 text-xs text-red-800">{c.revoke_reason}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/certificate/${c.cert_no}`} className="btn-primary btn-sm">
                        View / Download PDF
                      </Link>
                      <Link href={`/verify/${c.cert_no}`} className="btn-ghost btn-sm">
                        Public record
                      </Link>
                      <a href={`/api/qr/${c.cert_no}?download=1`} download className="btn-ghost btn-sm">
                        QR
                      </a>
                    </div>

                    <p className="mt-3 truncate text-[11px] text-navy-300" title={`${baseUrl}/verify/${c.cert_no}`}>
                      {baseUrl}/verify/{c.cert_no}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* -------------------------- applications -------------------------- */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-navy-900">My applications</h2>

          {apps.length === 0 ? (
            <div className="card mt-3 p-8 text-center">
              <p className="text-sm text-navy-500">You have not applied yet.</p>
              <Link href="/programs" className="btn-brand mt-4">
                Browse internship domains
              </Link>
            </div>
          ) : (
            <div className="card mt-3 overflow-x-auto">
              <table className="w-full min-w-[46rem]">
                <thead className="border-b border-navy-100 bg-navy-50">
                  <tr>
                    <th className="th">Domain</th>
                    <th className="th">Applied</th>
                    <th className="th">Period</th>
                    <th className="th">Attendance / Marks</th>
                    <th className="th">Status</th>
                    <th className="th">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {apps.map((a) => (
                    <tr key={a.id}>
                      <td className="td">
                        <p className="font-semibold text-navy-900">{a.domain}</p>
                        <p className="text-xs text-navy-400">
                          {a.duration} · {a.mode}
                        </p>
                        {a.admin_note && (
                          <p className="mt-1 max-w-xs text-xs text-navy-500 italic">“{a.admin_note}”</p>
                        )}
                      </td>
                      <td className="td text-xs text-navy-500">{a.created_at.slice(0, 10)}</td>
                      <td className="td text-xs text-navy-500">
                        {a.start_date ? `${a.start_date} → ${a.end_date ?? '—'}` : 'To be scheduled'}
                      </td>
                      <td className="td text-xs text-navy-500">
                        {a.attendance !== null || a.marks !== null
                          ? `${a.attendance ?? '—'}% / ${a.marks ?? '—'}%`
                          : 'Not recorded'}
                      </td>
                      <td className="td">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="td">
                        {a.cert_no ? (
                          <Link href={`/certificate/${a.cert_no}`} className="font-mono text-xs font-semibold text-brand-600 hover:underline">
                            {a.cert_no}
                          </Link>
                        ) : (
                          <span className="text-xs text-navy-300">Pending approval</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
