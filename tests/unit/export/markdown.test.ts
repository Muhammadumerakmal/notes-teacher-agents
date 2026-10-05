import { describe, expect, it } from 'vitest';
import { buildExportContext, notesToMarkdown } from '@/lib/export/markdown';
import type { Class, Student } from '@/lib/storage/org';
import type { Note } from '@/lib/storage/types';

const classes: Class[] = [
  { id: 'c-1', name: 'Algebra I', period: 'Period 3', subject: 'Math', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'c-2', name: 'Art, Craft', period: '', subject: 'Elective', createdAt: '2026-01-02T00:00:00.000Z' },
];
const students: Student[] = [
  { id: 's-1', classId: 'c-1', name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 's-2', classId: 'c-1', name: 'Grace', createdAt: '2026-01-01T00:00:01.000Z' },
];
const ctx = buildExportContext(classes, students);

function note(partial: Partial<Note> & { id: string; title: string }): Note {
  return {
    body: '',
    tags: [],
    type: 'general',
    classId: null,
    studentIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

const linked = note({
  id: 'n-1',
  title: 'Fractions recap',
  body: 'Covered equivalent fractions.',
  type: 'observation',
  classId: 'c-1',
  studentIds: ['s-1', 's-2'],
  tags: ['math'],
  updatedAt: '2026-03-10T09:00:00.000Z',
});
const bare = note({
  id: 'n-2',
  title: 'Staff notes',
  body: 'Plain body.',
  updatedAt: '2026-04-01T10:00:00.000Z',
});

describe('notesToMarkdown', () => {
  it('renders a fully-linked note with every meta line', () => {
    expect(notesToMarkdown([linked], ctx)).toBe(
      [
        '# Fractions recap',
        '',
        '- Date: 2026-03-10',
        '- Type: observation',
        '- Class: Algebra I (Period 3)',
        '- Students: Ada, Grace',
        '- Tags: math',
        '',
        'Covered equivalent fractions.',
        '',
      ].join('\n'),
    );
  });

  it('omits Class, Students, and Tags lines when empty', () => {
    expect(notesToMarkdown([bare], ctx)).toBe(
      ['# Staff notes', '', '- Date: 2026-04-01', '- Type: general', '', 'Plain body.', ''].join(
        '\n',
      ),
    );
  });

  it('omits the period suffix when the class has no period', () => {
    const artNote = note({ id: 'n-3', title: 'Pottery', classId: 'c-2', body: 'Clay day.' });
    expect(notesToMarkdown([artNote], ctx)).toContain('- Class: Art, Craft\n');
    expect(notesToMarkdown([artNote], ctx)).not.toContain('()');
  });

  it('joins notes with --- separators and never ends with one', () => {
    const output = notesToMarkdown([linked, bare], ctx);
    expect(output).toContain('equivalent fractions.\n\n---\n\n# Staff notes');
    expect(output.trimEnd().endsWith('---')).toBe(false);
    expect(output.endsWith('Plain body.\n')).toBe(true);
  });

  it('tolerates dangling class and student ids', () => {
    const dangling = note({
      id: 'n-4',
      title: 'Orphan',
      classId: 'c-gone',
      studentIds: ['s-gone'],
      body: 'Still fine.',
    });
    const output = notesToMarkdown([dangling], ctx);
    expect(output).not.toContain('- Class:');
    expect(output).not.toContain('- Students:');
    expect(output).toContain('# Orphan');
  });

  it('preserves input order (sorting is the caller\'s job)', () => {
    const output = notesToMarkdown([bare, linked], ctx);
    expect(output.indexOf('# Staff notes')).toBeLessThan(output.indexOf('# Fractions recap'));
  });
});

describe('buildExportContext', () => {
  it('maps ids to display names', () => {
    expect(ctx.classNames.get('c-1')).toEqual({ name: 'Algebra I', period: 'Period 3' });
    expect(ctx.studentNames.get('s-2')).toBe('Grace');
    expect(ctx.classNames.has('c-gone')).toBe(false);
    expect(ctx.studentNames.has('s-gone')).toBe(false);
  });
});
