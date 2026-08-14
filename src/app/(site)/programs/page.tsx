import Link from 'next/link';
import type { Metadata } from 'next';
import { listPrograms } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Internship domains',
  description:
    'Browse mentor-guided online internship domains at Infinity Interns — AutoCAD, web development, data science, machine learning, cyber security and more.',
};

export default function ProgramsPage() {
  const programs = listPrograms();

  return (
    <>
      <section className="border-b border-navy-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h1 className="font-serif text-4xl text-navy-900 sm:text-5xl">Internship domains</h1>
          <p className="mt-4 max-w-2xl text-navy-500">
            Every domain runs as a mentor-guided online cohort with weekly assignments, a graded capstone project and a
            QR-verifiable completion certificate.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <div key={p.id} className="card flex flex-col p-6">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-navy-400 uppercase">
                <span>{p.duration}</span>
                <span className="h-1 w-1 rounded-full bg-navy-200" />
                <span>{p.mode}</span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-navy-900">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-500">{p.summary}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.skillList.map((s) => (
                  <span key={s} className="badge bg-navy-50 text-navy-600">
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex gap-2">
                <Link href={`/programs/${p.slug}`} className="btn-ghost btn-sm flex-1">
                  Details
                </Link>
                <Link href={`/apply?program=${p.slug}`} className="btn-brand btn-sm flex-1">
                  Apply
                </Link>
              </div>
            </div>
          ))}
        </div>

        {programs.length === 0 && (
          <p className="py-20 text-center text-navy-400">No internship domains are open right now. Please check back soon.</p>
        )}
      </section>
    </>
  );
}
