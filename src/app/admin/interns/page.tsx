import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import ActionForm from '@/components/ui/ActionForm';
import SubmitButton from '@/components/ui/SubmitButton';
import Flash from '@/components/ui/Flash';
import { resetUserPassword, setUserRole } from '../actions';

export const metadata: Metadata = { title: 'Users' };
export const dynamic = 'force-dynamic';

interface Row {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
  apps: number;
  certs: number;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; reset?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();

  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id)  AS apps,
              (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id)  AS certs
         FROM users u
        ${q ? 'WHERE u.name LIKE ? OR u.email LIKE ?' : ''}
        ORDER BY u.role = 'admin' DESC, u.created_at DESC`,
    )
    .all(...(q ? [`%${q}%`, `%${q}%`] : [])) as Row[];

  const resetting = sp.reset ? rows.find((r) => String(r.id) === sp.reset) : undefined;

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy-900">Users</h1>
      <p className="mt-1.5 text-sm text-navy-500">
        {rows.length} account{rows.length === 1 ? '' : 's'}. Promote a trusted colleague to administrator to let them
        approve applications and edit certificate designs.
      </p>

      <div className="mt-5">
        <Flash error={sp.error} />
      </div>

      <form action="/admin/interns" method="get" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or email…" className="input max-w-sm" aria-label="Search users" />
        <button type="submit" className="btn-ghost btn-sm">
          Search
        </button>
      </form>

      {resetting && (
        <section className="card mt-5 p-5">
          <h2 className="font-bold text-navy-900">Reset password for {resetting.name}</h2>
          <p className="mt-1 mb-4 text-xs text-navy-400">
            Sets a new password immediately. Share it with the user over a secure channel and ask them to change it.
          </p>
          <ActionForm action={resetUserPassword} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={resetting.id} />
            <div className="min-w-56 flex-1">
              <label className="label" htmlFor="password">New password</label>
              <input id="password" name="password" type="text" required minLength={8} className="input" placeholder="At least 8 characters" />
            </div>
            <SubmitButton className="btn-primary" pendingText="Resetting…">
              Set password
            </SubmitButton>
            <Link href="/admin/interns" className="btn-ghost">
              Cancel
            </Link>
          </ActionForm>
        </section>
      )}

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[46rem]">
          <thead className="border-b border-navy-100 bg-navy-50">
            <tr>
              <th className="th">User</th>
              <th className="th">Phone</th>
              <th className="th">Applications</th>
              <th className="th">Certificates</th>
              <th className="th">Joined</th>
              <th className="th">Role</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="td">
                  <p className="font-semibold text-navy-900">{u.name}</p>
                  <p className="text-xs text-navy-400">{u.email}</p>
                </td>
                <td className="td text-xs text-navy-500">{u.phone || '—'}</td>
                <td className="td text-sm text-navy-600">{u.apps}</td>
                <td className="td text-sm text-navy-600">{u.certs}</td>
                <td className="td text-xs text-navy-400">{u.created_at.slice(0, 10)}</td>
                <td className="td">
                  <span className={`badge ${u.role === 'admin' ? 'bg-navy-700 text-white' : 'bg-navy-100 text-navy-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="td text-right">
                  <div className="flex justify-end gap-1.5">
                    <Link href={`/admin/interns?reset=${u.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="btn-ghost btn-sm">
                      Reset password
                    </Link>
                    <form action={setUserRole}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="role" value={u.role === 'admin' ? 'intern' : 'admin'} />
                      <SubmitButton
                        className="btn-ghost btn-sm"
                        confirm={
                          u.role === 'admin'
                            ? `Remove administrator access from ${u.name}?`
                            : `Give ${u.name} full administrator access?`
                        }
                      >
                        {u.role === 'admin' ? 'Demote' : 'Make admin'}
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && <p className="p-10 text-center text-sm text-navy-400">No users match that search.</p>}
      </div>
    </div>
  );
}
