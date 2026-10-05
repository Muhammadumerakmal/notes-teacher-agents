import type { ExportContext } from './markdown';
import type { Note } from '@/lib/storage/types';

const HEADER = 'id,title,type,tags,class,students,created_at,updated_at,body';
const BOM = '\uFEFF';

function escapeField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function row(fields: string[]): string {
  return fields.map(escapeField).join(',') + '\r\n';
}

export function notesToCsv(notes: Note[], ctx: ExportContext): string {
  let output = BOM + row(HEADER.split(',').map(escapeField));

  for (const note of notes) {
    const cls = note.classId === null ? undefined : ctx.classNames.get(note.classId);
    const studentNames = note.studentIds
      .map((id) => ctx.studentNames.get(id))
      .filter((name): name is string => name !== undefined);

    output += row([
      note.id,
      note.title,
      note.type,
      note.tags.join(';'),
      cls === undefined ? '' : cls.name,
      studentNames.join(';'),
      note.createdAt,
      note.updatedAt,
      note.body,
    ]);
  }

  return output;
}
