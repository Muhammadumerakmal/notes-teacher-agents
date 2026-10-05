'use client';

import { useState } from 'react';
import type { Student } from '@/lib/storage/org';

export function StudentList({
  students,
  onAdd,
  onRename,
  onDelete,
}: {
  students: Student[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const inputClass =
    'rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700';
  const smallButton =
    'rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800';

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim() === '') return;
          onAdd(draft);
          setDraft('');
        }}
      >
        <input
          aria-label="New student name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Student name"
          className={`flex-1 ${inputClass}`}
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          Add student
        </button>
      </form>

      {students.length === 0 ? (
        <p className="text-sm text-neutral-500">No students yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {students.map((student) => (
            <li
              key={student.id}
              className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-700"
            >
              {editingId === student.id ? (
                <>
                  <input
                    aria-label={`Rename ${student.name}`}
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className={`flex-1 ${inputClass}`}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={smallButton}
                    onClick={() => {
                      if (editingName.trim() !== '') onRename(student.id, editingName);
                      setEditingId(null);
                    }}
                  >
                    Save
                  </button>
                  <button type="button" className={smallButton} onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{student.name}</span>
                  <button
                    type="button"
                    aria-label={`Rename student ${student.name}`}
                    className={smallButton}
                    onClick={() => {
                      setEditingId(student.id);
                      setEditingName(student.name);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete student ${student.name}`}
                    className={`${smallButton} text-red-600 hover:bg-red-50 dark:hover:bg-red-950`}
                    onClick={() => {
                      if (window.confirm(`Delete ${student.name}?`)) onDelete(student.id);
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
