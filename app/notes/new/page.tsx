'use client';

import { useRouter } from 'next/navigation';
import { NoteEditor } from '@/components/notes/NoteEditor';

export default function NewNotePage() {
  const router = useRouter();

  return (
    <NoteEditor
      onSaved={(saved) => {
        router.push(`/notes/${saved.id}`);
      }}
    />
  );
}
