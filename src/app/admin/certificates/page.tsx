import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import StatusBadge from '@/components/ui/StatusBadge';
import Flash from '@/components/ui/Flash';

export const metadata: Metadata = { title: 'Certificates' };
export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'revoked', label: 'Revoked' },
];

interface Row {
  id: number;
  cert_no: string;
  data: string;
  status: string;
  issued_on: string;
  verify_count: number;
  last_verified: string | null;
  template_name: string;
  application_id: number | null;
}

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? 'all';
  const q = (sp.q ?? '').trim();

  const where: string[] = [];
  const args: unknown[] = [];

  if (status !== 'all') {
    where.push('c.status = ?');
    args.push(status);
  }
  if (q) {
    where.push('(c.cert_no LIKE ? OR c.data LIKE ?)');
    args.push(`%${q}%`, `%${q}%`);
  }

  const rows = db
    .prepare(
      `SELECT c.id, c.cert_no, c.data, c.status, c.issued_on, c.verify_count, c.last_verified, c.application_id,
              t.name AS template_name
         FROM certificates c
         JOIN templates t ON t.id = c.template_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY c.id DESC`,
    )
    .all(...args) as Row[];

  const totals = db
    .prepare(
      `SELECT COUNT(*) total,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)  active,
              SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) revoked,
              COALESCE(SUM(verify_count), 0) checks
         FROM certificates`,
    )
    .get() as { total: number; active: number; revoked: number; checks: number };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Certificates</h1>
          <p className="mt-1.5 text-sm text-navy-500">
            {totals.total} issued · {totals.active} active · {totals.revoked} revoked · {totals.checks} public
            verification{totals.checks === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/certificates/import" className="btn-primary">
            Import from Excel
          </Link>
          <Link href="/admin/certificates/new" className="btn-ghost">
            + Generate manually
          </Link>
        </div>
      </div>

      <p className="mt-3 rounded-lg border border-navy-100 bg-white px-4 py-2.5 text-xs text-navy-500">
        Certificates are normally created automatically when an application is approved. Use{' '}
        <strong className="text-navy-700">Generate manually</strong> for interns trained outside the portal, and{' '}
        <strong className="text-navy-700">Import from Excel</strong> to issue a whole batch at once.
      </p>

      <div className="mt-5">
        <Flash ok={sp.ok} error={sp.error} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/certificates?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={`btn btn-sm ${
                status === f.key ? 'bg-navy-700 text-white' : 'border border-navy-200 bg-white text-navy-700 hover:bg-navy-50'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <form action="/admin/certificates" method="get" className="ml-auto flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search certificate no. or intern…"
            className="input w-64"
            aria-label="Search certificates"
          />
          <button type="submit" className="btn-ghost btn-sm">
            Search
          </button>
        </form>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[58rem]">
          <thead className="border-b border-navy-100 bg-navy-50">
            <tr>
              <th className="th">Certificate no.</th>
              <th className="th">Intern</th>
              <th className="th">Domain</th>
              <th className="th">Source</th>
              <th className="th">Template</th>
              <th className="th">Issued</th>
              <th className="th">Checks</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {rows.map((r) => {
              const d = JSON.parse(r.data) as Record<string, string>;
              return (
                <tr key={r.id} className={r.status === 'revoked' ? 'bg-red-50/40' : ''}>
                  <td className="td">
                    <Link href={`/verify/${r.cert_no}`} className="font-mono text-xs font-semibold text-brand-600 hover:underline">
                      {r.cert_no}
                    </Link>
                  </td>
                  <td className="td">
                    <p className="font-medium text-navy-900">{d.intern_name}</p>
                    <p className="text-xs text-navy-400">{d.college}</p>
                  </td>
                  <td className="td text-navy-600">{d.domain}</td>
                  <td className="td">
                    {r.application_id ? (
                      <Link
                        href={`/admin/applications/${r.application_id}`}
                        className="badge bg-navy-100 text-navy-600 hover:bg-navy-200"
                        title="Issued on approval of an application"
                      >
                        Application
                      </Link>
                    ) : (
                      <span className="badge bg-sky-100 text-sky-800" title="Entered manually or imported from a spreadsheet">
                        Manual
                      </span>
                    )}
                  </td>
                  <td className="td text-xs text-navy-400">{r.template_name}</td>
                  <td className="td text-xs text-navy-500">{r.issued_on}</td>
                  <td className="td text-xs text-navy-500">
                    {r.verify_count}
                    {r.last_verified && <span className="block text-[11px] text-navy-300">{r.last_verified.slice(0, 10)}</span>}
                  </td>
                  <td className="td">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="td text-right">
                    <div className="flex justify-end gap-1.5">
                      <Link href={`/certificate/${r.cert_no}`} className="btn-ghost btn-sm">
                        Print
                      </Link>
                      <Link href={`/admin/certificates/${r.id}`} className="btn-ghost btn-sm">
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="p-10 text-center text-sm text-navy-400">
            No certificates match. Approve an application to generate one.
          </p>
        )}
      </div>
    </div>
  );
}
