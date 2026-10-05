import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NOTES_STORAGE_KEY,
  deleteNote,
  getNote,
  getNotesSnapshot,
  getServerNotesSnapshot,
  listNotes,
  readNotes,
  saveNote,
  subscribeNotes,
} from '@/lib/storage/notes';

function seedRaw(payload: string) {
  localStorage.setItem(NOTES_STORAGE_KEY, payload);
}

describe('notes repository', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('creates a note with defaults', () => {
    const note = saveNote({ title: 'Parent call', body: 'Discussed progress.' });
    expect(note.id).toBeTruthy();
    expect(note.type).toBe('general');
    expect(note.tags).toEqual([]);
    expect(note.classId).toBeNull();
    expect(note.studentIds).toEqual([]);
    expect(note.createdAt).toBe(note.updatedAt);
    expect(readNotes().notes).toHaveLength(1);
    expect(readNotes().loadError).toBe(false);
  });

  it('round-trips through persistence', async () => {
    saveNote({ title: 'A', body: 'first' });
    vi.resetModules();
    const fresh = await import('@/lib/storage/notes');
    expect(fresh.listNotes()).toHaveLength(1);
    expect(fresh.listNotes()[0].title).toBe('A');
  });

  it('updates a note, preserving createdAt and bumping updatedAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    const created = saveNote({ title: 'First', body: 'v1' });
    vi.setSystemTime(new Date('2026-01-01T10:05:00Z'));
    const updated = saveNote({ id: created.id, title: 'Second', body: 'v2' });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBe('2026-01-01T10:05:00.000Z');
    expect(listNotes()).toHaveLength(1);
    expect(getNote(created.id)?.title).toBe('Second');
  });

  it('deletes notes and reports whether one existed', () => {
    const note = saveNote({ title: 'Gone soon', body: '' });
    expect(deleteNote(note.id)).toBe(true);
    expect(getNote(note.id)).toBeUndefined();
    expect(listNotes()).toHaveLength(0);
    expect(deleteNote(note.id)).toBe(false);
  });

  it('falls back to Untitled for blank titles', () => {
    expect(saveNote({ title: '', body: 'x' }).title).toBe('Untitled');
    expect(saveNote({ title: '   ', body: 'x' }).title).toBe('Untitled');
  });

  it('normalizes tags: trim, lowercase, dedupe, keep order', () => {
    const note = saveNote({ title: 't', body: '', tags: ['  Math ', 'math', 'ALGEBRA'] });
    expect(note.tags).toEqual(['math', 'algebra']);
  });

  it('lists notes newest-updated first', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    const older = saveNote({ title: 'Older', body: '' });
    vi.setSystemTime(new Date('2026-01-01T11:00:00Z'));
    const newer = saveNote({ title: 'Newer', body: '' });
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    saveNote({ id: older.id, title: 'Older edited', body: '' });
    expect(listNotes().map((n) => n.id)).toEqual([older.id, newer.id]);
  });

  it('recovers from a corrupt payload: empty store + loadError', () => {
    seedRaw('{not json');
    const { notes, loadError } = readNotes();
    expect(notes).toEqual([]);
    expect(loadError).toBe(true);
    expect(listNotes()).toEqual([]);
  });

  it('drops invalid notes but keeps valid ones, flagging loadError', () => {
    seedRaw(
      JSON.stringify({
        version: 1,
        notes: [
          { id: 'n1', title: 'Good', body: '', tags: [], type: 'general', classId: null, studentIds: [], createdAt: 'a', updatedAt: 'a' },
          { id: 'n2', title: 'Bad', body: '', tags: [], type: 'not-a-type', classId: null, studentIds: [], createdAt: 'b', updatedAt: 'b' },
        ],
      }),
    );
    const { notes, loadError } = readNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('n1');
    expect(loadError).toBe(true);
  });

  it('rejects an unknown envelope version as corrupt', () => {
    seedRaw(JSON.stringify({ version: 2, notes: [] }));
    const { notes, loadError } = readNotes();
    expect(notes).toEqual([]);
    expect(loadError).toBe(true);
  });

  it('overwrites a corrupt payload after the next save', () => {
    seedRaw('{not json');
    expect(readNotes().loadError).toBe(true);
    saveNote({ title: 'Fresh start', body: '' });
    const { notes, loadError } = readNotes();
    expect(loadError).toBe(false);
    expect(notes).toHaveLength(1);
  });
});

describe('notes snapshot store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for the server snapshot', () => {
    expect(getServerNotesSnapshot()).toBeNull();
  });

  it('returns a stable snapshot object until storage changes', () => {
    const first = getNotesSnapshot();
    expect(getNotesSnapshot()).toBe(first);
    expect(first.loadError).toBe(false);

    saveNote({ title: 'Snapshot note', body: '' });

    const second = getNotesSnapshot();
    expect(second).not.toBe(first);
    expect(second.notes).toHaveLength(1);
    expect(getNotesSnapshot()).toBe(second);
  });

  it('reports corrupt storage through the snapshot', () => {
    seedRaw('{not json');
    const snapshot = getNotesSnapshot();
    expect(snapshot.notes).toEqual([]);
    expect(snapshot.loadError).toBe(true);
  });

  it('notifies subscribers on save and delete, and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeNotes(listener);

    const note = saveNote({ title: 'A', body: '' });
    expect(listener).toHaveBeenCalledTimes(1);

    deleteNote(note.id);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    saveNote({ title: 'B', body: '' });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
