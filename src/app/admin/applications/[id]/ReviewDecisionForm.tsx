'use client';

import { useActionState, useRef } from 'react';
import { reviewApplication, type ActionState } from '../../actions';
import Flash from '@/components/ui/Flash';
import SubmitButton from '@/components/ui/SubmitButton';

/**
 * One form, three outcomes. The decision travels in a hidden input that each
 * button sets imperatively on click — relying on the submit button's own
 * name/value is not dependable across React's action submission path, and a
 * setState would not land before the form serialises.
 */
export default function ReviewDecisionForm({
  applicationId,
  defaultNote,
}: {
  applicationId: number;
  defaultNote: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(reviewApplication, {});
  const decision = useRef<HTMLInputElement>(null);

  const pick = (value: string) => () => {
    if (decision.current) decision.current.value = value;
  };

  return (
    <form action={action} className="mt-5 space-y-4">
      <Flash ok={state.ok} error={state.error} />

      <input type="hidden" name="id" value={applicationId} />
      <input ref={decision} type="hidden" name="decision" defaultValue="approved" />

      <div>
        <label className="label" htmlFor="note">
          Note (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          className="input"
          defaultValue={defaultNote}
          placeholder="Reason for rejection, or a note the intern will see on their dashboard"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <SubmitButton
          className="btn-primary"
          pendingText="Approving…"
          confirm="Approve this application and generate the certificate?"
          onClick={pick('approved')}
        >
          Approve &amp; issue certificate
        </SubmitButton>

        <SubmitButton className="btn-ghost" onClick={pick('under_review')}>
          Mark under review
        </SubmitButton>

        <SubmitButton className="btn-danger" confirm="Reject this application?" onClick={pick('rejected')}>
          Reject
        </SubmitButton>
      </div>
    </form>
  );
}
