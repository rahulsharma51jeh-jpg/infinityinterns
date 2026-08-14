'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeftIcon } from '@/components/ui/Icons';

export default function PrintToolbar({
  certNo,
  verifyUrl,
  backHref = '/verify',
}: {
  certNo: string;
  verifyUrl: string;
  backHref?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — nothing useful to do */
    }
  }

  return (
    <div className="no-print sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3 px-4 py-3">
        <Link href={backHref} className="btn-ghost btn-sm">
          <ChevronLeftIcon />
          Back
        </Link>

        <div className="min-w-0">
          <p className="text-xs tracking-wide text-navy-400 uppercase">Certificate</p>
          <p className="truncate font-mono text-sm font-bold text-navy-900">{certNo}</p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={copy} className="btn-ghost btn-sm">
            {copied ? '✓ Link copied' : 'Copy verify link'}
          </button>
          <a href={`/api/qr/${encodeURIComponent(certNo)}?download=1`} className="btn-ghost btn-sm" download>
            Download QR
          </a>
          <button type="button" onClick={() => window.print()} className="btn-primary btn-sm">
            Print / Save as PDF
          </button>
        </div>
      </div>

      <p className="mx-auto max-w-[1180px] px-4 pb-3 text-xs text-navy-400">
        For a pixel-accurate PDF choose <strong>A4</strong>, <strong>Landscape</strong>, margins{' '}
        <strong>None</strong>, and enable <strong>Background graphics</strong> in the print dialog.
      </p>
    </div>
  );
}
