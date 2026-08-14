'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton({
  children,
  className = 'btn-primary',
  pendingText,
  confirm,
  name,
  value,
  title,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  /** when set, the browser asks for confirmation before submitting */
  confirm?: string;
  name?: string;
  value?: string;
  title?: string;
  /** runs synchronously before submission — use it to stage hidden inputs */
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      title={title}
      disabled={pending}
      className={className}
      onClick={(e) => {
        onClick?.();
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
