import Link from 'next/link';
import type { Note } from '@/lib/storage/types';

export function NoteCard({ note }: { note: Note }) {
  const excerpt = note.body.replace(/\s+/g, ' ').trim();

  return (
    <li>
      <Link
        href={`/notes/${note.id}`}
        className="flex h-full flex-col rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="truncate font-medium">{note.title}</h2>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {note.type}
          </span>
        </div>
        <p className="mt-1 line-clamp-3 flex-1 text-sm text-neutral-500">
          {excerpt || 'No content yet.'}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-neutral-400">
          <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString()}</time>
          {note.tags.length > 0 && (
            <span className="truncate">{note.tags.map((tag) => `#${tag}`).join(' ')}</span>
          )}
        </div>
      </Link>
    </li>
  );
}
