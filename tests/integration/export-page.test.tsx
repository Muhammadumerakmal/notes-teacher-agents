import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadText } from '@/lib/export/download';
import { NOTES_STORAGE_KEY } from '@/lib/storage/notes';
import type { Note } from '@/lib/storage/types';

vi.mock('@/lib/export/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/export/download')>();
  return { ...actual, downloadText: vi.fn() };
});

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

const early = note({
  id: 'n-early',
  title: 'Fractions recap',
  body: 'Covered equivalent fractions.',
  type: 'observation',
  classId: 'c-1',
  studentIds: ['s-1'],
  tags: ['math'],
  updatedAt: '2026-03-10T09:00:00.000Z',
});
const later = note({
  id: 'n-later',
  title: 'Parent call',
  body: 'Discussed progress.',
  classId: 'c-1',
  updatedAt: '2026-03-15T09:00:00.000Z',
});
const other = note({
  id: 'n-other',
  title: 'Lab safety',
  body: 'Goggles rules.',
  classId: 'c-2',
  updatedAt: '2026-04-01T09:00:00.000Z',
});

function seed() {
  localStorage.setItem(
    NOTES_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      notes: [early, later, other],
      classes: [
        { id: 'c-1', name: 'Algebra I', period: 'P1', subject: 'Math', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'c-2', name: 'Biology', period: 'P2', subject: 'Science', createdAt: '2026-01-02T00:00:00.000Z' },
        { id: 'c-empty', name: 'History', period: '', subject: '', createdAt: '2026-01-03T00:00:00.000Z' },
      ],
      students: [
        { id: 's-1', classId: 'c-1', name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    }),
  );
}

async function renderExport() {
  const { default: ExportPage } = await import('@/app/export/page');
  render(<ExportPage />);
}

describe('export page', () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    vi.mocked(downloadText).mockClear();
    vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  it('shows all notes with counts and a newest-first preview', async () => {
    await renderExport();
    expect(screen.getByText('Exporting 3 notes')).toBeTruthy();
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(['Lab safety', 'Parent call', 'Fractions recap']);
    expect(screen.getByText(/2026-03-10 · observation · Algebra I \(P1\) · Ada · #math/)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Download Markdown' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('narrows scope to one class', async () => {
    await renderExport();
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'c-1' } });
    expect(screen.getByText('Exporting 2 notes')).toBeTruthy();
    expect(screen.queryByText('Lab safety')).toBeNull();
    expect(screen.getByText('Fractions recap')).toBeTruthy();
  });

  it('downloads Markdown for the current scope with a dated filename', async () => {
    await renderExport();
    fireEvent.click(screen.getByRole('button', { name: 'Download Markdown' }));

    expect(downloadText).toHaveBeenCalledTimes(1);
    const [filename, content, mime] = vi.mocked(downloadText).mock.calls[0];
    expect(filename).toMatch(/^teacher-notes-\d{4}-\d{2}-\d{2}\.md$/);
    expect(content).toContain('# Fractions recap');
    expect(content).toContain('- Class: Algebra I (P1)');
    expect(content).toContain('- Students: Ada');
    expect(mime).toBe('text/markdown;charset=utf-8');
  });

  it('downloads CSV with BOM and header', async () => {
    await renderExport();
    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));

    const [filename, content, mime] = vi.mocked(downloadText).mock.calls[0];
    expect(filename).toMatch(/^teacher-notes-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(content.startsWith('\uFEFF')).toBe(true);
    expect(content).toContain('id,title,type,tags,class,students,created_at,updated_at,body');
    expect(content).toContain('Fractions recap');
    expect(mime).toBe('text/csv;charset=utf-8');
  });

  it('calls window.print for the print/PDF action', async () => {
    await renderExport();
    fireEvent.click(screen.getByRole('button', { name: 'Print / Save as PDF' }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('disables downloads and shows an empty state for a scope with no notes', async () => {
    await renderExport();
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'c-empty' } });

    expect(screen.getByText('Exporting 0 notes')).toBeTruthy();
    expect(screen.getByText('No notes to export.')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Download Markdown' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Download CSV' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Print / Save as PDF' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(downloadText).not.toHaveBeenCalled();
  });

  it('defines the print stylesheet rules', () => {
    const css = readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');
    expect(css).toContain('@media print');
    expect(css).toContain('.no-print');
    expect(css).toContain('break-before: page');
  });
});
