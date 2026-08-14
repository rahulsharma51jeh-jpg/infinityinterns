import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { baseUrlFrom, getTemplate, qrDataUrl, sampleData } from '@/lib/certificate';
import CertificatePreview from '@/components/certificate/CertificatePreview';
import SubmitButton from '@/components/ui/SubmitButton';
import Flash from '@/components/ui/Flash';
import { createTemplate, deleteTemplate, setDefaultTemplate } from '../actions';

export const metadata: Metadata = { title: 'Certificate designer' };
export const dynamic = 'force-dynamic';

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const rows = db
    .prepare(
      `SELECT t.id, t.name, t.is_default, t.updated_at,
              (SELECT COUNT(*) FROM certificates c WHERE c.template_id = t.id) AS usage_count
         FROM templates t ORDER BY t.is_default DESC, t.name`,
    )
    .all() as { id: number; name: string; is_default: number; updated_at: string; usage_count: number }[];

  const h = await headers();
  const baseUrl = baseUrlFrom(h);

  // Render a thumbnail of each template using sample data.
  const previews = await Promise.all(
    rows.map(async (r) => {
      const tpl = getTemplate(r.id);
      const data = sampleData(tpl.config, baseUrl);
      const qr = await qrDataUrl(`${baseUrl}/verify/IIN-2026-PREVIEW`, tpl.config.qr.color, 240);
      return { id: r.id, config: tpl.config, data, qr };
    }),
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-navy-900">Certificate designer</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-navy-500">
            Change the layout, colours, wording, logos, QR placement and data columns of your certificates. The
            <strong className="text-navy-700"> default</strong> template is used for every newly issued certificate.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <Flash ok={sp.ok} error={sp.error} />
      </div>

      {/* new template */}
      <form action={createTemplate} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="name">New template name</label>
          <input id="name" name="name" required className="input" placeholder="e.g. Internship Completion 2027" />
        </div>
        <div className="min-w-52">
          <label className="label" htmlFor="copy_from">Start from</label>
          <select id="copy_from" name="copy_from" className="input" defaultValue="">
            <option value="">Blank (official default design)</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                Copy of “{r.name}”
              </option>
            ))}
          </select>
        </div>
        <SubmitButton className="btn-primary" pendingText="Creating…">
          Create template
        </SubmitButton>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {rows.map((r) => {
          const preview = previews.find((p) => p.id === r.id)!;
          return (
            <div key={r.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-bold text-navy-900">{r.name}</h2>
                  <p className="text-xs text-navy-400">
                    Updated {r.updated_at.slice(0, 16)} · {r.usage_count} certificate
                    {r.usage_count === 1 ? '' : 's'} issued
                  </p>
                </div>
                {r.is_default === 1 && <span className="badge bg-emerald-100 text-emerald-800">Default</span>}
              </div>

              <div className="bg-navy-50 p-3">
                <CertificatePreview view={preview} />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-navy-100 px-5 py-3.5">
                <Link href={`/admin/templates/${r.id}`} className="btn-primary btn-sm">
                  Edit design
                </Link>

                {r.is_default !== 1 && (
                  <form action={setDefaultTemplate}>
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton
                      className="btn-ghost btn-sm"
                      confirm="Make this the default template for all newly issued certificates?"
                    >
                      Make default
                    </SubmitButton>
                  </form>
                )}

                <form action={createTemplate}>
                  <input type="hidden" name="name" value={`${r.name} (copy)`} />
                  <input type="hidden" name="copy_from" value={r.id} />
                  <SubmitButton className="btn-ghost btn-sm">Duplicate</SubmitButton>
                </form>

                {r.is_default !== 1 && r.usage_count === 0 && rows.length > 1 && (
                  <form action={deleteTemplate} className="ml-auto">
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton className="btn-danger btn-sm" confirm="Delete this template permanently?">
                      Delete
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
