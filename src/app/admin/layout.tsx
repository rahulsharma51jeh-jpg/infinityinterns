import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { ExternalIcon } from '@/components/ui/Icons';
import { logoutAction } from '@/app/(auth)/actions';

const NAV = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/applications', label: 'Applications', badge: 'pending' as const },
  { href: '/admin/certificates', label: 'Certificates' },
  { href: '/admin/templates', label: 'Certificate designer' },
  { href: '/admin/programs', label: 'Domains' },
  { href: '/admin/interns', label: 'Users' },
  { href: '/admin/settings', label: 'Settings' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  const pending = (
    db.prepare("SELECT COUNT(*) c FROM applications WHERE status IN ('pending','under_review')").get() as { c: number }
  ).c;

  return (
    <div className="min-h-screen bg-navy-50">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-[100rem] items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/infinity-interns.svg" alt="Infinity Interns" className="h-10 w-auto" />
            <span className="hidden border-l border-navy-100 pl-3 text-sm font-semibold text-navy-500 sm:block">
              Admin console
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1 text-sm font-medium text-navy-500 hover:text-navy-800 sm:flex"
            >
              View public site
              <ExternalIcon />
            </Link>
            <span className="hidden text-sm text-navy-400 md:block" title={admin.email}>
              {admin.name}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto flex max-w-[100rem] gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Admin">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-navy-600 hover:border-navy-200 hover:text-navy-900"
            >
              {n.label}
              {n.badge === 'pending' && pending > 0 && (
                <span className="badge bg-amber-100 text-amber-800">{pending}</span>
              )}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[100rem] px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
