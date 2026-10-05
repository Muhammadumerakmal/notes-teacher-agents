'use client';

import { useState, useSyncExternalStore } from 'react';
import { ClassSelect } from '@/components/notes/ClassSelect';
import { notesToCsv } from '@/lib/export/csv';
import { downloadText, notesExportFilename } from '@/lib/export/download';
import { buildExportContext, notesToMarkdown } from '@/lib/export/markdown';
import { getNotesSnapshot, getServerNotesSnapshot, subscribeNotes } from '@/lib/storage/notes';
import { getOrgSnapshot, getServerOrgSnapshot, subscribeOrg } from '@/lib/storage/org';
import type { Note } from '@/lib/storage/types';

export default function ExportPage() {
  const [classId, setClassId] = useState<string | null>(null);
  const org = useSyncExternalStore(subscribeOrg, getOrgSnapshot, getServerOrgSnapshot);
  const result = useSyncExternalStore(subscribeNotes, getNotesSnapshot, getServerNotesSnapshot);

  if (org === null || result === null) {
    return <main className="p-6 text-sm text-neutral-500">Loading export…</main>;
  }

  const ctx = buildExportContext(org.classes, org.students);
  const scope = (classId === null ? result.notes : result.notes.filter((note) => note.classId === classId))
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const empty = scope.length === 0;

  function metaLine(note: Note): string {
    const parts = [note.updatedAt.slice(0, 10), note.type];
    const cls = note.classId === null ? undefined : ctx.classNames.get(note.classId);
    if (cls !== undefined) {
      parts.push(cls.period === '' ? cls.name : `${cls.name} (${cls.period})`);
    }
    const names = note.studentIds
      .map((id) => ctx.studentNames.get(id))
      .filter((name): name is string => name !== undefined);
    if (names.length > 0) parts.push(names.join(', '));
    if (note.tags.length > 0) parts.push(note.tags.map((tag) => `#${tag}`).join(' '));
    return parts.join(' · ');
  }

  return (
    <main className="p-6">
      <header className="no-print mb-4">
        <h1 className="text-2xl font-semibold">Export</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Download notes as Markdown or CSV, or print them as a PDF.
        </p>
      </header>

      {result.loadError && (
        <p className="no-print mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Some stored data could not be read and was skipped.
        </p>
      )}

      <div className="no-print mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <div className="flex flex-wrap items-center gap-3">
          <ClassSelect
            anyLabel="All classes"
            value={classId}
            classes={org.classes}
            onChange={setClassId}
          />
          <span className="text-sm text-neutral-500">
            Exporting {scope.length} {scope.length === 1 ? 'note' : 'notes'}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={empty}
            onClick={() =>
              downloadText(
                notesExportFilename('md'),
                notesToMarkdown(scope, ctx),
                'text/markdown;charset=utf-8',
              )
            }
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Download Markdown
          </button>
          <button
            type="button"
            disabled={empty}
            onClick={() =>
              downloadText(
                notesExportFilename('csv'),
                notesToCsv(scope, ctx),
                'text/csv;charset=utf-8',
              )
            }
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Download CSV
          </button>
          <button
            type="button"
            disabled={empty}
            onClick={() => window.print()}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="print-area">
        {empty ? (
          <div className="no-print rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
            <p className="text-neutral-500">No notes to export.</p>
          </div>
        ) : (
          scope.map((note) => (
            <article key={note.id} className="mb-8">
              <h2 className="text-xl font-semibold">{note.title}</h2>
              <p className="mt-1 text-xs text-neutral-500">{metaLine(note)}</p>
              <div className="mt-2 whitespace-pre-wrap text-sm">{note.body}</div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
