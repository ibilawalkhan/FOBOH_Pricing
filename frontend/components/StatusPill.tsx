type Status = 'completed' | 'in-progress' | 'not-started';

const CONFIG: Record<Status, { label: string; dot: string; text: string; bg: string }> = {
  completed: {
    label: 'Completed',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  'in-progress': {
    label: 'In Progress',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  'not-started': {
    label: 'Not Started',
    dot: 'bg-gray-400',
    text: 'text-gray-600',
    bg: 'bg-gray-100',
  },
};

export function StatusPill({ status }: { status: Status }) {
  const c = CONFIG[status];
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
        c.bg,
        c.text,
      ].join(' ')}
    >
      <span className={['h-2 w-2 rounded-full', c.dot].join(' ')} aria-hidden="true" />
      {c.label}
    </span>
  );
}

export type { Status };
