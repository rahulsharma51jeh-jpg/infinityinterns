export default function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role="status"
      className={`mb-5 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
        error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}
    >
      <span aria-hidden className="mt-0.5 font-bold">
        {error ? '!' : '✓'}
      </span>
      <span>{error || ok}</span>
    </div>
  );
}
