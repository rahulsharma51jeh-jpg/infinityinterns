import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-800 p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-navy-400/25 blur-3xl"
        />

        <Link href="/" className="relative inline-block w-fit rounded-xl bg-white/95 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/infinity-interns.svg" alt="Infinity Interns" className="h-14 w-auto" />
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl leading-tight">Internships that leave a verifiable trail.</h2>
          <p className="mt-4 text-navy-100">
            Every completion certificate carries a unique number and a QR code, so recruiters can confirm it in
            seconds — no phone calls, no email chains.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-navy-100">
            {[
              'Mentor-guided projects across 8+ domains',
              'Certificate issued automatically on approval',
              'Public QR verification, valid for life',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-navy-200">
          AICTE Approved and ISO 9001:2015 Certified Platform · Infinity1 Career Counselling Private Limited
        </p>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center bg-white px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-block lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/infinity-interns.svg" alt="Infinity Interns" className="h-12 w-auto" />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
