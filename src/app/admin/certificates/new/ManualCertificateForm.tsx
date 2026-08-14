'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FieldDef } from '@/lib/template';
import { EXTRA_COLUMNS } from '@/lib/importColumns';
import Flash from '@/components/ui/Flash';
import SubmitButton from '@/components/ui/SubmitButton';
import { createManualCertificate, editManualCertificate, type ManualState } from '../../actions';

export interface TemplateOption {
  id: number;
  name: string;
  isDefault: boolean;
}

/**
 * Renders one input per template data column, so a column added in the designer
 * shows up here automatically. Used for both creating and correcting a manually
 * issued certificate.
 */
export default function ManualCertificateForm({
  fields,
  templates,
  templateId,
  initialValues = {},
  mode = 'create',
  certificateId,
}: {
  fields: FieldDef[];
  templates: TemplateOption[];
  templateId: number;
  initialValues?: Record<string, string>;
  mode?: 'create' | 'edit';
  certificateId?: number;
}) {
  const router = useRouter();
  const action = mode === 'edit' ? editManualCertificate : createManualCertificate;
  const [state, formAction] = useActionState<ManualState, FormData>(action, {});

  // After a failed submit the server echoes back what was typed.
  const v = (key: string) => state.values?.[key] ?? initialValues[key] ?? '';

  return (
    <form action={formAction} className="space-y-6">
      <Flash ok={state.ok} error={state.error} />

      {mode === 'edit' && <input type="hidden" name="certificate_id" value={certificateId} />}

      {/* template choice */}
      <div>
        <label className="label" htmlFor="template_id">
          Certificate template
        </label>
        <select
          id="template_id"
          name="template_id"
          defaultValue={templateId}
          className="input max-w-md"
          onChange={(e) => {
            // The visible columns come from the template, so reload to pick up
            // its field list rather than guessing client-side.
            const params = new URLSearchParams(window.location.search);
            params.set('template', e.target.value);
            router.replace(`${window.location.pathname}?${params.toString()}`);
          }}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.isDefault ? ' (default)' : ''}
            </option>
          ))}
        </select>
        <p className="field-hint">Changing this reloads the form with that template&apos;s columns.</p>
      </div>

      {/* template-defined columns */}
      <fieldset className="rounded-xl border border-navy-100 p-4">
        <legend className="px-2 text-xs font-semibold tracking-wide text-navy-500 uppercase">
          Certificate details
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const id = `f_${f.key}`;
            return (
              <div key={f.key} className={f.type === 'text' && /name|college|title/i.test(f.key) ? 'sm:col-span-2' : ''}>
                <label className="label" htmlFor={id}>
                  {f.label}
                  {f.required && <span className="ml-1 text-brand-600">*</span>}
                </label>

                {f.type === 'select' && f.options?.length ? (
                  <select id={id} name={id} defaultValue={v(f.key) || f.options[0]} className="input">
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    name={id}
                    type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                    step={f.type === 'number' ? 'any' : undefined}
                    defaultValue={v(f.key) || f.defaultValue || ''}
                    required={f.required && !f.defaultValue}
                    className="input"
                  />
                )}

                <p className="field-hint">
                  <code className="font-mono">{`{{${f.key}}}`}</code>
                </p>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* extras */}
      <fieldset className="rounded-xl border border-navy-100 p-4">
        <legend className="px-2 text-xs font-semibold tracking-wide text-navy-500 uppercase">
          Issuing options
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          {EXTRA_COLUMNS.map((c) => {
            if (c.key === 'gender') {
              return (
                <div key={c.key}>
                  <label className="label" htmlFor="gender">
                    {c.label}
                  </label>
                  <select id="gender" name="gender" defaultValue={v('gender') || 'other'} className="input">
                    <option value="male">Male (he / his)</option>
                    <option value="female">Female (she / her)</option>
                    <option value="other">Unspecified (he/she)</option>
                  </select>
                  <p className="field-hint">{c.hint}</p>
                </div>
              );
            }

            const isDate = c.key === 'issued_on';
            const disabled = mode === 'edit' && c.key === 'certificate_no';

            return (
              <div key={c.key}>
                <label className="label" htmlFor={c.key}>
                  {c.label}
                </label>
                <input
                  id={c.key}
                  name={c.key}
                  type={isDate ? 'date' : c.key === 'email' ? 'email' : 'text'}
                  defaultValue={v(c.key)}
                  disabled={disabled}
                  className={`input ${c.key === 'certificate_no' ? 'font-mono' : ''} ${disabled ? 'opacity-60' : ''}`}
                  placeholder={c.key === 'certificate_no' ? 'auto-generated' : undefined}
                />
                <p className="field-hint">
                  {disabled ? 'A certificate number is never reassigned once issued.' : c.hint}
                </p>
              </div>
            );
          })}
        </div>
      </fieldset>

      {mode === 'create' && (
        <div>
          <label className="label" htmlFor="reason">
            Reason / reference (recorded in the audit log)
          </label>
          <input
            id="reason"
            name="reason"
            className="input"
            placeholder="e.g. Offline batch, June 2026 — approved by Director"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <SubmitButton className="btn-primary" pendingText={mode === 'edit' ? 'Saving…' : 'Generating…'}>
          {mode === 'edit' ? 'Save changes' : 'Generate certificate'}
        </SubmitButton>
        <Link href="/admin/certificates" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
