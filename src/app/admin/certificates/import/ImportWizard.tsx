'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { MAX_FILE_BYTES, MAX_ROWS, type ParsedRow } from '@/lib/importColumns';
import Flash from '@/components/ui/Flash';
import { CrossIcon, WarnIcon } from '@/components/ui/Icons';
import SubmitButton from '@/components/ui/SubmitButton';
import { importCertificates, type ImportState } from '../../actions';

export interface ImportTemplate {
  id: number;
  name: string;
  isDefault: boolean;
  columns: { key: string; label: string; required: boolean; hint: string }[];
}

export default function ImportWizard({ templates, initialTemplateId }: { templates: ImportTemplate[]; initialTemplateId: number }) {
  const [state, action] = useActionState<ImportState, FormData>(importCertificates, { stage: 'idle' });
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);

  const active = templates.find((t) => t.id === (state.templateId ?? templateId)) ?? templates[0];
  const stage = state.stage ?? 'idle';

  const rows = useMemo(() => state.rows ?? [], [state.rows]);
  const importable = useMemo(() => rows.filter((r) => r.status !== 'error'), [rows]);
  const visible = showOnlyProblems ? rows.filter((r) => r.status !== 'ok') : rows;

  return (
    <div className="space-y-6">
      <Flash ok={state.ok} error={state.error} />

      {/* ------------------------------ step 1 ------------------------------ */}
      {stage === 'idle' && (
        <>
          <section className="card p-6">
            <h2 className="font-bold text-navy-900">1. Start from the template file</h2>
            <p className="mt-1.5 text-sm text-navy-500">
              The columns must match the certificate template you are issuing on. Download a ready-made file with the
              right headers, an example row and per-column notes.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="label" htmlFor="tpl">
                  Certificate template
                </label>
                <select
                  id="tpl"
                  value={templateId}
                  onChange={(e) => setTemplateId(Number(e.target.value))}
                  className="input"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <a
                  href={`/admin/certificates/import/template?template=${templateId}&format=xlsx`}
                  className="btn-primary"
                  download
                >
                  Download .xlsx
                </a>
                <a
                  href={`/admin/certificates/import/template?template=${templateId}&format=csv`}
                  className="btn-ghost"
                  download
                >
                  .csv
                </a>
              </div>
            </div>

            {active && (
              <details className="mt-5 rounded-lg border border-navy-100 bg-navy-50/60 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-navy-800">
                  Columns for “{active.name}” ({active.columns.length})
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead>
                      <tr>
                        <th className="th">Column header</th>
                        <th className="th">Required</th>
                        <th className="th">Expected value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-100">
                      {active.columns.map((c) => (
                        <tr key={c.key}>
                          <td className="td font-medium">{c.label}</td>
                          <td className="td">
                            {c.required ? (
                              <span className="badge bg-brand-100 text-brand-700">Required</span>
                            ) : (
                              <span className="text-xs text-navy-400">Optional</span>
                            )}
                          </td>
                          <td className="td text-xs text-navy-500">{c.hint}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-navy-500">
                  Header spelling is forgiving — case, spaces and punctuation are ignored, and common alternatives like
                  “Name”, “Institute”, “From” and “To” are recognised.
                </p>
              </details>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-bold text-navy-900">2. Upload your filled file</h2>
            <p className="mt-1.5 text-sm text-navy-500">
              Nothing is saved yet — you will see every row and its problems before anything is generated.
            </p>

            <form action={action} className="mt-4 space-y-4">
              <input type="hidden" name="intent" value="preview" />
              <input type="hidden" name="template_id" value={templateId} />

              <div>
                <label className="label" htmlFor="file">
                  Spreadsheet
                </label>
                <input
                  id="file"
                  name="file"
                  type="file"
                  required
                  accept=".xlsx,.xlsm,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="input file:mr-3 file:rounded file:border-0 file:bg-navy-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-navy-700"
                />
                <p className="field-hint">
                  .xlsx or .csv, up to {MAX_FILE_BYTES / 1024 / 1024} MB and {MAX_ROWS} rows per import. Legacy .xls
                  must be re-saved as .xlsx.
                </p>
              </div>

              <SubmitButton className="btn-primary" pendingText="Reading file…">
                Check the file
              </SubmitButton>
            </form>
          </section>
        </>
      )}

      {/* ------------------------------ step 3 ------------------------------ */}
      {stage === 'preview' && (
        <section className="card overflow-hidden">
          <header className="flex flex-wrap items-center gap-3 border-b border-navy-100 px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-navy-900">3. Review before generating</h2>
              <p className="text-xs text-navy-400">
                {state.fileName} · issuing on “{active?.name}”
              </p>
            </div>

            {state.summary && (
              <div className="flex flex-wrap gap-1.5">
                <span className="badge bg-emerald-100 text-emerald-800">{state.summary.ok} ready</span>
                {state.summary.warn > 0 && (
                  <span className="badge bg-amber-100 text-amber-800">{state.summary.warn} with warnings</span>
                )}
                {state.summary.error > 0 && (
                  <span className="badge bg-red-100 text-red-800">{state.summary.error} will be skipped</span>
                )}
              </div>
            )}
          </header>

          {(state.unmatched?.length || state.truncated) && (
            <div className="space-y-1.5 border-b border-navy-100 bg-amber-50 px-5 py-3 text-xs text-amber-900">
              {state.unmatched && state.unmatched.length > 0 && (
                <p>
                  <strong>Ignored columns:</strong> {state.unmatched.join(', ')} — these do not match any column on this
                  template and will not be printed.
                </p>
              )}
              {state.truncated && (
                <p>
                  <strong>Only the first {MAX_ROWS} rows were read.</strong> Split the file and import the rest
                  afterwards.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-b border-navy-100 bg-navy-50 px-5 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-navy-600">
              <input
                type="checkbox"
                checked={showOnlyProblems}
                onChange={(e) => setShowOnlyProblems(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-navy-300"
              />
              Show only rows needing attention
            </label>
            <span className="text-xs text-navy-400">
              Showing {visible.length} of {rows.length}
            </span>
          </div>

          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                <tr>
                  <th className="th w-14">Row</th>
                  <th className="th">Intern</th>
                  <th className="th">Domain</th>
                  <th className="th">Period</th>
                  <th className="th">Att / Marks</th>
                  <th className="th">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {visible.map((r) => (
                  <RowView key={r.line} row={r} />
                ))}
              </tbody>
            </table>

            {visible.length === 0 && (
              <p className="p-8 text-center text-sm text-navy-400">Every row is clean — nothing needs attention.</p>
            )}
          </div>

          <footer className="flex flex-wrap items-center gap-3 border-t border-navy-100 bg-navy-50 px-5 py-4">
            <form action={action} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="intent" value="commit" />
              <input type="hidden" name="template_id" value={state.templateId ?? templateId} />
              <input type="hidden" name="file_name" value={state.fileName ?? ''} />
              {/* Every row is submitted, not just the importable ones, so the
                  results table and its CSV are a complete record of the batch.
                  The server re-validates and skips the bad rows itself. */}
              <input type="hidden" name="rows" value={JSON.stringify(rows)} />

              <SubmitButton
                className="btn-primary"
                pendingText="Generating…"
                confirm={`Generate ${importable.length} certificate(s)? Each one gets a unique number and becomes publicly verifiable.`}
              >
                Generate {importable.length} certificate{importable.length === 1 ? '' : 's'}
              </SubmitButton>
            </form>

            <form action={action}>
              <input type="hidden" name="intent" value="reset" />
              <input type="hidden" name="template_id" value={state.templateId ?? templateId} />
              <SubmitButton className="btn-ghost">Start over with a different file</SubmitButton>
            </form>

            {state.summary && state.summary.error > 0 && (
              <p className="text-xs text-navy-500">
                {state.summary.error} row(s) with errors will be skipped. Fix them in the file and re-import if needed.
              </p>
            )}
          </footer>
        </section>
      )}

      {/* ------------------------------ step 4 ------------------------------ */}
      {stage === 'done' && state.results && (
        <Results
          results={state.results}
          issued={state.issuedCount ?? 0}
          onReset={
            <form action={action}>
              <input type="hidden" name="intent" value="reset" />
              <input type="hidden" name="template_id" value={state.templateId ?? templateId} />
              <SubmitButton className="btn-ghost btn-sm">Import another file</SubmitButton>
            </form>
          }
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RowView({ row: r }: { row: ParsedRow }) {
  const v = r.values;
  const tone =
    r.status === 'error' ? 'bg-red-50/60' : r.status === 'warn' ? 'bg-amber-50/50' : '';

  return (
    <tr className={tone}>
      <td className="td text-xs text-navy-400">{r.line}</td>
      <td className="td">
        <p className="font-medium text-navy-900">
          {[v.salutation, v.intern_name].filter(Boolean).join(' ') || <span className="text-red-600">missing</span>}
        </p>
        <p className="text-xs text-navy-400">{v.college}</p>
        {v.email && <p className="text-xs text-navy-400">{v.email}</p>}
      </td>
      <td className="td text-navy-700">
        {v.domain}
        {v.duration && (
          <span className="block text-xs text-navy-400">
            {v.duration} · {v.mode}
          </span>
        )}
      </td>
      <td className="td text-xs text-navy-500">
        {v.start_date ? `${v.start_date} to ${v.end_date || '—'}` : '—'}
      </td>
      <td className="td text-xs text-navy-500">
        {v.attendance || v.marks ? `${v.attendance || '—'}% / ${v.marks || '—'}%` : '—'}
      </td>
      <td className="td">
        {r.status === 'ok' ? (
          <span className="badge bg-emerald-100 text-emerald-800">Ready</span>
        ) : (
          <ul className="space-y-0.5">
            {r.messages.map((m, i) => (
              <li
                key={i}
                className={`flex items-start gap-1.5 text-xs ${r.status === 'error' ? 'text-red-700' : 'text-amber-800'}`}
              >
                <span className="mt-0.5 shrink-0">
                  {r.status === 'error' ? <CrossIcon size={12} /> : <WarnIcon size={12} />}
                </span>
                {m}
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

function Results({
  results,
  issued,
  onReset,
}: {
  results: { line: number; name: string; certNo?: string; error?: string }[];
  issued: number;
  onReset: React.ReactNode;
}) {
  const failed = results.filter((r) => r.error);

  function downloadCsv() {
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const csv = [
      'Row,Name,Certificate No,Status',
      ...results.map((r) =>
        [r.line, esc(r.name), r.certNo ?? '', esc(r.error ? `SKIPPED: ${r.error}` : 'Issued')].join(','),
      ),
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-import-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-navy-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-navy-900">Import complete</h2>
          <p className="text-xs text-navy-400">
            {issued} generated{failed.length ? ` · ${failed.length} skipped` : ''}
          </p>
        </div>
        <button type="button" onClick={downloadCsv} className="btn-ghost btn-sm">
          Download results (.csv)
        </button>
        {onReset}
        <Link href="/admin/certificates" className="btn-primary btn-sm">
          View all certificates
        </Link>
      </header>

      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full min-w-[38rem] text-sm">
          <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
            <tr>
              <th className="th w-14">Row</th>
              <th className="th">Intern</th>
              <th className="th">Certificate no.</th>
              <th className="th">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {results.map((r) => (
              <tr key={r.line} className={r.error ? 'bg-red-50/60' : ''}>
                <td className="td text-xs text-navy-400">{r.line}</td>
                <td className="td font-medium text-navy-900">{r.name}</td>
                <td className="td">
                  {r.certNo ? (
                    <Link href={`/verify/${r.certNo}`} className="font-mono text-xs font-semibold text-brand-600 hover:underline">
                      {r.certNo}
                    </Link>
                  ) : (
                    <span className="text-xs text-navy-300">—</span>
                  )}
                </td>
                <td className="td">
                  {r.error ? (
                    <span className="text-xs text-red-700">Skipped — {r.error}</span>
                  ) : (
                    <span className="badge bg-emerald-100 text-emerald-800">Issued</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-navy-100 bg-navy-50 px-5 py-3 text-xs text-navy-500">
        Every issued certificate above is now publicly verifiable by its number and QR code, and rows linked to a
        registered email also appear on that intern&apos;s dashboard.
        {failed.length > 0 && (
          <>
            {' '}
            The {failed.length} skipped row{failed.length === 1 ? '' : 's'} were not saved — fix them in the spreadsheet
            and import it again. Download the results above to keep a record.
          </>
        )}
      </p>
    </section>
  );
}
