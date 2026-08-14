'use client';

import { useActionState } from 'react';
import { applyAction, type ApplyState } from './actions';
import SubmitButton from '@/components/ui/SubmitButton';
import Flash from '@/components/ui/Flash';

export default function ApplyForm({
  programs,
  defaultProgramId,
  defaults,
}: {
  programs: { id: number; title: string; duration: string; mode: string }[];
  defaultProgramId?: number;
  defaults: { full_name: string; phone: string };
}) {
  const [state, action] = useActionState<ApplyState, FormData>(applyAction, {});
  const v = state.values ?? {};

  return (
    <form action={action} className="space-y-5">
      <Flash error={state.error} />

      <div>
        <label className="label" htmlFor="program_id">Internship domain *</label>
        <select
          id="program_id"
          name="program_id"
          required
          defaultValue={v.program_id ?? (defaultProgramId ? String(defaultProgramId) : '')}
          className="input"
        >
          <option value="">Select a domain…</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} — {p.duration}, {p.mode}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="rounded-xl border border-navy-100 p-4">
        <legend className="px-2 text-xs font-semibold tracking-wide text-navy-500 uppercase">
          Certificate details
        </legend>
        <p className="mb-4 text-xs text-navy-400">
          These values are printed on your certificate. Enter them exactly as they should appear.
        </p>

        <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
          <div>
            <label className="label" htmlFor="salutation">Title *</label>
            <select id="salutation" name="salutation" required defaultValue={v.salutation ?? 'Mr.'} className="input">
              {['Mr.', 'Ms.', 'Mrs.', 'Dr.'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="full_name">Full name *</label>
            <input id="full_name" name="full_name" required defaultValue={v.full_name ?? defaults.full_name} className="input" placeholder="Mausam Kumari" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="college">College / institute *</label>
            <input id="college" name="college" required defaultValue={v.college ?? ''} className="input" placeholder="Government Polytechnic Barh" />
          </div>
          <div>
            <label className="label" htmlFor="course">Course / branch</label>
            <input id="course" name="course" defaultValue={v.course ?? ''} className="input" placeholder="Mechanical Engineering" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="gender">Gender *</label>
            <select id="gender" name="gender" required defaultValue={v.gender ?? 'other'} className="input">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Prefer not to say</option>
            </select>
            <p className="field-hint">Used only to choose he/she wording on the certificate.</p>
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone *</label>
            <input id="phone" name="phone" required defaultValue={v.phone ?? defaults.phone} className="input" placeholder="9876543210" />
          </div>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="start_date">Preferred start date</label>
          <input id="start_date" name="start_date" type="date" defaultValue={v.start_date ?? ''} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="project_title">Project idea (optional)</label>
          <input id="project_title" name="project_title" defaultValue={v.project_title ?? ''} className="input" placeholder="e.g. Isometric Assembly Drawing Set" />
        </div>
      </div>

      <div className="rounded-lg border border-navy-100 bg-navy-50 p-4 text-xs leading-relaxed text-navy-600">
        Attendance and assessment marks are filled in by your mentor at the end of the programme. Your certificate is
        generated automatically once an administrator approves your application.
      </div>

      <SubmitButton className="btn-brand w-full py-3" pendingText="Submitting…">
        Submit application
      </SubmitButton>
    </form>
  );
}
