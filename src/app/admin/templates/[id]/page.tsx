import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { baseUrlFrom, getTemplate, sampleData } from '@/lib/certificate';
import TemplateDesigner from './TemplateDesigner';

export const metadata: Metadata = { title: 'Certificate designer' };
export const dynamic = 'force-dynamic';

export default async function TemplateDesignerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isInteger(id)) notFound();

  const row = db.prepare('SELECT id, name, is_default FROM templates WHERE id = ?').get(id) as
    | { id: number; name: string; is_default: number }
    | undefined;
  if (!row) notFound();

  const tpl = getTemplate(id);
  const usage = (db.prepare('SELECT COUNT(*) c FROM certificates WHERE template_id = ?').get(id) as { c: number }).c;

  const h = await headers();
  const baseUrl = baseUrlFrom(h);

  return (
    <TemplateDesigner
      templateId={row.id}
      initialName={row.name}
      initialConfig={tpl.config}
      isDefault={row.is_default === 1}
      usageCount={usage}
      previewData={sampleData(tpl.config, baseUrl)}
      verifyUrl={`${baseUrl}/verify/IIN-2026-PREVIEW`}
    />
  );
}
