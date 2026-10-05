import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { deleteNote, saveNote } from '@/lib/storage/notes';
import type { Note } from '@/lib/storage/types';

vi.mock('@/lib/storage/notes', () => ({
  saveNote: vi.fn((input: { title: string; body: string }) => ({
    id: 'note-mock',
    title: input.title,
    body: input.body,
    tags: [],
    type: 'general',
    classId: null,
    studentIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })),
  deleteNote: vi.fn(() => true),
}));

const existingNote: Note = {
  id: 'n-1',
  title: 'Existing',
  body: 'Old body',
  tags: ['math'],
  type: 'observation',
  classId: null,
  studentIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('NoteEditor', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(saveNote).mockClear();
    vi.mocked(deleteNote).mockClear();
  });

  it('reflects typing in the controlled title and body inputs', () => {
    render(<NoteEditor />);
    const title = screen.getByLabelText('Title');
    const body = screen.getByLabelText('Body');
    fireEvent.change(title, { target: { value: 'Parent meeting' } });
    fireEvent.change(body, { target: { value: 'Discussed algebra progress.' } });
    expect((title as HTMLInputElement).value).toBe('Parent meeting');
    expect((body as HTMLTextAreaElement).value).toBe('Discussed algebra progress.');
  });

  it('saves typed content through the repository', () => {
    render(<NoteEditor />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Parent meeting' } });
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'Body text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saveNote).toHaveBeenCalledTimes(1);
    expect(saveNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Parent meeting', body: 'Body text', type: 'general' }),
    );
  });

  it('seeds fields from an existing note and passes its id on save', () => {
    render(<NoteEditor note={existingNote} />);
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Existing');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-1', title: 'Existing' }));
  });

  it('toggles between edit and markdown preview', () => {
    render(<NoteEditor />);
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: '# Hello class' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Hello class' })).toBeTruthy();
    expect(screen.queryByLabelText('Body')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Body')).toBeTruthy();
  });

  it('adds and removes tags via TagInput', () => {
    render(<NoteEditor />);
    const addTag = screen.getByLabelText('Add tag');
    fireEvent.change(addTag, { target: { value: 'Homework' } });
    fireEvent.keyDown(addTag, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('homework')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Remove tag homework'));
    expect(screen.queryByText('homework')).toBeNull();
  });

  it('deletes an existing note only after confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDeleted = vi.fn();
    render(<NoteEditor note={existingNote} onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteNote).toHaveBeenCalledWith('n-1');
    expect(onDeleted).toHaveBeenCalledTimes(1);

    confirmSpy.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteNote).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('links a class and its students on save, and clears students when the class changes', () => {
    localStorage.setItem(
      'teacher-notes-agent:notes',
      JSON.stringify({
        version: 1,
        notes: [],
        classes: [
          { id: 'c-1', name: 'Algebra I', period: 'P1', subject: 'Math', createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'c-2', name: 'Biology', period: 'P2', subject: 'Science', createdAt: '2026-01-01T00:00:01.000Z' },
        ],
        students: [
          { id: 's-1', classId: 'c-1', name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 's-2', classId: 'c-1', name: 'Grace', createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 's-3', classId: 'c-2', name: 'Alan', createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
    );

    render(<NoteEditor />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Linked note' } });

    const classSelect = screen.getByLabelText('Class');
    fireEvent.change(classSelect, { target: { value: 'c-1' } });

    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.queryByText('Alan')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saveNote).toHaveBeenLastCalledWith(
      expect.objectContaining({ classId: 'c-1', studentIds: ['s-1'] }),
    );

    fireEvent.change(classSelect, { target: { value: 'c-2' } });
    expect(screen.getByText('Alan')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ada' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saveNote).toHaveBeenLastCalledWith(
      expect.objectContaining({ classId: 'c-2', studentIds: [] }),
    );
  });
});
