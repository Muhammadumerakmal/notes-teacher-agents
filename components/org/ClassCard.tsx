import Link from 'next/link';
import type { Class } from '@/lib/storage/org';

export function ClassCard({
  cls,
  studentCount,
  noteCount,
}: {
  cls: Class;
  studentCount: number;
  noteCount: number;
}) {
  return (
    <li>
      <Link
        href={`/classes/${cls.id}`}
        className="flex h-full flex-col rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="truncate font-medium">{cls.name}</h2>
          {cls.period !== '' && (
            <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {cls.period}
            </span>
          )}
        </div>
        {cls.subject !== '' && <p className="mt-1 text-sm text-neutral-500">{cls.subject}</p>}
        <p className="mt-3 text-xs text-neutral-400">
          {studentCount} {studentCount === 1 ? 'student' : 'students'} · {noteCount}{' '}
          {noteCount === 1 ? 'note' : 'notes'}
        </p>
      </Link>
    </li>
  );
}
