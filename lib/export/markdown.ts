import type { Class, Student } from '@/lib/storage/org';
import type { Note } from '@/lib/storage/types';

export interface ExportContext {
  classNames: Map<string, { name: string; period: string }>;
  studentNames: Map<string, string>;
}

export function buildExportContext(classes: Class[], students: Student[]): ExportContext {
  const classNames = new Map<string, { name: string; period: string }>();
  for (const cls of classes) classNames.set(cls.id, { name: cls.name, period: cls.period });

  const studentNames = new Map<string, string>();
  for (const student of students) studentNames.set(student.id, student.name);

  return { classNames, studentNames };
}

function metaLines(note: Note, ctx: ExportContext): string[] {
  const lines = [
    `- Date: ${note.updatedAt.slice(0, 10)}`,
    `- Type: ${note.type}`,
  ];

  const cls = note.classId === null ? undefined : ctx.classNames.get(note.classId);
  if (cls !== undefined) {
    lines.push(`- Class: ${cls.period === '' ? cls.name : `${cls.name} (${cls.period})`}`);
  }

  const studentNames = note.studentIds
    .map((id) => ctx.studentNames.get(id))
    .filter((name): name is string => name !== undefined);
  if (studentNames.length > 0) lines.push(`- Students: ${studentNames.join(', ')}`);

  if (note.tags.length > 0) lines.push(`- Tags: ${note.tags.join(', ')}`);

  return lines;
}

export function notesToMarkdown(notes: Note[], ctx: ExportContext): string {
  const blocks = notes.map((note) =>
    [`# ${note.title}`, '', ...metaLines(note, ctx), '', note.body, ''].join('\n'),
  );
  return blocks.join('\n---\n\n');
}
