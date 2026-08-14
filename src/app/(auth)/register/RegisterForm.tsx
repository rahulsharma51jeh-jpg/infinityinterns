'use client';

import { useActionState } from 'react';
import { registerAction, type FormState } from '../actions';
import SubmitButton from '@/components/ui/SubmitButton';
import Flash from '@/components/ui/Flash';

export default function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});
  const v = state.values ?? {};

  return (
    <form action={action} className="mt-7 space-y-4">
      <Flash error={state.error} />

      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" name="name" required defaultValue={v.name ?? ''} className="input" placeholder="Mausam Kumari" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email ?? ''} className="input" placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" required defaultValue={v.phone ?? ''} className="input" placeholder="9876543210" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className="input" placeholder="Repeat password" />
        </div>
      </div>

      <SubmitButton className="btn-primary w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>

      <p className="text-xs leading-relaxed text-navy-400">
        By creating an account you agree that the details you submit may be printed on your internship certificate.
      </p>
    </form>
  );
}
