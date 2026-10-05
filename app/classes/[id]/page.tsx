'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { NoteCard } from '@/components/notes/NoteCard';
import { ClassForm } from '@/components/org/ClassForm';
import { StudentList } from '@/components/org/StudentList';
import { getNotesSnapshot, getServerNotesSnapshot, subscribeNotes } from '@/lib/storage/notes';
import {
  deleteClass,
  deleteStudent,
  getOrgSnapshot,
  getServerOrgSnapshot,
  saveClass,
  saveStudent,
  subscribeOrg,
} from '@/lib/storage/org';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const org = useSyncExternalStore(subscribeOrg, getOrgSnapshot, getServerOrgSnapshot);
  const notesResult = useSyncExternalStore(
    subscribeNotes,
    getNotesSnapshot,
    getServerNotesSnapshot,
  );

  if (org === null || notesResult === null) {
    return <main className="p-6 text-sm text-neutral-500">Loading class…</main>;
  }

  const cls = org.classes.find((candidate) => candidate.id === id) ?? null;

  if (cls === null) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Class not found</h1>
        <p className="mt-2 text-sm text-neutral-500">It may have been deleted.</p>
        <Link
          href="/classes"
          className="mt-3 inline-block text-sm text-blue-600 underline dark:text-blue-400"
        >
          Back to classes
        </Link>
      </main>
    );
  }

  const students = org.students
    .filter((student) => student.classId === cls.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const linkedNotes = notesResult.notes
    .filter((note) => note.classId === cls.id)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const handleDeleteClass = () => {
    if (!window.confirm(`Delete ${cls.name}? Linked notes are kept but unlinked.`)) return;
    deleteClass(cls.id);
    router.push('/classes');
  };

  return (
    <main className="p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{cls.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {[cls.period, cls.subject].filter((part) => part !== '').join(' · ') || 'No details yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/classes"
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            All classes
          </Link>
          <button
            type="button"
            onClick={handleDeleteClass}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
          >
            Delete class
          </button>
        </div>
      </header>

      <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <h2 className="mb-2 text-sm font-medium">Class info</h2>
        <ClassForm
          initial={{ name: cls.name, period: cls.period, subject: cls.subject }}
          submitLabel="Save"
          onSubmit={(values) => saveClass({ id: cls.id, ...values })}
        />
      </section>

      <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <h2 className="mb-3 text-sm font-medium">
          Students {students.length > 0 && <span className="text-neutral-400">({students.length})</span>}
        </h2>
        <StudentList
          students={students}
          onAdd={(name) => saveStudent({ classId: cls.id, name })}
          onRename={(studentId, name) => saveStudent({ id: studentId, classId: cls.id, name })}
          onDelete={(studentId) => deleteStudent(studentId)}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">
          Linked notes{' '}
          {linkedNotes.length > 0 && <span className="text-neutral-400">({linkedNotes.length})</span>}
        </h2>
        {linkedNotes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
            <p className="text-sm text-neutral-500">
              No notes linked yet — pick this class while writing one.
            </p>
            <Link
              href="/notes/new"
              className="mt-2 inline-block text-sm text-blue-600 underline dark:text-blue-400"
            >
              Write a note
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {linkedNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
