import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteClass,
  deleteStudent,
  getClass,
  getOrgSnapshot,
  getServerOrgSnapshot,
  getStudent,
  listClasses,
  listStudents,
  saveClass,
  saveStudent,
  subscribeOrg,
} from '@/lib/storage/org';
import { NOTES_STORAGE_KEY, readNotes, saveNote } from '@/lib/storage/notes';

function seed(payload: object) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(payload));
}

describe('class repository', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('creates a class with trimmed name and defaults', () => {
    const cls = saveClass({ name: '  Algebra I  ', period: 'Period 3', subject: 'Math' });
    expect(cls.name).toBe('Algebra I');
    expect(cls.period).toBe('Period 3');
    expect(cls.subject).toBe('Math');
    expect(cls.id).toBeTruthy();
    expect(listClasses()).toEqual([cls]);
  });

  it('rejects a blank class name', () => {
    expect(() => saveClass({ name: '   ' })).toThrow();
  });

  it('updates a class in place, preserving createdAt and list order', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    const first = saveClass({ name: 'First' });
    vi.setSystemTime(new Date('2026-01-01T11:00:00Z'));
    saveClass({ name: 'Second' });
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const renamed = saveClass({ id: first.id, name: 'Renamed' });

    expect(renamed.createdAt).toBe(first.createdAt);
    expect(listClasses().map((c) => c.name)).toEqual(['Renamed', 'Second']);
    expect(getClass(first.id)?.name).toBe('Renamed');
  });

  it('returns false when deleting an unknown class', () => {
    expect(deleteClass('nope')).toBe(false);
  });
});

describe('student repository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates students within a class, sorted by name', () => {
    saveClass({ name: 'Algebra I' });
    const cls = listClasses()[0];
    saveStudent({ classId: cls.id, name: 'Zoe' });
    saveStudent({ classId: cls.id, name: ' Ada ' });

    const students = listStudents(cls.id);
    expect(students.map((s) => s.name)).toEqual(['Ada', 'Zoe']);
    expect(students.every((s) => s.classId === cls.id)).toBe(true);
    expect(getStudent(students[0].id)?.name).toBe('Ada');
  });

  it('rejects blank student names', () => {
    expect(() => saveStudent({ classId: 'c-1', name: '  ' })).toThrow();
  });

  it('returns students only for the requested class', () => {
    saveStudent({ classId: 'c-1', name: 'A' });
    saveStudent({ classId: 'c-2', name: 'B' });
    expect(listStudents('c-1').map((s) => s.name)).toEqual(['A']);
    expect(listStudents('c-3')).toEqual([]);
  });
});

describe('cascade unlink', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deleteClass removes the class and its students but never notes', () => {
    saveClass({ name: 'Algebra I' });
    const cls = listClasses()[0];
    const s1 = saveStudent({ classId: cls.id, name: 'Ada' });
    const s2 = saveStudent({ classId: cls.id, name: 'Grace' });
    const linked = saveNote({ title: 'Linked', body: '', classId: cls.id, studentIds: [s1.id, s2.id] });
    const other = saveNote({ title: 'Other', body: '' });

    expect(deleteClass(cls.id)).toBe(true);

    expect(listClasses()).toEqual([]);
    expect(listStudents(cls.id)).toEqual([]);
    const notes = readNotes().notes;
    expect(notes).toHaveLength(2);

    const reloadedLinked = notes.find((n) => n.id === linked.id);
    expect(reloadedLinked?.classId).toBeNull();
    expect(reloadedLinked?.studentIds).toEqual([]);

    const reloadedOther = notes.find((n) => n.id === other.id);
    expect(reloadedOther?.classId).toBeNull();
    expect(reloadedOther?.studentIds).toEqual([]);
  });

  it('deleteStudent removes the student and its links but keeps the class', () => {
    saveClass({ name: 'Algebra I' });
    const cls = listClasses()[0];
    const keep = saveStudent({ classId: cls.id, name: 'Ada' });
    const gone = saveStudent({ classId: cls.id, name: 'Grace' });
    const note = saveNote({ title: 'Both', body: '', classId: cls.id, studentIds: [keep.id, gone.id] });

    expect(deleteStudent(gone.id)).toBe(true);

    expect(listStudents(cls.id).map((s) => s.name)).toEqual(['Ada']);
    expect(getClass(cls.id)).toBeDefined();
    const reloaded = readNotes().notes.find((n) => n.id === note.id);
    expect(reloaded?.classId).toBe(cls.id);
    expect(reloaded?.studentIds).toEqual([keep.id]);
    expect(deleteStudent(gone.id)).toBe(false);
  });
});

describe('org snapshots', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for the server snapshot', () => {
    expect(getServerOrgSnapshot()).toBeNull();
  });

  it('returns a stable view until something changes', () => {
    seed({ version: 1, notes: [], classes: [], students: [] });
    const first = getOrgSnapshot();
    expect(getOrgSnapshot()).toBe(first);
    saveClass({ name: 'Algebra I' });
    const second = getOrgSnapshot();
    expect(second).not.toBe(first);
    expect(second.classes).toHaveLength(1);
    expect(second.loadError).toBe(false);
    expect(getOrgSnapshot()).toBe(second);
  });

  it('notifies org subscribers on org writes AND note writes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOrg(listener);

    saveClass({ name: 'Algebra I' });
    expect(listener).toHaveBeenCalledTimes(1);

    saveNote({ title: 'Broadcast from notes', body: '' });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    saveClass({ name: 'Chemistry' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('preserves existing notes when classes are written', () => {
    saveNote({ title: 'Keeper', body: '' });
    saveClass({ name: 'Algebra I' });
    expect(readNotes().notes.map((n) => n.title)).toEqual(['Keeper']);
  });
});
