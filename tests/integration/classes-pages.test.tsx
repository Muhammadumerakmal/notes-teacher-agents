import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NOTES_STORAGE_KEY } from '@/lib/storage/notes';
import type { Note } from '@/lib/storage/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: 'c-1' }),
  usePathname: () => '/classes',
}));

interface StoredClass {
  id: string;
  name: string;
  period: string;
  subject: string;
  createdAt: string;
}
interface StoredStudent {
  id: string;
  classId: string;
  name: string;
  createdAt: string;
}

const storedClass: StoredClass = {
  id: 'c-1',
  name: 'Algebra I',
  period: 'Period 3',
  subject: 'Math',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const otherClass: StoredClass = {
  id: 'c-2',
  name: 'Biology',
  period: 'Period 5',
  subject: 'Science',
  createdAt: '2026-01-02T00:00:00.000Z',
};
const ada: StoredStudent = { id: 's-1', classId: 'c-1', name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' };
const grace: StoredStudent = { id: 's-2', classId: 'c-1', name: 'Grace', createdAt: '2026-01-01T00:00:01.000Z' };

const linkedNote: Note = {
  id: 'n-1',
  title: 'Quadratic formula drill',
  body: 'Needs extra practice.',
  tags: ['algebra'],
  type: 'observation',
  classId: 'c-1',
  studentIds: ['s-1'],
  createdAt: '2026-01-03T00:00:00.000Z',
  updatedAt: '2026-01-03T00:00:00.000Z',
};
const unlinkedNote: Note = {
  id: 'n-2',
  title: 'General reminder',
  body: '',
  tags: [],
  type: 'general',
  classId: null,
  studentIds: [],
  createdAt: '2026-01-04T00:00:00.000Z',
  updatedAt: '2026-01-04T00:00:00.000Z',
};

function seed(payload: { classes?: StoredClass[]; students?: StoredStudent[]; notes?: Note[] }) {
  localStorage.setItem(
    NOTES_STORAGE_KEY,
    JSON.stringify({ version: 1, notes: payload.notes ?? [], classes: payload.classes ?? [], students: payload.students ?? [] }),
  );
}

function readStorage() {
  return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? '{}') as {
    notes?: Note[];
    classes?: StoredClass[];
    students?: StoredStudent[];
  };
}

describe('classes pages', () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('lists seeded classes with student and note counts', async () => {
    seed({ classes: [storedClass, otherClass], students: [ada, grace], notes: [linkedNote] });
    const { default: ClassesPage } = await import('@/app/classes/page');
    render(<ClassesPage />);
    expect(screen.getByRole('heading', { name: 'Classes' })).toBeTruthy();
    const algebraCard = screen.getByRole('link', { name: /Algebra I/ });
    expect(algebraCard.getAttribute('href')).toBe('/classes/c-1');
    expect(screen.getByText('2 students · 1 note')).toBeTruthy();
    expect(screen.getByText('0 students · 0 notes')).toBeTruthy();
  });

  it('shows the empty state when no classes exist', async () => {
    seed({});
    const { default: ClassesPage } = await import('@/app/classes/page');
    render(<ClassesPage />);
    expect(screen.getByText('No classes yet.')).toBeTruthy();
  });

  it('creates a class through the form and persists it', async () => {
    seed({});
    const { default: ClassesPage } = await import('@/app/classes/page');
    render(<ClassesPage />);
    fireEvent.change(screen.getByLabelText('Class name'), { target: { value: 'Chemistry' } });
    fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'Period 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add class' }));

    const stored = readStorage();
    expect(stored.classes).toHaveLength(1);
    expect(stored.classes?.[0].name).toBe('Chemistry');
    expect(stored.classes?.[0].period).toBe('Period 1');
    expect(screen.getByRole('link', { name: /Chemistry/ })).toBeTruthy();
  });

  it('renders class detail with rename form, roster, and linked notes', async () => {
    seed({ classes: [storedClass], students: [ada, grace], notes: [linkedNote, unlinkedNote] });
    const { default: ClassDetailPage } = await import('@/app/classes/[id]/page');
    render(<ClassDetailPage />);
    expect(screen.getByRole('heading', { name: 'Algebra I' })).toBeTruthy();
    expect(screen.getByText('Period 3 · Math')).toBeTruthy();
    expect((screen.getByLabelText('Class name') as HTMLInputElement).value).toBe('Algebra I');
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('Grace')).toBeTruthy();
    expect(screen.getByText('Quadratic formula drill')).toBeTruthy();
    expect(screen.queryByText('General reminder')).toBeNull();
  });

  it('renames the class and updates storage', async () => {
    seed({ classes: [storedClass] });
    const { default: ClassDetailPage } = await import('@/app/classes/[id]/page');
    render(<ClassDetailPage />);
    fireEvent.change(screen.getByLabelText('Class name'), { target: { value: 'Algebra II' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(readStorage().classes?.[0].name).toBe('Algebra II');
    expect(screen.getByRole('heading', { name: 'Algebra II' })).toBeTruthy();
  });

  it('adds a student to the roster and persists it', async () => {
    seed({ classes: [storedClass] });
    const { default: ClassDetailPage } = await import('@/app/classes/[id]/page');
    render(<ClassDetailPage />);
    fireEvent.change(screen.getByLabelText('New student name'), { target: { value: 'Alan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));

    expect(readStorage().students?.map((s) => s.name)).toEqual(['Alan']);
    expect(screen.getByText('Alan')).toBeTruthy();
  });

  it('deletes a student after confirmation', async () => {
    seed({ classes: [storedClass], students: [ada, grace] });
    const { default: ClassDetailPage } = await import('@/app/classes/[id]/page');
    render(<ClassDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete student Ada' }));
    expect(window.confirm).toHaveBeenCalledWith('Delete Ada?');
    expect(readStorage().students?.map((s) => s.name)).toEqual(['Grace']);
    expect(screen.queryByText('Ada')).toBeNull();
  });

  it('deleting a class cascades unlink — notes survive, links are cleaned', async () => {
    seed({ classes: [storedClass], students: [ada, grace], notes: [linkedNote, unlinkedNote] });
    const { default: ClassDetailPage } = await import('@/app/classes/[id]/page');
    render(<ClassDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete class' }));
    expect(window.confirm).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/classes');

    const stored = readStorage();
    expect(stored.classes).toEqual([]);
    expect(stored.students).toEqual([]);
    expect(stored.notes).toHaveLength(2);
    const reloaded = stored.notes?.find((n) => n.id === 'n-1');
    expect(reloaded?.classId).toBeNull();
    expect(reloaded?.studentIds).toEqual([]);
    const other = stored.notes?.find((n) => n.id === 'n-2');
    expect(other?.classId).toBeNull();
  });

  it('shows a not-found state when the class id is unknown', async () => {
    seed({ classes: [] });
    const { default: ClassDetailPage } = await import('@/app/classes/[id]/page');
    render(<ClassDetailPage />);
    expect(screen.getByRole('heading', { name: 'Class not found' })).toBeTruthy();
  });
});
