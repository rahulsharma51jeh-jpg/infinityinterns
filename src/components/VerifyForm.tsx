/**
 * Certificate-number lookup. Plain GET form so it works without JavaScript;
 * /verify resolves `?cert=` and redirects to the canonical /verify/<no> URL.
 */
export default function VerifyForm({
  size = 'md',
  autoFocus = false,
  defaultValue = '',
}: {
  size?: 'md' | 'lg';
  autoFocus?: boolean;
  defaultValue?: string;
}) {
  const lg = size === 'lg';
  return (
    <form action="/verify" method="get" className="flex flex-col gap-2.5 sm:flex-row">
      <label htmlFor="cert" className="sr-only">
        Certificate number
      </label>
      <input
        id="cert"
        name="cert"
        required
        autoFocus={autoFocus}
        defaultValue={defaultValue}
        placeholder="e.g. IIN-2026-01001"
        autoCapitalize="characters"
        spellCheck={false}
        // uppercase the typed value, but leave the placeholder readable
        className={`input font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal ${
          lg ? 'sm:py-3.5 sm:text-base' : ''
        }`}
      />
      <button type="submit" className={`btn-brand shrink-0 ${lg ? 'sm:px-7 sm:py-3.5 sm:text-base' : ''}`}>
        Verify certificate
      </button>
    </form>
  );
}
