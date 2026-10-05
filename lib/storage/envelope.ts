import { classSchema, envelopeSchema, noteSchema, studentSchema } from './schema';
import type { Class, Student } from './schema';
import type { Note } from './types';

export const NOTES_STORAGE_KEY = 'teacher-notes-agent:notes';

export interface AppSnapshot {
  notes: Note[];
  classes: Class[];
  students: Student[];
  loadError: boolean;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let snapshotCache: { raw: string | null; snapshot: AppSnapshot } | null = null;

const EMPTY: AppSnapshot = { notes: [], classes: [], students: [], loadError: false };

export function readEnvelope(): AppSnapshot {
  if (typeof window === 'undefined') return EMPTY;

  const raw = localStorage.getItem(NOTES_STORAGE_KEY);
  if (raw === null) return EMPTY;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY, loadError: true };
  }

  const envelope = envelopeSchema.safeParse(parsed);
  if (!envelope.success) return { ...EMPTY, loadError: true };

  let loadError = false;
  const notes: Note[] = [];
  for (const candidate of envelope.data.notes) {
    const result = noteSchema.safeParse(candidate);
    if (result.success) notes.push(result.data);
    else loadError = true;
  }

  const classes: Class[] = [];
  for (const candidate of envelope.data.classes ?? []) {
    const result = classSchema.safeParse(candidate);
    if (result.success) classes.push(result.data);
    else loadError = true;
  }

  const students: Student[] = [];
  for (const candidate of envelope.data.students ?? []) {
    const result = studentSchema.safeParse(candidate);
    if (result.success) students.push(result.data);
    else loadError = true;
  }

  return { notes, classes, students, loadError };
}

export function writeEnvelope(next: { notes: Note[]; classes: Class[]; students: Student[] }): void {
  localStorage.setItem(
    NOTES_STORAGE_KEY,
    JSON.stringify({ version: 1, notes: next.notes, classes: next.classes, students: next.students }),
  );
}

export function emitApp(): void {
  for (const listener of listeners) listener();
}

export function subscribeApp(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAppSnapshot(): AppSnapshot {
  if (typeof window === 'undefined') return EMPTY;
  const raw = localStorage.getItem(NOTES_STORAGE_KEY);
  if (snapshotCache === null || snapshotCache.raw !== raw) {
    snapshotCache = { raw, snapshot: readEnvelope() };
  }
  return snapshotCache.snapshot;
}

export function getServerAppSnapshot(): AppSnapshot | null {
  return null;
}
