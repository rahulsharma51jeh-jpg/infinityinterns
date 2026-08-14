import Link from 'next/link';
import type { Metadata } from 'next';
import { publicStats } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'About us',
  description:
    'Infinity Interns is a unit of Infinity1 Career Counselling Private Limited, offering AICTE-approved, ISO 9001:2015 certified online internship programmes with verifiable certificates.',
};

export default function AboutPage() {
  const stats = publicStats();

  return (
    <>
      <section className="border-b border-navy-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <h1 className="font-serif text-4xl text-navy-900 sm:text-5xl">About Infinity Interns</h1>
          <p className="mt-4 leading-relaxed text-navy-500">
            Infinity Interns is a unit of <strong className="text-navy-800">Infinity1 Career Counselling Private
            Limited</strong>. We run structured, mentor-guided online internships that give students something concrete
            to show for their time — a real project, and a certificate anybody can verify.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { k: 'Certificates issued', v: stats.certificates },
            { k: 'Domains', v: stats.programs },
            { k: 'Interns', v: stats.interns },
            { k: 'Verifications', v: stats.verifications },
          ].map((s) => (
            <div key={s.k} className="card p-5 text-center">
              <p className="text-3xl font-bold text-navy-900">{s.v}</p>
              <p className="mt-1 text-xs tracking-wide text-navy-400 uppercase">{s.k}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-8">
          <div>
            <h2 className="font-serif text-2xl text-navy-900">Why verification matters</h2>
            <p className="mt-3 leading-relaxed text-navy-500">
              Internship certificates are easy to fake and hard to check. That asymmetry hurts the students who actually
              did the work. So every certificate we issue is generated from our own database — never from a template a
              student can edit — carries a unique sequential number, and prints a QR code that resolves to a public
              record page. A recruiter needs three seconds and a phone camera.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-navy-900">How approval works</h2>
            <p className="mt-3 leading-relaxed text-navy-500">
              Nothing is issued automatically on enrolment. An administrator reviews the intern&apos;s attendance and
              final assessment marks first. Only when the application is marked <strong>approved</strong> does the system
              mint a certificate, freezing a snapshot of the verified record at that moment. Later edits to the
              application never rewrite an issued certificate — and if a certificate has to be withdrawn, revoking it is
              reflected on the public verify page immediately.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-navy-900">Accreditation</h2>
            <div className="mt-4 flex flex-wrap items-center gap-6">
              {[
                ['/logos/aicte.svg', 'AICTE'],
                ['/logos/iso.svg', 'ISO 9001:2015'],
                ['/logos/msme.svg', 'Ministry of MSME'],
                ['/logos/mca.svg', 'Ministry of Corporate Affairs'],
                ['/logos/nip.svg', 'National Internship Portal'],
              ].map(([src, alt]) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={alt} src={src} alt={alt} className="h-12 w-auto" />
              ))}
            </div>
            <p className="mt-4 text-sm text-navy-400">AICTE Approved and ISO 9001:2015 Certified Platform.</p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/apply" className="btn-brand px-6 py-3">
            Apply for an internship
          </Link>
          <Link href="/contact" className="btn-ghost px-6 py-3">
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}
