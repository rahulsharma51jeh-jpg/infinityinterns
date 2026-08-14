import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { baseUrlFrom, certificateView, findCertificate } from '@/lib/certificate';
import CertificatePreview from '@/components/certificate/CertificatePreview';
import PrintToolbar from '@/components/certificate/PrintToolbar';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ certNo: string }> }): Promise<Metadata> {
  const { certNo } = await params;
  return { title: `Certificate ${decodeURIComponent(certNo)}` };
}

/** Standalone, print-ready page: no site chrome so the artwork owns the page. */
export default async function CertificatePage({ params }: { params: Promise<{ certNo: string }> }) {
  const { certNo: raw } = await params;
  const certNo = decodeURIComponent(raw);
  const cert = findCertificate(certNo);

  if (!cert) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-navy-900">Certificate not found</h1>
        <p className="mt-2 text-sm text-navy-500">
          No certificate exists with number <span className="font-mono">{certNo}</span>.
        </p>
        <Link href="/verify" className="btn-primary mt-6">
          Go to verification
        </Link>
      </div>
    );
  }

  const h = await headers();
  const view = await certificateView(cert, baseUrlFrom(h));

  return (
    <div className="min-h-screen bg-navy-50">
      <PrintToolbar certNo={cert.cert_no} verifyUrl={view.verifyUrl} backHref={`/verify/${cert.cert_no}`} />

      <div className="mx-auto max-w-[1180px] px-4 py-8">
        <div className="overflow-hidden rounded-xl bg-white p-2 shadow-xl">
          <CertificatePreview view={view} />
        </div>

        <p className="no-print mt-4 text-center text-xs text-navy-400">
          Verify this certificate at{' '}
          <Link href={`/verify/${cert.cert_no}`} className="font-medium text-navy-600 underline">
            {view.verifyUrl}
          </Link>
        </p>
      </div>
    </div>
  );
}
