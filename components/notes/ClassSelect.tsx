import type { Class } from '@/lib/storage/org';

export function ClassSelect({
  value,
  classes,
  onChange,
  anyLabel = 'No class',
}: {
  value: string | null;
  classes: Class[];
  onChange: (id: string | null) => void;
  anyLabel?: string;
}) {
  return (
    <select
      aria-label="Class"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
      className="rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700"
    >
      <option value="">{anyLabel}</option>
      {classes.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
          {cls.period !== '' ? ` (${cls.period})` : ''}
        </option>
      ))}
    </select>
  );
}
