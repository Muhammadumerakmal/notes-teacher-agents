import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NOTES_STORAGE_KEY } from '@/lib/storage/notes';
import type { Note } from '@/lib/storage/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: 'n-1' }),
  usePathname: () => '/notes',
}));

const storedNote: Note = {
  id: 'n-1',
  title: 'Fractions recap',
  body: 'Covered equivalent fractions.',
  tags: ['math'],
  type: 'observation',
  classId: null,
  studentIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function seed(notes: Note[]) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({ version: 1, notes }));
}

describe('notes pages', () => {
  it('lists stored notes on /notes', async () => {
    seed([storedNote]);
    const { default: NotesPage } = await import('@/app/notes/page');
    render(<NotesPage />);
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeTruthy();
    expect(screen.getByText('Fractions recap')).toBeTruthy();
    expect(screen.getByText('#math')).toBeTruthy();
  });

  it('shows the empty state when nothing is stored', async () => {
    seed([]);
    const { default: NotesPage } = await import('@/app/notes/page');
    render(<NotesPage />);
    expect(screen.getByText('No notes yet.')).toBeTruthy();
  });

  it('renders the editor when the note exists', async () => {
    seed([storedNote]);
    const { default: EditNotePage } = await import('@/app/notes/[id]/page');
    render(<EditNotePage />);
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Fractions recap');
  });

  it('shows a not-found state when the id is unknown', async () => {
    seed([]);
    const { default: EditNotePage } = await import('@/app/notes/[id]/page');
    render(<EditNotePage />);
    expect(screen.getByRole('heading', { name: 'Note not found' })).toBeTruthy();
  });
});
