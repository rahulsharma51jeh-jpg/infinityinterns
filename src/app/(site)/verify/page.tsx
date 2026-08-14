import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import VerifyForm from '@/components/VerifyForm';
import { publicStats } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Verify a certificate',
  description:
    'Confirm the authenticity of any Infinity Interns internship certificate using its certificate number or by scanning the QR code printed on it.',
};

const FAQ = [
  {
    q: 'Where do I find the certificate number?',
    a: 'It is printed beneath the QR code on the certificate, in the format IIN-YYYY-NNNNN. Case and spacing do not matter.',
  },
  {
    q: 'Can I scan the QR code instead?',
    a: 'Yes. Every certificate carries a QR code that opens this verification page for that specific certificate directly — no typing required.',
  },
  {
    q: 'What does a verified result prove?',
    a: 'It confirms the certificate was issued by Infinity Interns and shows the exact record we hold: intern name, institute, domain, dates, attendance and assessment marks.',
  },
  {
    q: 'What if the result says revoked?',
    a: 'A revoked certificate is no longer valid and must not be relied on. The verification page shows the reason recorded by our team.',
  },
  {
    q: 'Is there an API for bulk verification?',
    a: 'Yes. Send a GET request to /api/verify/{certificateNumber} and you will receive a JSON payload with the same information shown here.',
  },
];

export default async function VerifyLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string; notfound?: string }>;
}) {
  const sp = await searchParams;

  // The lookup form posts here via GET; send it on to the canonical URL.
  if (sp.cert) {
    const clean = sp.cert.trim().replace(/\s+/g, '').toUpperCase();
    if (clean) redirect(`/verify/${encodeURIComponent(clean)}`);
  }

  const stats = publicStats();

  return (
    <>
      <section className="border-b border-navy-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <span className="badge bg-emerald-50 text-emerald-700">Public verification</span>
          <h1 className="mt-4 font-serif text-4xl text-navy-900 sm:text-5xl">Verify a certificate</h1>
          <p className="mt-4 text-navy-500">
            Enter the certificate number exactly as printed, or scan the QR code on the document with any phone camera.
          </p>

          <div className="mt-8 text-left">
            <VerifyForm size="lg" autoFocus defaultValue={sp.notfound ?? ''} />
          </div>

          <p className="mt-4 text-xs text-navy-400">
            {stats.certificates} active certificate{stats.certificates === 1 ? '' : 's'} on record ·{' '}
            {stats.verifications} verification{stats.verifications === 1 ? '' : 's'} performed
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="font-serif text-2xl text-navy-900">Frequently asked</h2>
        <dl className="mt-6 divide-y divide-navy-100 border-t border-navy-100">
          {FAQ.map((f) => (
            <div key={f.q} className="py-5">
              <dt className="font-semibold text-navy-900">{f.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-navy-500">{f.a}</dd>
            </div>
          ))}
        </dl>

        <div className="card mt-8 p-5">
          <h3 className="text-sm font-bold text-navy-900">Verification API</h3>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-navy-800 p-4 text-xs leading-relaxed text-navy-100">
{`GET /api/verify/IIN-2026-01001

{
  "found": true,
  "valid": true,
  "status": "active",
  "certificate_no": "IIN-2026-01001",
  "intern_name": "Mausam Kumari",
  "institute": "Government Polytechnic Barh",
  "domain": "AutoCAD",
  "issued_on": "2026-08-14",
  "verify_url": "https://.../verify/IIN-2026-01001"
}`}
          </pre>
        </div>
      </section>
    </>
  );
}
