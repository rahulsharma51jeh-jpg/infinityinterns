import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { db, getSetting } from '@/lib/db';
import { baseUrlFrom, getTemplate } from '@/lib/certificate';
import ActionForm from '@/components/ui/ActionForm';
import SubmitButton from '@/components/ui/SubmitButton';
import { saveSettings } from '../actions';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const h = await headers();
  const effectiveBase = baseUrlFrom(h);
  const tpl = getTemplate();

  const autoIssue = getSetting('auto_issue_on_approval', '1') === '1';
  const seq = getSetting('cert_seq', '1000');

  const audit = db
    .prepare(
      `SELECT a.action, a.entity, a.entity_id, a.detail, a.created_at, u.name AS actor
         FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
        ORDER BY a.id DESC LIMIT 25`,
    )
    .all() as { action: string; entity: string; entity_id: string; detail: string; created_at: string; actor: string | null }[];

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy-900">Settings</h1>
      <p className="mt-1.5 text-sm text-navy-500">Portal-wide configuration and the administrator activity log.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-bold text-navy-900">General</h2>

          <ActionForm action={saveSettings} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="org_name">Organisation name</label>
              <input id="org_name" name="org_name" defaultValue={getSetting('org_name', 'Infinity Interns')} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="support_email">Support email</label>
              <input
                id="support_email"
                name="support_email"
                type="email"
                defaultValue={getSetting('support_email', 'info@infinityinterns.com')}
                className="input"
              />
            </div>

            <div>
              <label className="label" htmlFor="site_url">Public site URL</label>
              <input
                id="site_url"
                name="site_url"
                defaultValue={getSetting('site_url', '')}
                className="input font-mono text-xs"
                placeholder="https://infinityinterns.com"
              />
              <p className="field-hint">
                Used as a fallback when building QR links. Currently resolving to{' '}
                <strong className="font-mono text-navy-600">{effectiveBase}</strong> (taken from the live request, which
                always wins).
              </p>
            </div>

            <div>
              <label className="label" htmlFor="cert_seq">Certificate counter</label>
              <input id="cert_seq" name="cert_seq" defaultValue={seq} className="input font-mono text-xs" />
              <p className="field-hint">
                The next certificate will be number {Number(seq) + 1}, formatted as{' '}
                <strong className="font-mono text-navy-600">{tpl.config.certNo.format}</strong>. Only increase this —
                lowering it risks number collisions.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-navy-100 bg-navy-50/60 px-3 py-3">
              <input
                type="checkbox"
                name="auto_issue_on_approval"
                defaultChecked={autoIssue}
                className="mt-0.5 h-4 w-4 rounded border-navy-300"
              />
              <span>
                <span className="block text-sm font-medium text-navy-800">
                  Generate the certificate automatically on approval
                </span>
                <span className="mt-0.5 block text-xs text-navy-400">
                  When off, approving an application does not issue anything — you generate each certificate manually
                  from the application page.
                </span>
              </span>
            </label>

            <SubmitButton className="btn-primary" pendingText="Saving…">
              Save settings
            </SubmitButton>
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="border-b border-navy-100 px-5 py-3.5 font-bold text-navy-900">Recent admin activity</h2>
          {audit.length === 0 ? (
            <p className="p-8 text-center text-sm text-navy-400">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {audit.map((a, i) => (
                <li key={i} className="px-5 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <code className="font-mono text-xs font-semibold text-navy-700">{a.action}</code>
                    {a.entity && (
                      <span className="text-xs text-navy-400">
                        {a.entity} #{a.entity_id}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[11px] text-navy-300">{a.created_at.slice(0, 16)}</span>
                  </div>
                  <p className="text-xs text-navy-500">
                    {a.actor ?? 'system'}
                    {a.detail ? ` · ${a.detail}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
