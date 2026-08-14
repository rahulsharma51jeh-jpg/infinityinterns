'use client';

import { useActionState, useRef } from 'react';
import Flash from '@/components/ui/Flash';
import SubmitButton from '@/components/ui/SubmitButton';
import { setCertificateStatus, type ActionState } from '../../actions';

/**
 * Revoke / restore. One `useActionState` spans both directions so the
 * confirmation stays on screen after the certificate's status flips and the
 * form below it swaps over.
 */
export default function RevocationPanel({
  certificateId,
  status,
  revokeReason,
}: {
  certificateId: number;
  status: 'active' | 'revoked';
  revokeReason: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(setCertificateStatus, {});
  const intent = useRef<HTMLInputElement>(null);
  const revoked = status === 'revoked';

  return (
    <section className={`card p-5 ${revoked ? 'border-red-200' : ''}`}>
      <h2 className="font-bold text-navy-900">{revoked ? 'Restore certificate' : 'Revoke certificate'}</h2>

      {revoked ? (
        <>
          <p className="mt-1 text-xs text-navy-400">
            Currently revoked — the public verify page reports it as invalid.
          </p>
          {revokeReason && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-800">{revokeReason}</p>}
        </>
      ) : (
        <p className="mt-1 text-xs text-navy-400">
          Marks the certificate invalid everywhere immediately. The reason you give is shown publicly.
        </p>
      )}

      <div className="mt-3">
        <Flash ok={state.ok} error={state.error} />
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="certificate_id" value={certificateId} />
        <input ref={intent} type="hidden" name="intent" defaultValue={revoked ? 'restore' : 'revoke'} />

        {revoked ? (
          <SubmitButton
            className="btn-primary btn-sm"
            pendingText="Restoring…"
            confirm="Restore this certificate to active?"
            onClick={() => {
              if (intent.current) intent.current.value = 'restore';
            }}
          >
            Restore to active
          </SubmitButton>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="reason">
                Reason (shown publicly)
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={2}
                required
                className="input"
                placeholder="e.g. Issued in error — attendance record corrected"
              />
            </div>
            <SubmitButton
              className="btn-danger btn-sm"
              pendingText="Revoking…"
              confirm="Revoke this certificate? The public verify page will show it as invalid."
              onClick={() => {
                if (intent.current) intent.current.value = 'revoke';
              }}
            >
              Revoke certificate
            </SubmitButton>
          </>
        )}
      </form>
    </section>
  );
}
