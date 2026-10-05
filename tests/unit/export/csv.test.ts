import { describe, expect, it } from 'vitest';
import { notesToCsv } from '@/lib/export/csv';
import { buildExportContext } from '@/lib/export/markdown';
import type { Class, Student } from '@/lib/storage/org';
import type { Note } from '@/lib/storage/types';

const classes: Class[] = [
  { id: 'c-1', name: 'Algebra I', period: 'Period 3', subject: 'Math', createdAt: '2026-01-01T00:00:00.000Z' },
];
const students: Student[] = [
  { id: 's-1', classId: 'c-1', name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 's-2', classId: 'c-1', name: 'Grace H.', createdAt: '2026-01-01T00:00:01.000Z' },
];
const ctx = buildExportContext(classes, students);

function note(partial: Partial<Note> & { id: string; title: string }): Note {
  return {
    body: '',
    tags: [],
    type: 'general',
    classId: null,
    studentIds: [],
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-02T09:00:00.000Z',
    ...partial,
  };
}

const simple = note({
  id: 'n-1',
  title: 'Fractions recap',
  body: 'Covered equivalent fractions.',
  type: 'observation',
  tags: ['math'],
  classId: 'c-1',
  studentIds: ['s-1', 's-2'],
});

describe('notesToCsv', () => {
  it('starts with a BOM and the contracted header, rows end with CRLF', () => {
    const output = notesToCsv([simple], ctx);
    expect(output.startsWith('\uFEFF')).toBe(true);
    const withoutBom = output.slice('\uFEFF'.length);
    expect(withoutBom).toBe(
      'id,title,type,tags,class,students,created_at,updated_at,body\r\n' +
        'n-1,Fractions recap,observation,math,Algebra I,Ada;Grace H.,2026-01-01T08:00:00.000Z,2026-01-02T09:00:00.000Z,Covered equivalent fractions.\r\n',
    );
  });

  it('quotes fields containing commas, quotes, and newlines; doubles inner quotes', () => {
    const hostile = note({
      id: 'n-2',
      title: 'He said "hi", then left',
      body: 'Line one.\nLine two.',
      tags: ['a,b'],
    });
    const withoutBom = notesToCsv([hostile], ctx).slice('\uFEFF'.length);
    const row = withoutBom.split('\r\n')[1];
    expect(row).toBe(
      'n-2,"He said ""hi"", then left",general,"a,b",,,2026-01-01T08:00:00.000Z,2026-01-02T09:00:00.000Z,"Line one.\nLine two."',
    );
  });

  it('emits one row per note in input order; empty class resolves to an empty field', () => {
    const second = note({ id: 'n-3', title: 'Staff', body: 'Plain.' });
    const withoutBom = notesToCsv([simple, second], ctx).slice('\uFEFF'.length);
    const lines = withoutBom.split('\r\n');
    expect(lines).toHaveLength(4); // header + 2 rows + trailing empty
    expect(lines[1].startsWith('n-1,')).toBe(true);
    expect(lines[2]).toBe(
      'n-3,Staff,general,,,,2026-01-01T08:00:00.000Z,2026-01-02T09:00:00.000Z,Plain.',
    );
  });

  it('returns just the header for an empty scope', () => {
    expect(notesToCsv([], ctx).slice('\uFEFF'.length)).toBe(
      'id,title,type,tags,class,students,created_at,updated_at,body\r\n',
    );
  });
});
