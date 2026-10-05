import type { Note, NoteType } from '@/lib/storage/types';

export interface SearchCriteria {
  query: string;
  classId: string | null;
  studentIds: string[];
  tag: string | null;
  types: NoteType[];
  dateFrom: string | null;
  dateTo: string | null;
}

export function searchNotes(notes: Note[], criteria: SearchCriteria): Note[] {
  const terms = criteria.query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term !== '');
  const studentSet =
    criteria.studentIds.length > 0 ? new Set(criteria.studentIds) : null;
  const typeSet = criteria.types.length > 0 ? new Set<NoteType>(criteria.types) : null;
  const tag = criteria.tag === null ? null : criteria.tag.toLowerCase();

  return notes.filter((note) => {
    if (criteria.classId !== null && note.classId !== criteria.classId) return false;
    if (studentSet !== null && !note.studentIds.some((id) => studentSet.has(id))) return false;
    if (tag !== null && !note.tags.some((noteTag) => noteTag.toLowerCase() === tag)) return false;
    if (typeSet !== null && !typeSet.has(note.type)) return false;

    const day = note.updatedAt.slice(0, 10);
    if (criteria.dateFrom !== null && day < criteria.dateFrom) return false;
    if (criteria.dateTo !== null && day > criteria.dateTo) return false;

    if (terms.length > 0) {
      const haystack = `${note.title} ${note.body} ${note.tags.join(' ')}`.toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return false;
    }

    return true;
  });
}

export function allTags(notes: Note[]): string[] {
  const seen = new Map<string, string>();
  for (const current of notes) {
    for (const tagValue of current.tags) {
      const key = tagValue.toLowerCase();
      if (!seen.has(key)) seen.set(key, tagValue);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
