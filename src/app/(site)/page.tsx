import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/Icons';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { listPrograms, publicStats } from '@/lib/queries';
import { baseUrlFrom, certificateView, type CertificateRow } from '@/lib/certificate';
import VerifyForm from '@/components/VerifyForm';
import CertificatePreview from '@/components/certificate/CertificatePreview';

export default async function HomePage() {
  const programs = listPrograms().slice(0, 6);
  const stats = publicStats();

  // Live sample: render the most recent real certificate so the artwork on the
  // marketing page is always the same artwork the portal actually issues.
  const h = await headers();
  const baseUrl = baseUrlFrom(h);
  const latest = db
    .prepare("SELECT * FROM certificates WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    .get() as CertificateRow | undefined;
  const sample = latest ? await certificateView(latest, baseUrl) : null;

  return (
    <>
      {/* ------------------------------- hero ------------------------------- */}
      <section className="relative overflow-hidden bg-navy-800 text-white">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-brand-600/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-navy-400/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="badge bg-white/10 text-navy-100 ring-1 ring-white/20">
              AICTE Approved · ISO 9001:2015 Certified
            </span>

            <h1 className="mt-5 font-serif text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
              Internships that end with a <span className="text-brand-400">verifiable</span> certificate.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-navy-100">
              Mentor-guided online internships across engineering, data and design. Finish your project, get approved,
              and your completion certificate is generated automatically — numbered, QR-coded and verifiable by anyone,
              forever.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/apply" className="btn-brand px-6 py-3 text-base">
                Apply for an internship
              </Link>
              <Link href="/programs" className="btn border border-white/25 bg-white/10 px-6 py-3 text-base text-white hover:bg-white/20">
                Browse domains
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {[
                { k: 'Certificates issued', v: stats.certificates },
                { k: 'Internship domains', v: stats.programs },
                { k: 'Interns onboarded', v: stats.interns },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-xs tracking-wide text-navy-200 uppercase">{s.k}</dt>
                  <dd className="mt-1 text-2xl font-bold">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* verify card */}
          <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 2 l8 3 v7c0 5-4 8.5-8 10-4-1.5-8-5-8-10V5z" stroke="#059669" strokeWidth="1.8" />
                  <path d="M8.5 12 l2.5 2.5 l4.5-5" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <h2 className="text-lg font-bold text-navy-900">Verify a certificate</h2>
                <p className="mt-1 text-sm text-navy-500">
                  Recruiters and institutions can confirm any Infinity Interns certificate instantly — no login needed.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <VerifyForm size="lg" />
            </div>

            <p className="mt-3 text-xs text-navy-400">
              Enter the certificate number printed on the document, or simply scan its QR code with any phone camera.
            </p>

            {sample && (
              <div className="mt-5 rounded-lg border border-navy-100 bg-navy-50 p-3 text-xs text-navy-600">
                Try it with a live sample:{' '}
                <Link href={`/verify/${sample.cert.cert_no}`} className="font-mono font-semibold text-brand-600 hover:underline">
                  {sample.cert.cert_no}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------- how it works --------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-serif text-3xl text-navy-900 sm:text-4xl">How it works</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-navy-500">
          Four steps from application to a certificate a recruiter can trust.
        </p>

        <ol className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            { n: '01', t: 'Apply online', d: 'Pick a domain, submit your college and course details. Takes two minutes.' },
            { n: '02', t: 'Train & submit', d: 'Work through mentor-guided assignments and submit your capstone project.' },
            { n: '03', t: 'Admin verifies', d: 'Our team reviews attendance and assessment marks before anything is issued.' },
            { n: '04', t: 'Certificate issued', d: 'On approval the certificate is generated automatically with a unique number and QR code.' },
          ].map((s) => (
            <li key={s.n} className="card relative p-6">
              <span className="font-serif text-4xl font-bold text-navy-100">{s.n}</span>
              <h3 className="mt-2 text-lg font-bold text-navy-900">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------ programs ----------------------------- */}
      <section className="border-y border-navy-100 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl text-navy-900 sm:text-4xl">Internship domains</h2>
              <p className="mt-2 text-navy-500">Live, mentor-led cohorts with real deliverables.</p>
            </div>
            <Link href="/programs" className="btn-ghost">
              View all {stats.programs} domains
            <ChevronRightIcon />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <Link
                key={p.id}
                href={`/programs/${p.slug}`}
                className="card group p-6 transition hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-navy-400 uppercase">
                  <span>{p.duration}</span>
                  <span className="h-1 w-1 rounded-full bg-navy-200" />
                  <span>{p.mode}</span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-navy-900 group-hover:text-brand-600">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">{p.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.skillList.slice(0, 3).map((s) => (
                    <span key={s} className="badge bg-navy-50 text-navy-600">
                      {s}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- sample artwork -------------------------- */}
      {sample && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="font-serif text-3xl text-navy-900 sm:text-4xl">Your certificate, tamper-evident</h2>
              <p className="mt-4 leading-relaxed text-navy-500">
                Every certificate is issued against a frozen snapshot of your verified record. The QR code and the
                certificate number both resolve to a public page showing exactly what we hold on file — so nothing can
                be quietly edited after the fact.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-navy-700">
                {[
                  'Unique, sequential certificate number',
                  'QR code linking straight to public verification',
                  'Revocation is reflected instantly on the verify page',
                  'Download as PDF or print at A4 landscape',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <svg width="18" height="18" viewBox="0 0 20 20" className="mt-0.5 shrink-0" aria-hidden>
                      <circle cx="10" cy="10" r="9" fill="#dcfce7" />
                      <path d="M6 10.5 l2.5 2.5 L14 7" stroke="#059669" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
              <Link href={`/verify/${sample.cert.cert_no}`} className="btn-primary mt-8">
                See a verified certificate
              </Link>
            </div>

            <div className="lg:col-span-3">
              <div className="overflow-hidden rounded-xl border border-navy-100 bg-white p-2 shadow-lg">
                <CertificatePreview view={sample} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------- CTA -------------------------------- */}
      <section className="bg-navy-800 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-serif text-3xl sm:text-4xl">Ready to start your internship?</h2>
          <p className="mt-4 text-navy-100">
            Applications are reviewed on a rolling basis. Pick your domain and apply today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/apply" className="btn-brand px-6 py-3 text-base">
              Apply now
            </Link>
            <Link href="/verify" className="btn border border-white/25 bg-white/10 px-6 py-3 text-base text-white hover:bg-white/20">
              Verify a certificate
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
