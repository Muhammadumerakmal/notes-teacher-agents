import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadText, notesExportFilename } from '@/lib/export/download';

describe('notesExportFilename', () => {
  it('uses local date parts, zero-padded', () => {
    expect(notesExportFilename('md', new Date(2026, 9, 5))).toBe('teacher-notes-2026-10-05.md');
    expect(notesExportFilename('csv', new Date(2026, 0, 3))).toBe('teacher-notes-2026-01-03.csv');
  });
});

describe('downloadText', () => {
  let createdUrl: string;
  let blobArg: Blob | null;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createdUrl = 'blob:mock-url';
    blobArg = null;
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn((blob: Blob) => {
        blobArg = blob;
        return createdUrl;
      }),
      revokeObjectURL: vi.fn(),
    }));
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clickSpy.mockRestore();
  });

  it('creates a blob URL, clicks a temporary download anchor, then revokes it', async () => {
    downloadText('teacher-notes-2026-10-05.md', '# Hello', 'text/markdown;charset=utf-8');

    expect(vi.mocked(URL.createObjectURL)).toHaveBeenCalledTimes(1);
    expect(blobArg).toBeInstanceOf(Blob);
    expect(await blobArg!.text()).toBe('# Hello');
    expect(vi.mocked(URL.revokeObjectURL)).toHaveBeenCalledWith(createdUrl);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('sets the download attribute to the requested filename', () => {
    let anchor: HTMLAnchorElement | null = null;
    clickSpy.mockImplementation(() => {
      anchor = document.querySelector('a[download]');
    });

    downloadText('notes.csv', 'a,b', 'text/csv;charset=utf-8');

    expect(anchor).not.toBeNull();
    expect((anchor as HTMLAnchorElement).download).toBe('notes.csv');
    expect((anchor as HTMLAnchorElement).href).toBe(createdUrl);
  });
});
