import { CheckIcon, WarnIcon } from './Icons';

export default function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const isError = Boolean(error);

  return (
    <div
      role="status"
      className={`mb-5 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
        isError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}
    >
      <span className="mt-0.5 shrink-0">{isError ? <WarnIcon size={15} /> : <CheckIcon size={15} />}</span>
      <span>{error || ok}</span>
    </div>
  );
}
