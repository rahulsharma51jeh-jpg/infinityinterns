const MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800' },
  under_review: { label: 'Under review', cls: 'bg-sky-100 text-sky-800' },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-800' },
  active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-800' },
  revoked: { label: 'Revoked', cls: 'bg-red-100 text-red-800' },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, cls: 'bg-navy-100 text-navy-700' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
