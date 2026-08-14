import Link from 'next/link';
import type { Metadata } from 'next';
import VerifyForm from '@/components/VerifyForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Infinity Interns team about applications, certificates or verification queries.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-4xl text-navy-900 sm:text-5xl">Contact us</h1>
      <p className="mt-4 max-w-2xl text-navy-500">
        Questions about an application, a certificate, or a verification result? Reach out and our team will get back to
        you.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy-900">General &amp; support</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs tracking-wide text-navy-400 uppercase">Email</dt>
              <dd>
                <a className="font-medium text-brand-600 hover:underline" href="mailto:info@infinityinterns.com">
                  info@infinityinterns.com
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-navy-400 uppercase">Organisation</dt>
              <dd className="font-medium text-navy-900">Infinity1 Career Counselling Private Limited</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-navy-400 uppercase">Response time</dt>
              <dd className="font-medium text-navy-900">Within 2 working days</dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy-900">Report a suspicious certificate</h2>
          <p className="mt-2 text-sm leading-relaxed text-navy-500">
            If a certificate claims to be from Infinity Interns but fails verification, check the number below and then
            email us the details so we can investigate.
          </p>
          <div className="mt-4">
            <VerifyForm />
          </div>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-lg font-bold text-navy-900">Common requests</h2>
        <ul className="mt-4 space-y-3 text-sm text-navy-600">
          <li>
            <strong className="text-navy-900">Certificate not issued yet?</strong> Check your{' '}
            <Link href="/dashboard" className="font-medium text-brand-600 hover:underline">
              dashboard
            </Link>
            . Certificates appear the moment an administrator approves your application.
          </li>
          <li>
            <strong className="text-navy-900">Name or college spelled wrong?</strong> Email us with your certificate
            number — we will correct the record and re-issue.
          </li>
          <li>
            <strong className="text-navy-900">Need bulk verification?</strong> Use the public JSON API documented on the{' '}
            <Link href="/verify" className="font-medium text-brand-600 hover:underline">
              verify page
            </Link>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
