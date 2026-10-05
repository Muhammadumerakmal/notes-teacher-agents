'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { NoteEditor } from '@/components/notes/NoteEditor';
import {
  getNotesSnapshot,
  getServerNotesSnapshot,
  subscribeNotes,
} from '@/lib/storage/notes';

export default function EditNotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const result = useSyncExternalStore(subscribeNotes, getNotesSnapshot, getServerNotesSnapshot);
  const note = result === null ? null : (result.notes.find((n) => n.id === id) ?? null);

  if (result === null) {
    return <main className="p-6 text-sm text-neutral-500">Loading note…</main>;
  }

  if (note === null) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Note not found</h1>
        <p className="mt-2 text-sm text-neutral-500">It may have been deleted.</p>
        <Link href="/notes" className="mt-3 inline-block text-sm text-blue-600 underline dark:text-blue-400">
          Back to notes
        </Link>
      </main>
    );
  }

  return <NoteEditor note={note} onDeleted={() => router.push('/notes')} />;
}
