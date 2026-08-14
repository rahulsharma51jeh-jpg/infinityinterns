import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { listPrograms } from '@/lib/queries';
import ActionForm from '@/components/ui/ActionForm';
import SubmitButton from '@/components/ui/SubmitButton';
import { saveProgram, toggleProgram } from '../actions';

export const metadata: Metadata = { title: 'Internship domains' };
export const dynamic = 'force-dynamic';

export default async function AdminProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const sp = await searchParams;
  const programs = listPrograms(false);
  const editing = sp.edit ? programs.find((p) => String(p.id) === sp.edit) : undefined;

  const counts = db
    .prepare('SELECT program_id, COUNT(*) c FROM applications GROUP BY program_id')
    .all() as { program_id: number; c: number }[];
  const countFor = (id: number) => counts.find((c) => c.program_id === id)?.c ?? 0;

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy-900">Internship domains</h1>
      <p className="mt-1.5 text-sm text-navy-500">
        Domains applicants can choose from. Closing a domain hides it from the public site but keeps existing
        applications intact.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[24rem_1fr]">
        {/* create / edit */}
        <section className="card h-fit p-5">
          <h2 className="font-bold text-navy-900">{editing ? `Edit “${editing.title}”` : 'Add a domain'}</h2>

          <ActionForm action={saveProgram} className="mt-4 space-y-3">
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <div>
              <label className="label" htmlFor="title">Title</label>
              <input id="title" name="title" required defaultValue={editing?.title ?? ''} className="input" placeholder="AutoCAD" />
            </div>

            <div>
              <label className="label" htmlFor="slug">URL slug</label>
              <input id="slug" name="slug" required defaultValue={editing?.slug ?? ''} className="input font-mono text-xs" placeholder="autocad" />
            </div>

            <div>
              <label className="label" htmlFor="summary">Summary</label>
              <textarea id="summary" name="summary" rows={2} defaultValue={editing?.summary ?? ''} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="description">Full description</label>
              <textarea id="description" name="description" rows={4} defaultValue={editing?.description ?? ''} className="input" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="duration">Duration</label>
                <input id="duration" name="duration" required defaultValue={editing?.duration ?? '4 Weeks'} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="mode">Mode</label>
                <select id="mode" name="mode" defaultValue={editing?.mode ?? 'Online'} className="input">
                  {['Online', 'Offline', 'Hybrid'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="stipend">Stipend note</label>
              <input id="stipend" name="stipend" defaultValue={editing?.stipend ?? 'Unpaid / Certificate based'} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="skills">Skills (comma separated)</label>
              <input id="skills" name="skills" defaultValue={editing?.skillList.join(', ') ?? ''} className="input" placeholder="2D Drafting, 3D Modelling" />
            </div>

            <div>
              <label className="label" htmlFor="is_active">Visibility</label>
              <select id="is_active" name="is_active" defaultValue={String(editing?.is_active ?? 1)} className="input">
                <option value="1">Open — accepting applications</option>
                <option value="0">Closed — hidden from public site</option>
              </select>
            </div>

            <div className="flex gap-2">
              <SubmitButton className="btn-primary" pendingText="Saving…">
                {editing ? 'Save changes' : 'Create domain'}
              </SubmitButton>
              {editing && (
                <a href="/admin/programs" className="btn-ghost">
                  Cancel
                </a>
              )}
            </div>
          </ActionForm>
        </section>

        {/* list */}
        <section className="card overflow-x-auto">
          <table className="w-full min-w-[40rem]">
            <thead className="border-b border-navy-100 bg-navy-50">
              <tr>
                <th className="th">Domain</th>
                <th className="th">Duration</th>
                <th className="th">Applications</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {programs.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'bg-navy-50/40'}>
                  <td className="td">
                    <p className="font-semibold text-navy-900">{p.title}</p>
                    <p className="font-mono text-xs text-navy-400">/{p.slug}</p>
                  </td>
                  <td className="td text-xs text-navy-500">
                    {p.duration} · {p.mode}
                  </td>
                  <td className="td text-sm text-navy-600">{countFor(p.id)}</td>
                  <td className="td">
                    <span className={`badge ${p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-navy-100 text-navy-600'}`}>
                      {p.is_active ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td className="td text-right">
                    <div className="flex justify-end gap-1.5">
                      <a href={`/admin/programs?edit=${p.id}`} className="btn-ghost btn-sm">
                        Edit
                      </a>
                      <form action={toggleProgram}>
                        <input type="hidden" name="id" value={p.id} />
                        <SubmitButton className="btn-ghost btn-sm">{p.is_active ? 'Close' : 'Open'}</SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {programs.length === 0 && <p className="p-10 text-center text-sm text-navy-400">No domains yet.</p>}
        </section>
      </div>
    </div>
  );
}
