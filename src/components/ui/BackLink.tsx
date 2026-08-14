import Link from 'next/link';
import { ChevronLeftIcon } from './Icons';

export default function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-navy-500 hover:text-navy-800"
    >
      <ChevronLeftIcon />
      {children}
    </Link>
  );
}
