import { NOTE_TYPES, type NoteType } from '@/lib/storage/types';

const TYPE_LABELS: Record<NoteType, string> = {
  general: 'General',
  observation: 'Observation',
  behavior: 'Behavior',
  progress: 'Progress',
  generated: 'Generated',
};

export function TypeSelect({
  value,
  onChange,
}: {
  value: NoteType;
  onChange: (type: NoteType) => void;
}) {
  return (
    <select
      aria-label="Note type"
      value={value}
      onChange={(event) => onChange(event.target.value as NoteType)}
      className="rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700"
    >
      {NOTE_TYPES.map((type) => (
        <option key={type} value={type}>
          {TYPE_LABELS[type]}
        </option>
      ))}
    </select>
  );
}
