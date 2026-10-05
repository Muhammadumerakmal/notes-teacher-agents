'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { NoteCard } from '@/components/notes/NoteCard';
import {
  getNotesSnapshot,
  getServerNotesSnapshot,
  subscribeNotes,
} from '@/lib/storage/notes';

export default function NotesPage() {
  const result = useSyncExternalStore(subscribeNotes, getNotesSnapshot, getServerNotesSnapshot);

  if (result === null) {
    return <main className="p-6 text-sm text-neutral-500">Loading notes…</main>;
  }

  const notes = result.notes.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main className="p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <Link
          href="/notes/new"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          New note
        </Link>
      </header>

      {result.loadError && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Some stored data could not be read and was skipped.
        </p>
      )}

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-neutral-500">No notes yet.</p>
          <Link href="/notes/new" className="mt-2 inline-block text-sm text-blue-600 underline dark:text-blue-400">
            Create your first note
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </ul>
      )}
    </main>
  );
}
