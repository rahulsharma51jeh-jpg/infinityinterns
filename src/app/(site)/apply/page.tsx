import Link from 'next/link';
import BackLink from '@/components/ui/BackLink';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { listPrograms } from '@/lib/queries';
import ApplyForm from './ApplyForm';
import Flash from '@/components/ui/Flash';

export const metadata: Metadata = {
  title: 'Apply for an internship',
  description: 'Submit your application for a mentor-guided online internship at Infinity Interns.',
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string; welcome?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/apply${sp.program ? `?program=${sp.program}` : ''}`)}`);
  if (user.role === 'admin') redirect('/admin/applications');

  const programs = listPrograms();
  const preselected = sp.program ? programs.find((p) => p.slug === sp.program) : undefined;

  const profile = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(user.id) as
    | { name: string; phone: string | null }
    | undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BackLink href="/programs">All domains</BackLink>

      <h1 className="mt-4 font-serif text-4xl text-navy-900">Apply for an internship</h1>
      <p className="mt-3 text-navy-500">
        Signed in as <span className="font-medium text-navy-800">{user.email}</span>.
      </p>

      <div className="mt-8">
        {sp.welcome && <Flash ok="Account created. Complete your application below to get started." />}

        {programs.length === 0 ? (
          <div className="card p-8 text-center text-navy-500">
            No internship domains are open for applications right now.
          </div>
        ) : (
          <div className="card p-6 sm:p-8">
            <ApplyForm
              programs={programs.map((p) => ({ id: p.id, title: p.title, duration: p.duration, mode: p.mode }))}
              defaultProgramId={preselected?.id}
              defaults={{ full_name: profile?.name ?? user.name, phone: profile?.phone ?? '' }}
            />
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-navy-400">
        Already applied?{' '}
        <Link href="/dashboard" className="font-semibold text-brand-600 hover:underline">
          Track it on your dashboard
        </Link>
      </p>
    </div>
  );
}
