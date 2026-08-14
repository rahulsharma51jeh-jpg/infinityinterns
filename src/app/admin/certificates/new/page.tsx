import Link from 'next/link';
import BackLink from '@/components/ui/BackLink';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { baseUrlFrom, getTemplate, qrDataUrl, sampleData } from '@/lib/certificate';
import CertificatePreview from '@/components/certificate/CertificatePreview';
import ManualCertificateForm from './ManualCertificateForm';

export const metadata: Metadata = { title: 'Generate a certificate manually' };
export const dynamic = 'force-dynamic';

export default async function NewCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const sp = await searchParams;

  const templates = db.prepare('SELECT id, name, is_default FROM templates ORDER BY is_default DESC, name').all() as {
    id: number;
    name: string;
    is_default: number;
  }[];

  const requested = Number(sp.template) || undefined;
  const tpl = getTemplate(requested);

  const h = await headers();
  const baseUrl = baseUrlFrom(h);
  const preview = {
    config: tpl.config,
    data: sampleData(tpl.config, baseUrl),
    qr: await qrDataUrl(`${baseUrl}/verify/IIN-2026-PREVIEW`, tpl.config.qr.color, 240),
  };

  return (
    <div>
      <BackLink href="/admin/certificates">All certificates</BackLink>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Generate a certificate manually</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-navy-500">
            For interns trained outside the portal, or to migrate an existing certificate under its original number. No
            application record is needed — the values you type are saved as the certificate&apos;s permanent record.
          </p>
        </div>
        <Link href="/admin/certificates/import" className="btn-ghost">
          Import many from Excel instead
        </Link>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="card p-6">
          <ManualCertificateForm
            fields={tpl.config.fields}
            templates={templates.map((t) => ({ id: t.id, name: t.name, isDefault: t.is_default === 1 }))}
            templateId={tpl.id}
          />
        </div>

        <div className="h-fit xl:sticky xl:top-24">
          <h2 className="mb-3 font-bold text-navy-900">Template preview</h2>
          <div className="overflow-hidden rounded-xl border border-navy-100 bg-white p-2 shadow-sm">
            <CertificatePreview view={preview} draftLabel="SAMPLE" />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-navy-400">
            Shown with sample values to illustrate the layout — your entries appear on the real certificate once
            generated. Adjust the design in the{' '}
            <Link href={`/admin/templates/${tpl.id}`} className="font-medium text-brand-600 hover:underline">
              certificate designer
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
