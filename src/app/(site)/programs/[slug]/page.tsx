import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProgramBySlug, listPrograms } from '@/lib/queries';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProgramBySlug(slug);
  if (!p) return { title: 'Domain not found' };
  return { title: `${p.title} internship`, description: p.summary };
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = getProgramBySlug(slug);
  if (!program) notFound();

  const others = listPrograms().filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <>
      <section className="border-b border-navy-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <Link href="/programs" className="text-sm font-medium text-navy-500 hover:text-navy-800">
            ← All domains
          </Link>

          <div className="mt-4 flex items-center gap-2 text-xs font-semibold tracking-wide text-navy-400 uppercase">
            <span>{program.duration}</span>
            <span className="h-1 w-1 rounded-full bg-navy-200" />
            <span>{program.mode}</span>
            {program.is_active === 0 && <span className="badge bg-amber-100 text-amber-800">Closed</span>}
          </div>

          <h1 className="mt-2 font-serif text-4xl text-navy-900 sm:text-5xl">{program.title}</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-navy-500">{program.description || program.summary}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/apply?program=${program.slug}`} className="btn-brand px-6 py-3">
              Apply for this internship
            </Link>
            <Link href="/verify" className="btn-ghost px-6 py-3">
              Verify a certificate
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-navy-900">What you will learn</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-navy-700">
              {program.skillList.map((s) => (
                <li key={s} className="flex items-start gap-2.5">
                  <svg width="18" height="18" viewBox="0 0 20 20" className="mt-0.5 shrink-0" aria-hidden>
                    <circle cx="10" cy="10" r="9" fill="#dcfce7" />
                    <path d="M6 10.5 l2.5 2.5 L14 7" stroke="#059669" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-navy-900">At a glance</h2>
            <dl className="mt-4 divide-y divide-navy-50 text-sm">
              {[
                ['Duration', program.duration],
                ['Mode', program.mode],
                ['Stipend', program.stipend],
                ['Certificate', 'Auto-issued on approval, QR verifiable'],
                ['Eligibility', 'Diploma / UG / PG students and recent graduates'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-navy-400">{k}</dt>
                  <dd className="text-right font-medium text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {others.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-navy-900">Other domains</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {others.map((p) => (
                <Link key={p.id} href={`/programs/${p.slug}`} className="card p-4 hover:border-navy-300">
                  <p className="text-sm font-bold text-navy-900">{p.title}</p>
                  <p className="mt-1 text-xs text-navy-400">
                    {p.duration} · {p.mode}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
