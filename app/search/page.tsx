'use client';

import { useState, useSyncExternalStore } from 'react';
import { ClassSelect } from '@/components/notes/ClassSelect';
import { NoteCard } from '@/components/notes/NoteCard';
import { StudentSelect } from '@/components/notes/StudentSelect';
import { allTags, searchNotes } from '@/lib/search/query';
import { getNotesSnapshot, getServerNotesSnapshot, subscribeNotes } from '@/lib/storage/notes';
import { getOrgSnapshot, getServerOrgSnapshot, subscribeOrg } from '@/lib/storage/org';
import { NOTE_TYPES } from '@/lib/storage/types';
import type { NoteType } from '@/lib/storage/types';

function chipClass(active: boolean): string {
  return `rounded-full px-2 py-0.5 text-xs ${
    active
      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
  }`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [tag, setTag] = useState<string | null>(null);
  const [types, setTypes] = useState<NoteType[]>([]);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const org = useSyncExternalStore(subscribeOrg, getOrgSnapshot, getServerOrgSnapshot);
  const result = useSyncExternalStore(subscribeNotes, getNotesSnapshot, getServerNotesSnapshot);

  if (org === null || result === null) {
    return <main className="p-6 text-sm text-neutral-500">Loading search…</main>;
  }

  const isDefault =
    query.trim() === '' &&
    classId === null &&
    studentIds.length === 0 &&
    tag === null &&
    types.length === 0 &&
    dateFrom === null &&
    dateTo === null;

  const results = isDefault
    ? []
    : searchNotes(result.notes, {
        query,
        classId,
        studentIds,
        tag,
        types,
        dateFrom,
        dateTo,
      }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const tagOptions = allTags(result.notes);
  const classStudents = org.students.filter((student) => student.classId === classId);

  const inputClass =
    'rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700';

  return (
    <main className="p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Find notes by words, class, students, tag, type, or date.
        </p>
      </header>

      {result.loadError && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Some stored data could not be read and was skipped.
        </p>
      )}

      <div className="mb-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <input
          aria-label="Search notes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes…"
          autoFocus
          className={`mb-3 w-full ${inputClass}`}
        />

        <div className="flex flex-wrap items-center gap-2">
          <ClassSelect
            anyLabel="Any class"
            value={classId}
            classes={org.classes}
            onChange={(next) => {
              setClassId(next);
              setStudentIds([]);
            }}
          />
          {classId !== null && (
            <StudentSelect students={classStudents} selected={studentIds} onChange={setStudentIds} />
          )}
        </div>

        {tagOptions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1" role="group" aria-label="Tags">
            <span className="mr-1 text-xs font-medium text-neutral-500">Tag</span>
            {tagOptions.map((tagOption) => (
              <button
                key={tagOption}
                type="button"
                aria-pressed={tag === tagOption}
                onClick={() => setTag(tag === tagOption ? null : tagOption)}
                className={chipClass(tag === tagOption)}
              >
                {tagOption}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1" role="group" aria-label="Types">
          <span className="mr-1 text-xs font-medium text-neutral-500">Type</span>
          {NOTE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={types.includes(type)}
              onClick={() =>
                setTypes(
                  types.includes(type)
                    ? types.filter((selected) => selected !== type)
                    : [...types, type],
                )
              }
              className={chipClass(types.includes(type))}
            >
              {capitalize(type)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
            Updated from
            <input
              type="date"
              value={dateFrom ?? ''}
              onChange={(event) => setDateFrom(event.target.value === '' ? null : event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
            Updated to
            <input
              type="date"
              value={dateTo ?? ''}
              onChange={(event) => setDateTo(event.target.value === '' ? null : event.target.value)}
              className={inputClass}
            />
          </label>
          {!isDefault && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setClassId(null);
                setStudentIds([]);
                setTag(null);
                setTypes([]);
                setDateFrom(null);
                setDateTo(null);
              }}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {isDefault ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-neutral-500">Type to search, or pick a filter.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-neutral-500">No notes match your search.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-neutral-500" role="status">
            {results.length} {results.length === 1 ? 'note' : 'notes'} found
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
