import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import StatusBadge from '@/components/ui/StatusBadge';
import ActionForm from '@/components/ui/ActionForm';
import SubmitButton from '@/components/ui/SubmitButton';
import { bulkApprove } from '../actions';

export const metadata: Metadata = { title: 'Applications' };
export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Awaiting review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

interface Row {
  id: number;
  full_name: string;
  email: string;
  college: string;
  domain: string;
  duration: string;
  mode: string;
  status: string;
  attendance: number | null;
  marks: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  cert_no: string | null;
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? 'all';
  const q = (sp.q ?? '').trim();

  const where: string[] = [];
  const args: unknown[] = [];

  if (status === 'pending') where.push("a.status IN ('pending','under_review')");
  else if (status !== 'all') {
    where.push('a.status = ?');
    args.push(status);
  }

  if (q) {
    where.push('(a.full_name LIKE ? OR a.email LIKE ? OR a.college LIKE ? OR a.domain LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like, like);
  }

  const rows = db
    .prepare(
      `SELECT a.id, a.full_name, a.email, a.college, a.domain, a.duration, a.mode, a.status,
              a.attendance, a.marks, a.start_date, a.end_date, a.created_at, c.cert_no
         FROM applications a
         LEFT JOIN certificates c ON c.application_id = a.id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'under_review' THEN 1 ELSE 2 END, a.created_at DESC`,
    )
    .all(...args) as Row[];

  const approvable = rows.filter(
    (r) =>
      (r.status === 'pending' || r.status === 'under_review') &&
      r.attendance !== null &&
      r.marks !== null &&
      r.start_date &&
      r.end_date,
  );

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy-900">Applications</h1>
      <p className="mt-1.5 text-sm text-navy-500">
        Approving an application generates its certificate automatically. Records missing attendance, marks or dates
        cannot be approved.
      </p>

      {/* filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/applications?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={`btn btn-sm ${
                status === f.key ? 'bg-navy-700 text-white' : 'border border-navy-200 bg-white text-navy-700 hover:bg-navy-50'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <form action="/admin/applications" method="get" className="ml-auto flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, college, domain…"
            className="input w-64"
            aria-label="Search applications"
          />
          <button type="submit" className="btn-ghost btn-sm">
            Search
          </button>
        </form>
      </div>

      {/* table + bulk approve */}
      <ActionForm action={bulkApprove} className="mt-5">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-navy-50 px-4 py-3">
            <p className="text-sm text-navy-600">
              {rows.length} application{rows.length === 1 ? '' : 's'}
              {approvable.length > 0 && (
                <span className="text-navy-400"> · {approvable.length} ready to approve</span>
              )}
            </p>
            <SubmitButton
              className="btn-primary btn-sm"
              pendingText="Approving…"
              confirm="Approve all selected applications and generate their certificates?"
            >
              Approve selected & issue certificates
            </SubmitButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem]">
              <thead className="border-b border-navy-100">
                <tr>
                  <th className="th w-10"></th>
                  <th className="th">Intern</th>
                  <th className="th">Domain</th>
                  <th className="th">Period</th>
                  <th className="th">Att / Marks</th>
                  <th className="th">Applied</th>
                  <th className="th">Status</th>
                  <th className="th">Certificate</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {rows.map((r) => {
                  const ready =
                    r.attendance !== null && r.marks !== null && Boolean(r.start_date) && Boolean(r.end_date);
                  const open = r.status === 'pending' || r.status === 'under_review';
                  return (
                    <tr key={r.id} className={open ? '' : 'bg-navy-50/40'}>
                      <td className="td">
                        <input
                          type="checkbox"
                          name="ids"
                          value={r.id}
                          disabled={!open || !ready}
                          title={
                            !open
                              ? 'Already reviewed'
                              : !ready
                                ? 'Add attendance, marks and dates first'
                                : 'Select for bulk approval'
                          }
                          className="h-4 w-4 rounded border-navy-300 disabled:opacity-30"
                        />
                      </td>
                      <td className="td">
                        <p className="font-semibold text-navy-900">{r.full_name}</p>
                        <p className="text-xs text-navy-400">{r.email}</p>
                        <p className="text-xs text-navy-400">{r.college}</p>
                      </td>
                      <td className="td">
                        <p className="text-navy-800">{r.domain}</p>
                        <p className="text-xs text-navy-400">
                          {r.duration} · {r.mode}
                        </p>
                      </td>
                      <td className="td text-xs text-navy-500">
                        {r.start_date ? `${r.start_date} → ${r.end_date ?? '—'}` : <span className="text-amber-700">Not set</span>}
                      </td>
                      <td className="td text-xs">
                        {ready ? (
                          <span className="text-navy-600">
                            {r.attendance}% / {r.marks}%
                          </span>
                        ) : (
                          <span className="badge bg-amber-100 text-amber-800">Incomplete</span>
                        )}
                      </td>
                      <td className="td text-xs text-navy-400">{r.created_at.slice(0, 10)}</td>
                      <td className="td">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="td">
                        {r.cert_no ? (
                          <Link href={`/verify/${r.cert_no}`} className="font-mono text-xs font-semibold text-brand-600 hover:underline">
                            {r.cert_no}
                          </Link>
                        ) : (
                          <span className="text-xs text-navy-300">—</span>
                        )}
                      </td>
                      <td className="td text-right">
                        <Link href={`/admin/applications/${r.id}`} className="btn-ghost btn-sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && <p className="p-10 text-center text-sm text-navy-400">No applications match this filter.</p>}
        </div>
      </ActionForm>
    </div>
  );
}
