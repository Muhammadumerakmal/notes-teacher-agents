import { describe, expect, it } from 'vitest';
import { allTags, searchNotes } from '@/lib/search/query';
import type { SearchCriteria } from '@/lib/search/query';
import type { Note } from '@/lib/storage/types';

function note(partial: Partial<Note> & { id: string }): Note {
  return {
    title: '',
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

const criteria = (overrides: Partial<SearchCriteria> = {}): SearchCriteria => ({
  query: '',
  classId: null,
  studentIds: [],
  tag: null,
  types: [],
  dateFrom: null,
  dateTo: null,
  ...overrides,
});

const fractions = note({
  id: 'n-fractions',
  title: 'Fractions recap',
  body: 'Covered equivalent fractions.',
  tags: ['math'],
  type: 'observation',
  classId: 'c-1',
  studentIds: ['s-1'],
  createdAt: '2026-03-10T08:00:00.000Z',
  updatedAt: '2026-03-10T09:00:00.000Z',
});
const behavior = note({
  id: 'n-behavior',
  title: 'Late to class',
  body: 'Talked with parent about fractions deadline.',
  tags: ['follow-up'],
  type: 'behavior',
  classId: 'c-1',
  studentIds: ['s-1', 's-2'],
  createdAt: '2026-03-14T08:00:00.000Z',
  updatedAt: '2026-03-15T09:00:00.000Z',
});
const lab = note({
  id: 'n-lab',
  title: 'Lab safety',
  body: 'Walked through goggles rules.',
  tags: ['science', 'Math'],
  type: 'general',
  classId: 'c-2',
  studentIds: ['s-3'],
  createdAt: '2026-03-12T08:00:00.000Z',
  updatedAt: '2026-02-01T09:00:00.000Z',
});
const unlinked = note({
  id: 'n-unlinked',
  title: 'Staff meeting',
  body: 'Budget discussion.',
  updatedAt: '2026-04-01T09:00:00.000Z',
});

const all = [fractions, behavior, lab, unlinked];

describe('searchNotes — text matching', () => {
  it('returns everything for empty criteria, in input order', () => {
    expect(searchNotes(all, criteria())).toEqual(all);
  });

  it('matches title, body, and tags case-insensitively', () => {
    expect(searchNotes(all, criteria({ query: 'FRACTIONS' })).map((n) => n.id)).toEqual([
      'n-fractions',
      'n-behavior',
    ]);
    expect(searchNotes(all, criteria({ query: 'goggles' })).map((n) => n.id)).toEqual(['n-lab']);
    expect(searchNotes(all, criteria({ query: 'FOLLOW-UP' })).map((n) => n.id)).toEqual([
      'n-behavior',
    ]);
  });

  it('requires every whitespace-separated term to match (AND)', () => {
    expect(searchNotes(all, criteria({ query: 'fractions deadline' })).map((n) => n.id)).toEqual([
      'n-behavior',
    ]);
    expect(searchNotes(all, criteria({ query: 'fractions zebra' }))).toEqual([]);
  });

  it('matches substrings and trims outer whitespace', () => {
    expect(searchNotes(all, criteria({ query: '  frac ' })).map((n) => n.id)).toEqual([
      'n-fractions',
      'n-behavior',
    ]);
  });
});

describe('searchNotes — filters', () => {
  it('filters by class', () => {
    expect(searchNotes(all, criteria({ classId: 'c-1' })).map((n) => n.id)).toEqual([
      'n-fractions',
      'n-behavior',
    ]);
  });

  it('filters by any-of students', () => {
    expect(searchNotes(all, criteria({ studentIds: ['s-2'] })).map((n) => n.id)).toEqual([
      'n-behavior',
    ]);
    expect(searchNotes(all, criteria({ studentIds: ['s-2', 's-3'] })).map((n) => n.id)).toEqual([
      'n-behavior',
      'n-lab',
    ]);
    expect(searchNotes(all, criteria({ studentIds: ['s-none'] }))).toEqual([]);
  });

  it('filters by tag case-insensitively', () => {
    expect(searchNotes(all, criteria({ tag: 'math' })).map((n) => n.id)).toEqual([
      'n-fractions',
      'n-lab',
    ]);
    expect(searchNotes(all, criteria({ tag: 'MATH' })).map((n) => n.id)).toEqual([
      'n-fractions',
      'n-lab',
    ]);
  });

  it('filters by type membership', () => {
    expect(searchNotes(all, criteria({ types: ['behavior', 'general'] })).map((n) => n.id)).toEqual([
      'n-behavior',
      'n-lab',
      'n-unlinked',
    ]);
  });

  it('filters by updatedAt date range, inclusive on both ends', () => {
    expect(searchNotes(all, criteria({ dateFrom: '2026-03-10', dateTo: '2026-03-15' })).map((n) => n.id)).toEqual([
      'n-fractions',
      'n-behavior',
    ]);
    expect(searchNotes(all, criteria({ dateFrom: '2026-03-11' })).map((n) => n.id)).toEqual([
      'n-behavior',
      'n-unlinked',
    ]);
    expect(searchNotes(all, criteria({ dateTo: '2026-03-10' })).map((n) => n.id)).toEqual([
      'n-fractions',
      'n-lab',
    ]);
  });

  it('uses updatedAt, not createdAt, for dates', () => {
    expect(
      searchNotes(all, criteria({ dateFrom: '2026-03-05' })).map((n) => n.id),
    ).not.toContain('n-lab');
  });

  it('combines text and all filters with AND', () => {
    const result = searchNotes(
      all,
      criteria({
        query: 'fractions',
        classId: 'c-1',
        studentIds: ['s-1'],
        tag: 'math',
        types: ['observation'],
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
      }),
    );
    expect(result.map((n) => n.id)).toEqual(['n-fractions']);
  });
});

describe('allTags', () => {
  it('returns distinct tags, first-seen casing, sorted', () => {
    expect(allTags(all)).toEqual(['follow-up', 'math', 'science']);
  });

  it('deduplicates case-insensitively keeping first-seen casing', () => {
    expect(allTags([note({ id: 'a', tags: ['math'] }), note({ id: 'b', tags: ['Math', 'Lab'] })])).toEqual([
      'Lab',
      'math',
    ]);
  });

  it('returns an empty list when there are no notes', () => {
    expect(allTags([])).toEqual([]);
  });
});
