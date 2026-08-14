'use client';

import { useId } from 'react';

/** Small, uncontrolled-looking form primitives used throughout the designer. */

export function Section({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-navy-100 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 hover:bg-navy-50">
        <span>
          <span className="text-sm font-semibold text-navy-900">{title}</span>
          {hint && <span className="mt-0.5 block text-xs text-navy-400">{hint}</span>}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          className="shrink-0 text-navy-400 transition-transform group-open:rotate-180"
          aria-hidden
        >
          <path d="M5 8 l5 5 l5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </details>
  );
}

export function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  return <div className={`grid gap-3 ${cols === 1 ? '' : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>{children}</div>;
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-semibold tracking-wide text-navy-500 uppercase">
      {children}
    </label>
  );
}

export function Text({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input ${mono ? 'font-mono text-xs' : ''}`}
      />
    </div>
  );
}

export function Area({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="input" />
      {hint && <p className="mt-1 text-[11px] text-navy-400">{hint}</p>}
    </div>
  );
}

export function Num({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {suffix ? ` (${suffix})` : ''}
      </Label>
      <input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="input"
      />
    </div>
  );
}

export function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 shrink-0 cursor-pointer rounded border border-navy-200 bg-white p-0.5"
          aria-label={`${label} — colour picker`}
        />
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input font-mono text-xs" />
      </div>
    </div>
  );
}

export function Pick<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-navy-100 bg-navy-50/50 px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-navy-300"
      />
      <span>
        <span className="block text-sm font-medium text-navy-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-navy-400">{hint}</span>}
      </span>
    </label>
  );
}

/** Logo/image picker: accepts a file (stored inline as a data URI) or a URL. */
export function ImagePick({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const id = useId();
  const MAX = 400 * 1024;

  function read(file: File) {
    if (file.size > MAX) {
      alert(`That file is ${(file.size / 1024).toFixed(0)} KB. Please use an image under 400 KB — SVG or compressed PNG works best.`);
      return;
    }
    const fr = new FileReader();
    fr.onload = () => onChange(String(fr.result));
    fr.readAsDataURL(file);
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded border border-navy-200 bg-white">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-12 max-w-16 object-contain" />
          ) : (
            <span className="text-[10px] text-navy-300">none</span>
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            id={id}
            value={value.startsWith('data:') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={value.startsWith('data:') ? 'uploaded image' : '/logos/example.svg'}
            className="input font-mono text-xs"
          />
          <div className="flex gap-1.5">
            <label className="btn-ghost btn-sm cursor-pointer">
              Upload
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) read(f);
                  e.target.value = '';
                }}
              />
            </label>
            {value && (
              <button type="button" onClick={() => onChange('')} className="btn-ghost btn-sm">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      {hint && <p className="mt-1 text-[11px] text-navy-400">{hint}</p>}
    </div>
  );
}

export function MiniBtn({
  children,
  onClick,
  title,
  danger = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`rounded border px-1.5 py-0.5 text-xs font-semibold disabled:opacity-30 ${
        danger
          ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
          : 'border-navy-200 bg-white text-navy-600 hover:bg-navy-50'
      }`}
    >
      {children}
    </button>
  );
}
