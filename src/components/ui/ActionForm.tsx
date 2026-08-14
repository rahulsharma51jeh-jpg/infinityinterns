'use client';

import { useActionState } from 'react';
import Flash from './Flash';

export type ActionState = { error?: string; ok?: string };
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Thin client wrapper so server components can render a form backed by a
 * `useActionState` action and get inline success/error feedback for free.
 */
export default function ActionForm({
  action,
  children,
  className = '',
  hideFlash = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  hideFlash?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  return (
    <form action={formAction} className={className}>
      {!hideFlash && <Flash ok={state.ok} error={state.error} />}
      {children}
    </form>
  );
}
