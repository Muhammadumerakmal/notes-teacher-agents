'use client';

import { useSyncExternalStore } from 'react';
import { ClassCard } from '@/components/org/ClassCard';
import { ClassForm } from '@/components/org/ClassForm';
import { getNotesSnapshot, getServerNotesSnapshot, subscribeNotes } from '@/lib/storage/notes';
import { getOrgSnapshot, getServerOrgSnapshot, saveClass, subscribeOrg } from '@/lib/storage/org';

export default function ClassesPage() {
  const org = useSyncExternalStore(subscribeOrg, getOrgSnapshot, getServerOrgSnapshot);
  const notesResult = useSyncExternalStore(
    subscribeNotes,
    getNotesSnapshot,
    getServerNotesSnapshot,
  );

  if (org === null || notesResult === null) {
    return <main className="p-6 text-sm text-neutral-500">Loading classes…</main>;
  }

  const classes = org.classes.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <main className="p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Classes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Organize your classes and rosters — notes stay linked, never lost.
        </p>
      </header>

      {(org.loadError || notesResult.loadError) && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Some stored data could not be read and was skipped.
        </p>
      )}

      <div className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <h2 className="mb-2 text-sm font-medium">Create a class</h2>
        <ClassForm onSubmit={(values) => saveClass(values)} />
      </div>

      {classes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-neutral-500">No classes yet.</p>
          <p className="mt-1 text-sm text-neutral-400">Create your first class above.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              studentCount={org.students.filter((student) => student.classId === cls.id).length}
              noteCount={notesResult.notes.filter((note) => note.classId === cls.id).length}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
