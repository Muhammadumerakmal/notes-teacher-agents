import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getServerAppSnapshot } from '@/lib/storage/envelope';
import {
  NOTES_STORAGE_KEY,
  getNotesSnapshot,
  saveNote,
  subscribeNotes,
} from '@/lib/storage/notes';

const validNote = {
  id: 'n-1',
  title: 'Kept note',
  body: 'Body',
  tags: [],
  type: 'general',
  classId: null,
  studentIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const validClass = {
  id: 'c-1',
  name: 'Algebra I',
  period: 'Period 3',
  subject: 'Math',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const validStudent = {
  id: 's-1',
  classId: 'c-1',
  name: 'Ada L.',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function seed(payload: object) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(payload));
}

describe('envelope store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for the server app snapshot', () => {
    expect(getServerAppSnapshot()).toBeNull();
  });

  it('loads an old notes-only payload with empty classes and students', () => {
    seed({ version: 1, notes: [validNote] });
    const snapshot = getNotesSnapshot();
    expect(snapshot.notes).toHaveLength(1);
    expect(snapshot.loadError).toBe(false);
    expect(Array.isArray(snapshot.classes)).toBe(true);
    expect(snapshot.classes).toEqual([]);
    expect(snapshot.students).toEqual([]);
  });

  it('keeps classes and students when a note is saved', () => {
    seed({ version: 1, notes: [validNote], classes: [validClass], students: [validStudent] });
    saveNote({ title: 'Another', body: '' });

    const snapshot = getNotesSnapshot();
    expect(snapshot.notes).toHaveLength(2);
    expect(snapshot.classes).toEqual([validClass]);
    expect(snapshot.students).toEqual([validStudent]);
    expect(snapshot.loadError).toBe(false);
  });

  it('drops a corrupt class entry without losing notes', () => {
    seed({ version: 1, notes: [validNote], classes: [{ bogus: true }], students: [] });
    const snapshot = getNotesSnapshot();
    expect(snapshot.notes).toHaveLength(1);
    expect(snapshot.classes).toEqual([]);
    expect(snapshot.loadError).toBe(true);
  });

  it('drops a corrupt student entry without losing notes or classes', () => {
    seed({ version: 1, notes: [validNote], classes: [validClass], students: [{ id: '' }] });
    const snapshot = getNotesSnapshot();
    expect(snapshot.notes).toHaveLength(1);
    expect(snapshot.classes).toHaveLength(1);
    expect(snapshot.students).toEqual([]);
    expect(snapshot.loadError).toBe(true);
  });

  it('notifies shared subscribers when a note is written', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeNotes(listener);
    saveNote({ title: 'Broadcast', body: '' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    saveNote({ title: 'Quiet', body: '' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns a stable snapshot object until the payload changes', () => {
    seed({ version: 1, notes: [], classes: [], students: [] });
    const first = getNotesSnapshot();
    expect(getNotesSnapshot()).toBe(first);
    saveNote({ title: 'X', body: '' });
    const second = getNotesSnapshot();
    expect(second).not.toBe(first);
    expect(getNotesSnapshot()).toBe(second);
  });
});
