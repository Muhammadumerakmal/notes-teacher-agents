export const NOTE_TYPES = ['general', 'observation', 'behavior', 'progress', 'generated'] as const;

export type NoteType = (typeof NOTE_TYPES)[number];

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  type: NoteType;
  classId: string | null;
  studentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  id?: string;
  title: string;
  body: string;
  tags?: string[];
  type?: NoteType;
  classId?: string | null;
  studentIds?: string[];
}

export interface NoteReadResult {
  notes: Note[];
  loadError: boolean;
}
