import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { NOTES_STORAGE_KEY } from '@/lib/storage/notes';
import type { Note } from '@/lib/storage/types';

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

const fractions = note({
  id: 'n-fractions',
  title: 'Fractions recap',
  body: 'Covered equivalent fractions.',
  tags: ['math'],
  type: 'observation',
  classId: 'c-1',
  studentIds: ['s-1'],
  updatedAt: '2026-03-10T09:00:00.000Z',
});
const behavior = note({
  id: 'n-behavior',
  title: 'Parent call',
  body: 'Discussed fractions deadline.',
  type: 'behavior',
  classId: 'c-1',
  studentIds: ['s-2'],
  updatedAt: '2026-03-15T09:00:00.000Z',
});
const lab = note({
  id: 'n-lab',
  title: 'Lab safety',
  body: 'Goggles rules.',
  classId: 'c-2',
  studentIds: ['s-3'],
  updatedAt: '2026-02-01T09:00:00.000Z',
});

function seed() {
  localStorage.setItem(
    NOTES_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      notes: [lab, fractions, behavior],
      classes: [
        { id: 'c-1', name: 'Algebra I', period: 'P1', subject: 'Math', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'c-2', name: 'Biology', period: 'P2', subject: 'Science', createdAt: '2026-01-02T00:00:00.000Z' },
      ],
      students: [
        { id: 's-1', classId: 'c-1', name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 's-2', classId: 'c-1', name: 'Grace', createdAt: '2026-01-01T00:00:01.000Z' },
        { id: 's-3', classId: 'c-2', name: 'Alan', createdAt: '2026-01-01T00:00:02.000Z' },
      ],
    }),
  );
}

async function renderSearch() {
  const { default: SearchPage } = await import('@/app/search/page');
  render(<SearchPage />);
}

describe('search page', () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it('shows the prompt state before any criteria are set', async () => {
    await renderSearch();
    expect(screen.getByText('Type to search, or pick a filter.')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('filters live by text and counts results newest-first', async () => {
    await renderSearch();
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'fractions' } });

    expect(screen.getByRole('status').textContent).toContain('2 notes found');
    const cards = screen.getAllByRole('link');
    expect(cards[0].getAttribute('href')).toBe('/notes/n-behavior');
    expect(cards[1].getAttribute('href')).toBe('/notes/n-fractions');
    expect(screen.queryByText('Lab safety')).toBeNull();
  });

  it('narrows by class and offers only that class students as chips', async () => {
    await renderSearch();
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'c-1' } });

    expect(screen.getByRole('status').textContent).toContain('2 notes found');
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('Grace')).toBeTruthy();
    expect(screen.queryByText('Alan')).toBeNull();
    expect(screen.queryByText('Lab safety')).toBeNull();
  });

  it('clears student selections when the class changes', async () => {
    await renderSearch();
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'c-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ada' }));
    expect(screen.getByRole('status').textContent).toContain('1 note found');

    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'c-2' } });
    expect(screen.queryByRole('button', { name: 'Ada' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('1 note found');
    expect(screen.getByText('Lab safety')).toBeTruthy();
  });

  it('filters by student chips (any-of)', async () => {
    await renderSearch();
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'c-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Grace' }));
    expect(screen.getByRole('status').textContent).toContain('1 note found');
    expect(screen.getByText('Parent call')).toBeTruthy();
    expect(screen.queryByText('Fractions recap')).toBeNull();
  });

  it('filters by type and tag chips', async () => {
    await renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'Behavior' }));
    expect(screen.getByRole('status').textContent).toContain('1 note found');
    expect(screen.getByText('Parent call')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Behavior' }));
    fireEvent.click(screen.getByRole('button', { name: 'math' }));
    expect(screen.getByRole('status').textContent).toContain('1 note found');
    expect(screen.getByText('Fractions recap')).toBeTruthy();
  });

  it('filters by updated-at date range', async () => {
    await renderSearch();
    const from = screen.getByLabelText('Updated from') as HTMLInputElement;
    fireEvent.change(from, { target: { value: '2026-03-11' } });
    expect(screen.getByRole('status').textContent).toContain('1 note found');
    expect(screen.getByText('Parent call')).toBeTruthy();
  });

  it('shows the no-match state when criteria exclude everything', async () => {
    await renderSearch();
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'zebra' } });
    expect(screen.getByText('No notes match your search.')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('clears every control via Clear filters', async () => {
    await renderSearch();
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'fractions' } });
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'c-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Behavior' }));

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(screen.getByText('Type to search, or pick a filter.')).toBeTruthy();
    expect((screen.getByLabelText('Search notes') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Class') as HTMLSelectElement).value).toBe('');
    expect(screen.getByRole('button', { name: 'Behavior' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });
});
