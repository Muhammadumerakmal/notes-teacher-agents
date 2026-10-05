'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { deleteNote, saveNote } from '@/lib/storage/notes';
import { getOrgSnapshot, getServerOrgSnapshot, subscribeOrg } from '@/lib/storage/org';
import type { Note, NoteType } from '@/lib/storage/types';
import { ClassSelect } from './ClassSelect';
import { MarkdownPreview } from './MarkdownPreview';
import { StudentSelect } from './StudentSelect';
import { TagInput } from './TagInput';
import { TypeSelect } from './TypeSelect';

const AUTOSAVE_DELAY_MS = 800;

export function NoteEditor({
  note,
  onSaved,
  onDeleted,
}: {
  note?: Note;
  onSaved?: (saved: Note) => void;
  onDeleted?: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [type, setType] = useState<NoteType>(note?.type ?? 'general');
  const [classId, setClassId] = useState<string | null>(note?.classId ?? null);
  const [studentIds, setStudentIds] = useState<string[]>(note?.studentIds ?? []);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(note?.updatedAt ?? null);

  const org = useSyncExternalStore(subscribeOrg, getOrgSnapshot, getServerOrgSnapshot);
  const orgClasses = org?.classes ?? [];
  const classStudents = (org?.students ?? []).filter((student) => student.classId === classId);

  const isNewAndEmpty = note === undefined && title.trim() === '' && body.trim() === '' && tags.length === 0;

  function persist() {
    const saved = saveNote({ id: note?.id, title, body, tags, type, classId, studentIds });
    setSavedAt(saved.updatedAt);
    setDirty(false);
    onSaved?.(saved);
  }

  useEffect(() => {
    if (!note || !dirty) return;
    const timer = setTimeout(() => persist(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  });

  function handleDelete() {
    if (!note) return;
    if (window.confirm('Delete this note?')) {
      deleteNote(note.id);
      onDeleted?.();
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-6">
      <div>
        <label htmlFor="note-title" className="mb-1 block text-xs font-medium text-neutral-500">
          Title
        </label>
        <input
          id="note-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setDirty(true);
          }}
          placeholder="Title"
          className="w-full border-none bg-transparent text-2xl font-semibold outline-none placeholder:text-neutral-400"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <TypeSelect
          value={type}
          onChange={(next) => {
            setType(next);
            setDirty(true);
          }}
        />
        <TagInput
          tags={tags}
          onChange={(next) => {
            setTags(next);
            setDirty(true);
          }}
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-neutral-500" aria-live="polite">
            {dirty ? 'Unsaved changes' : savedAt !== null ? 'Saved' : ''}
          </span>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
          {note && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={persist}
            disabled={isNewAndEmpty}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ClassSelect
          value={classId}
          classes={orgClasses}
          onChange={(next) => {
            setClassId(next);
            setStudentIds([]);
            setDirty(true);
          }}
        />
        {classId !== null && (
          <StudentSelect
            students={classStudents}
            selected={studentIds}
            onChange={(next) => {
              setStudentIds(next);
              setDirty(true);
            }}
          />
        )}
      </div>

      {preview ? (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-neutral-200 p-4 dark:border-neutral-700">
          <MarkdownPreview>{body}</MarkdownPreview>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <label htmlFor="note-body" className="mb-1 block text-xs font-medium text-neutral-500">
            Body
          </label>
          <textarea
            id="note-body"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setDirty(true);
            }}
            placeholder="Write your note in markdown…"
            className="min-h-72 w-full flex-1 resize-none rounded-md border border-neutral-200 p-3 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700"
          />
        </div>
      )}
    </div>
  );
}
