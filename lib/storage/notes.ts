import { NOTES_STORAGE_KEY, emitApp, readEnvelope, writeEnvelope } from './envelope';
import { noteInputSchema, noteSchema } from './schema';
import type { Note, NoteInput, NoteReadResult } from './types';

export { NOTES_STORAGE_KEY };
export {
  getAppSnapshot as getNotesSnapshot,
  getServerAppSnapshot as getServerNotesSnapshot,
  subscribeApp as subscribeNotes,
} from './envelope';

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (tag !== '' && !out.includes(tag)) out.push(tag);
  }
  return out;
}

export function readNotes(): NoteReadResult {
  const { notes, loadError } = readEnvelope();
  return { notes, loadError };
}

export function listNotes(): Note[] {
  return readNotes().notes.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getNote(id: string): Note | undefined {
  return readNotes().notes.find((note) => note.id === id);
}

export function saveNote(input: NoteInput): Note {
  const parsedInput = noteInputSchema.parse(input);
  const existing = parsedInput.id !== undefined ? getNote(parsedInput.id) : undefined;
  const now = new Date().toISOString();

  const note = noteSchema.parse({
    id: existing?.id ?? parsedInput.id ?? newId(),
    title: parsedInput.title.trim() === '' ? 'Untitled' : parsedInput.title,
    body: parsedInput.body,
    tags: normalizeTags(parsedInput.tags ?? existing?.tags ?? []),
    type: parsedInput.type ?? existing?.type ?? 'general',
    classId: parsedInput.classId !== undefined ? parsedInput.classId : (existing?.classId ?? null),
    studentIds: parsedInput.studentIds ?? existing?.studentIds ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  const { notes, classes, students } = readEnvelope();
  writeEnvelope({
    notes: [...notes.filter((n) => n.id !== note.id), note],
    classes,
    students,
  });
  emitApp();
  return note;
}

export function deleteNote(id: string): boolean {
  const { notes, classes, students } = readEnvelope();
  const next = notes.filter((note) => note.id !== id);
  if (next.length === notes.length) return false;
  writeEnvelope({ notes: next, classes, students });
  emitApp();
  return true;
}
