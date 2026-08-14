import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-navy-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/infinity-interns.svg" alt="Infinity Interns" className="h-14 w-auto" />
          <p className="mt-3 max-w-md text-sm leading-relaxed text-navy-500">
            A unit of Infinity1 Career Counselling Private Limited. Mentor-guided online internships with
            industry-relevant projects and QR-verifiable completion certificates.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 opacity-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/aicte.svg" alt="AICTE" className="h-11 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/iso.svg" alt="ISO 9001:2015 certified" className="h-11 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/msme.svg" alt="Ministry of MSME" className="h-9 w-auto" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-navy-900">Portal</h3>
          <ul className="mt-3 space-y-2 text-sm text-navy-600">
            <li><Link className="hover:text-navy-900" href="/programs">Internship domains</Link></li>
            <li><Link className="hover:text-navy-900" href="/apply">Apply now</Link></li>
            <li><Link className="hover:text-navy-900" href="/login">Intern sign in</Link></li>
            <li><Link className="hover:text-navy-900" href="/dashboard">My certificates</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-navy-900">Verification</h3>
          <ul className="mt-3 space-y-2 text-sm text-navy-600">
            <li><Link className="hover:text-navy-900" href="/verify">Verify a certificate</Link></li>
            <li><Link className="hover:text-navy-900" href="/about">About us</Link></li>
            <li><Link className="hover:text-navy-900" href="/contact">Contact</Link></li>
            <li>
              <a className="hover:text-navy-900" href="mailto:info@infinityinterns.com">
                info@infinityinterns.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-navy-50 px-4 py-5 text-center text-xs text-navy-400 sm:px-6">
        © {new Date().getFullYear()} Infinity1 Career Counselling Private Limited. All rights reserved.
        <span className="mx-2">·</span>
        AICTE Approved and ISO 9001:2015 Certified Platform
      </div>
    </footer>
  );
}
