import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/Icons';
import type { Metadata } from 'next';
import { db, getSetting } from '@/lib/db';
import StatusBadge from '@/components/ui/StatusBadge';

export const metadata: Metadata = { title: 'Admin overview' };
export const dynamic = 'force-dynamic';

export default function AdminOverviewPage() {
  const stats = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM applications)                                        AS apps,
        (SELECT COUNT(*) FROM applications WHERE status IN ('pending','under_review')) AS queue,
        (SELECT COUNT(*) FROM applications WHERE status = 'approved')              AS approved,
        (SELECT COUNT(*) FROM certificates WHERE status = 'active')                AS active_certs,
        (SELECT COUNT(*) FROM certificates WHERE status = 'revoked')               AS revoked_certs,
        (SELECT COUNT(*) FROM verification_log)                                    AS verifications,
        (SELECT COUNT(*) FROM verification_log WHERE found = 0)                    AS failed_checks,
        (SELECT COUNT(*) FROM users WHERE role = 'intern')                         AS interns,
        (SELECT COUNT(*) FROM programs WHERE is_active = 1)                        AS programs`,
    )
    .get() as Record<string, number>;

  const queue = db
    .prepare(
      `SELECT id, full_name, domain, status, attendance, marks, start_date, end_date, created_at
         FROM applications
        WHERE status IN ('pending','under_review')
        ORDER BY created_at ASC
        LIMIT 8`,
    )
    .all() as {
    id: number;
    full_name: string;
    domain: string;
    status: string;
    attendance: number | null;
    marks: number | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  }[];

  const recentCerts = db
    .prepare('SELECT id, cert_no, data, status, issued_on, verify_count FROM certificates ORDER BY id DESC LIMIT 6')
    .all() as { id: number; cert_no: string; data: string; status: string; issued_on: string; verify_count: number }[];

  const recentChecks = db
    .prepare('SELECT cert_no, found, source, created_at FROM verification_log ORDER BY id DESC LIMIT 8')
    .all() as { cert_no: string; found: number; source: string; created_at: string }[];

  const autoIssue = getSetting('auto_issue_on_approval', '1') === '1';

  const cards = [
    { k: 'Awaiting review', v: stats.queue, href: '/admin/applications?status=pending', accent: stats.queue > 0 },
    { k: 'Active certificates', v: stats.active_certs, href: '/admin/certificates' },
    { k: 'Revoked', v: stats.revoked_certs, href: '/admin/certificates?status=revoked' },
    { k: 'Verifications', v: stats.verifications, href: '/admin/certificates' },
    { k: 'Registered interns', v: stats.interns, href: '/admin/interns' },
    { k: 'Open domains', v: stats.programs, href: '/admin/programs' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Overview</h1>
          <p className="mt-1.5 text-sm text-navy-500">
            Automatic issue on approval is{' '}
            <strong className={autoIssue ? 'text-emerald-700' : 'text-amber-700'}>{autoIssue ? 'ON' : 'OFF'}</strong>.{' '}
            <Link href="/admin/settings" className="underline hover:text-navy-800">
              Change
            </Link>
          </p>
        </div>
        <Link href="/admin/applications?status=pending" className="btn-brand">
          Review queue ({stats.queue})
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Link key={c.k} href={c.href} className={`card p-4 hover:border-navy-300 ${c.accent ? 'border-amber-300 bg-amber-50' : ''}`}>
            <p className="text-2xl font-bold text-navy-900">{c.v}</p>
            <p className="mt-0.5 text-xs tracking-wide text-navy-400 uppercase">{c.k}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* review queue */}
        <section className="card lg:col-span-2">
          <header className="flex items-center justify-between border-b border-navy-100 px-5 py-3.5">
            <h2 className="font-bold text-navy-900">Review queue</h2>
            <Link href="/admin/applications" className="text-sm font-medium text-brand-600 hover:underline">
              All applications
            <ChevronRightIcon />
            </Link>
          </header>

          {queue.length === 0 ? (
            <p className="p-8 text-center text-sm text-navy-400">Nothing waiting. The queue is clear.</p>
          ) : (
            <table className="w-full">
              <thead className="border-b border-navy-50">
                <tr>
                  <th className="th">Intern</th>
                  <th className="th">Domain</th>
                  <th className="th">Att / Marks</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {queue.map((a) => {
                  const incomplete = a.attendance === null || a.marks === null || !a.start_date || !a.end_date;
                  return (
                    <tr key={a.id}>
                      <td className="td font-medium">{a.full_name}</td>
                      <td className="td text-navy-600">{a.domain}</td>
                      <td className="td">
                        {incomplete ? (
                          <span className="badge bg-amber-100 text-amber-800">Incomplete</span>
                        ) : (
                          <span className="text-xs text-navy-500">
                            {a.attendance}% / {a.marks}%
                          </span>
                        )}
                      </td>
                      <td className="td">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="td text-right">
                        <Link href={`/admin/applications/${a.id}`} className="btn-ghost btn-sm">
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* recent verifications */}
        <section className="card">
          <header className="border-b border-navy-100 px-5 py-3.5">
            <h2 className="font-bold text-navy-900">Recent verification checks</h2>
          </header>
          {recentChecks.length === 0 ? (
            <p className="p-8 text-center text-sm text-navy-400">No checks logged yet.</p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {recentChecks.map((v, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${v.found ? 'bg-emerald-500' : 'bg-red-500'}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-navy-700">{v.cert_no}</span>
                  <span className="badge bg-navy-50 text-navy-500">{v.source}</span>
                  <span className="shrink-0 text-[11px] text-navy-300">{v.created_at.slice(5, 16)}</span>
                </li>
              ))}
            </ul>
          )}
          {stats.failed_checks > 0 && (
            <p className="border-t border-navy-50 px-5 py-3 text-xs text-navy-500">
              <strong className="text-red-700">{stats.failed_checks}</strong> lookup(s) found no matching certificate —
              possible forgery attempts or typos.
            </p>
          )}
        </section>
      </div>

      {/* recently issued */}
      <section className="card mt-6">
        <header className="flex items-center justify-between border-b border-navy-100 px-5 py-3.5">
          <h2 className="font-bold text-navy-900">Recently issued certificates</h2>
          <Link href="/admin/certificates" className="text-sm font-medium text-brand-600 hover:underline">
            All certificates
            <ChevronRightIcon />
          </Link>
        </header>

        {recentCerts.length === 0 ? (
          <p className="p-8 text-center text-sm text-navy-400">No certificates issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem]">
              <thead className="border-b border-navy-50">
                <tr>
                  <th className="th">Certificate no.</th>
                  <th className="th">Intern</th>
                  <th className="th">Domain</th>
                  <th className="th">Issued</th>
                  <th className="th">Checks</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {recentCerts.map((c) => {
                  const d = JSON.parse(c.data) as Record<string, string>;
                  return (
                    <tr key={c.id}>
                      <td className="td font-mono text-xs font-semibold">{c.cert_no}</td>
                      <td className="td">{d.intern_name}</td>
                      <td className="td text-navy-600">{d.domain}</td>
                      <td className="td text-xs text-navy-500">{c.issued_on}</td>
                      <td className="td text-xs text-navy-500">{c.verify_count}</td>
                      <td className="td">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="td text-right">
                        <Link href={`/admin/certificates/${c.id}`} className="btn-ghost btn-sm">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
