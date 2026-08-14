import Link from 'next/link';
import BackLink from '@/components/ui/BackLink';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getTemplate } from '@/lib/certificate';
import { EXTRA_COLUMNS } from '@/lib/importColumns';
import ImportWizard, { type ImportTemplate } from './ImportWizard';

export const metadata: Metadata = { title: 'Import certificates from Excel' };
export const dynamic = 'force-dynamic';

export default function ImportCertificatesPage() {
  const rows = db.prepare('SELECT id, name, is_default FROM templates ORDER BY is_default DESC, name').all() as {
    id: number;
    name: string;
    is_default: number;
  }[];

  // Describe each template's columns so the wizard can show them and generate
  // a matching download without another round-trip.
  const templates: ImportTemplate[] = rows.map((r) => {
    const cfg = getTemplate(r.id).config;
    return {
      id: r.id,
      name: r.name,
      isDefault: r.is_default === 1,
      columns: [
        ...cfg.fields.map((f) => ({
          key: f.key,
          label: f.label,
          required: f.required,
          hint:
            f.type === 'date'
              ? 'Date — dd-mm-yyyy, yyyy-mm-dd or a real Excel date'
              : f.type === 'number'
                ? 'Number'
                : f.type === 'select'
                  ? `One of: ${(f.options ?? []).join(' / ')}`
                  : 'Text',
        })),
        ...EXTRA_COLUMNS.map((c) => ({ key: c.key, label: c.label, required: false, hint: c.hint })),
      ],
    };
  });

  const defaultId = rows.find((r) => r.is_default === 1)?.id ?? rows[0]?.id ?? 0;

  return (
    <div>
      <BackLink href="/admin/certificates">All certificates</BackLink>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Import certificates from a spreadsheet</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-navy-500">
            Generate certificates for a whole batch at once. Each row becomes one certificate with its own number and QR
            code — exactly as if it had been issued individually.
          </p>
        </div>
        <Link href="/admin/certificates/new" className="btn-ghost">
          Enter one manually instead
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="card mt-7 p-8 text-center text-sm text-navy-500">
          No certificate template exists yet.{' '}
          <Link href="/admin/templates" className="font-semibold text-brand-600 hover:underline">
            Create one first
          </Link>
          .
        </div>
      ) : (
        <div className="mt-7">
          <ImportWizard templates={templates} initialTemplateId={defaultId} />
        </div>
      )}
    </div>
  );
}
