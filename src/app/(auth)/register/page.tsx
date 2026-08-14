import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = { title: 'Create your account' };

export default async function RegisterPage() {
  const user = await getSession();
  if (user) redirect(user.role === 'admin' ? '/admin' : '/dashboard');

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900">Create your account</h1>
      <p className="mt-1.5 text-sm text-navy-500">
        One account for applications, progress tracking and certificate downloads.
      </p>

      <RegisterForm />

      <p className="mt-6 text-sm text-navy-500">
        Already registered?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
