'use client';

import type { Student } from '@/lib/storage/org';

export function StudentSelect({
  students,
  selected,
  onChange,
}: {
  students: Student[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (students.length === 0) {
    return (
      <span className="text-xs text-neutral-400">
        Add students under Classes to link them.
      </span>
    );
  }

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Students">
      {students.map((student) => {
        const active = selected.includes(student.id);
        return (
          <button
            key={student.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(student.id)}
            className={`rounded-full px-2 py-0.5 text-xs ${
              active
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            {student.name}
          </button>
        );
      })}
    </div>
  );
}
