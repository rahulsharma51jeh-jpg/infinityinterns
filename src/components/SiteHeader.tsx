import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { logoutAction } from '@/app/(auth)/actions';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/programs', label: 'Internships' },
  { href: '/verify', label: 'Verify Certificate' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default async function SiteHeader() {
  const user = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/infinity-interns.svg" alt="Infinity Interns" className="h-11 w-auto" />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 hover:text-navy-900"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={user.role === 'admin' ? '/admin' : '/dashboard'}
                className="hidden text-sm font-medium text-navy-700 hover:text-navy-900 sm:block"
              >
                {user.role === 'admin' ? 'Admin' : 'My Dashboard'}
              </Link>
              <span className="hidden max-w-[14ch] truncate text-sm text-navy-400 md:block" title={user.email}>
                {user.name}
              </span>
              <form action={logoutAction}>
                <button className="btn btn-ghost btn-sm" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/apply" className="btn btn-brand btn-sm">
                Apply now
              </Link>
            </>
          )}
        </div>
      </div>

      {/* compact nav for small screens */}
      <nav className="flex gap-1 overflow-x-auto border-t border-navy-50 px-4 py-1.5 lg:hidden" aria-label="Main mobile">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
