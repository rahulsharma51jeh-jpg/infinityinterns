/**
 * Inline SVG icons for anything that carries meaning (status, direction).
 *
 * Deliberately not Unicode glyphs: characters like ✓ ✕ ↗ ← live outside the
 * Latin subsets our webfonts ship, so on a machine whose fallback fonts lack
 * them they render as tofu boxes — which looks like a bug precisely where the
 * user needs a clear signal.
 */

type IconProps = { className?: string; size?: number };

export function CheckIcon({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden focusable="false">
      <path d="M4 10.5 l4 4 L16 5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossIcon({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden focusable="false">
      <path d="M5 5 l10 10 M15 5 l-10 10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function WarnIcon({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden focusable="false">
      <path d="M10 2.5 L18.5 17.5 H1.5 Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M10 7.5 v4.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="10" cy="14.6" r="1.05" fill="currentColor" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden focusable="false">
      <path d="M12.5 4 L6.5 10 l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden focusable="false">
      <path d="M7.5 4 L13.5 10 l-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalIcon({ className = '', size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden focusable="false">
      <path d="M8 4 h8 v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4 L7 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 16 H4 V7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
