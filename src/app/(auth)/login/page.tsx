import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSession();
  if (user) redirect(user.role === 'admin' ? '/admin' : '/dashboard');

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900">Sign in</h1>
      <p className="mt-1.5 text-sm text-navy-500">
        Access your internship dashboard, progress and certificates.
      </p>

      <LoginForm next={sp.next} />

      <p className="mt-6 text-sm text-navy-500">
        New here?{' '}
        <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>

      <div className="mt-8 rounded-lg border border-navy-100 bg-navy-50 p-4 text-xs leading-relaxed text-navy-600">
        <p className="font-semibold text-navy-800">Demo accounts</p>
        <p className="mt-1">
          Admin — <code className="font-mono">admin@infinityinterns.com</code> / <code className="font-mono">Admin@12345</code>
        </p>
        <p>
          Intern — <code className="font-mono">mausam@example.com</code> / <code className="font-mono">Intern@12345</code>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-navy-400">
        Only need to check a certificate?{' '}
        <Link href="/verify" className="font-semibold text-navy-600 underline">
          Verify without signing in
        </Link>
      </p>
    </div>
  );
}
