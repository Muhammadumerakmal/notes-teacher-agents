import {
  emitApp,
  getAppSnapshot,
  getServerAppSnapshot,
  readEnvelope,
  subscribeApp,
  writeEnvelope,
} from './envelope';
import type { AppSnapshot } from './envelope';
import { classInputSchema, classSchema, studentInputSchema, studentSchema } from './schema';
import type { Class, ClassInput, Student, StudentInput } from './schema';

export type { Class, ClassInput, Student, StudentInput } from './schema';

export interface OrgSnapshot {
  classes: Class[];
  students: Student[];
  loadError: boolean;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listClasses(): Class[] {
  return readEnvelope()
    .classes.slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getClass(id: string): Class | undefined {
  return readEnvelope().classes.find((cls) => cls.id === id);
}

export function saveClass(input: ClassInput): Class {
  const parsed = classInputSchema.parse({ ...input, name: input.name.trim() });
  const existing = parsed.id !== undefined ? getClass(parsed.id) : undefined;

  const cls = classSchema.parse({
    id: existing?.id ?? parsed.id ?? newId(),
    name: parsed.name,
    period: parsed.period ?? existing?.period ?? '',
    subject: parsed.subject ?? existing?.subject ?? '',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });

  const { notes, classes, students } = readEnvelope();
  writeEnvelope({
    notes,
    classes: [...classes.filter((c) => c.id !== cls.id), cls],
    students,
  });
  emitApp();
  return cls;
}

export function deleteClass(id: string): boolean {
  const { notes, classes, students } = readEnvelope();
  if (!classes.some((cls) => cls.id === id)) return false;

  const removedStudentIds = new Set(
    students.filter((student) => student.classId === id).map((student) => student.id),
  );

  writeEnvelope({
    notes: notes.map((note) => ({
      ...note,
      classId: note.classId === id ? null : note.classId,
      studentIds: note.studentIds.filter((sid) => !removedStudentIds.has(sid)),
    })),
    classes: classes.filter((cls) => cls.id !== id),
    students: students.filter((student) => student.classId !== id),
  });
  emitApp();
  return true;
}

export function listStudents(classId: string): Student[] {
  return readEnvelope()
    .students.filter((student) => student.classId === classId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getStudent(id: string): Student | undefined {
  return readEnvelope().students.find((student) => student.id === id);
}

export function saveStudent(input: StudentInput): Student {
  const parsed = studentInputSchema.parse({ ...input, name: input.name.trim() });
  const existing = parsed.id !== undefined ? getStudent(parsed.id) : undefined;

  const student = studentSchema.parse({
    id: existing?.id ?? parsed.id ?? newId(),
    classId: parsed.classId,
    name: parsed.name,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });

  const { notes, classes, students } = readEnvelope();
  writeEnvelope({
    notes,
    classes,
    students: [...students.filter((s) => s.id !== student.id), student],
  });
  emitApp();
  return student;
}

export function deleteStudent(id: string): boolean {
  const { notes, classes, students } = readEnvelope();
  if (!students.some((student) => student.id === id)) return false;

  writeEnvelope({
    notes: notes.map((note) => ({
      ...note,
      studentIds: note.studentIds.filter((sid) => sid !== id),
    })),
    classes,
    students: students.filter((student) => student.id !== id),
  });
  emitApp();
  return true;
}

let lastApp: AppSnapshot | null = null;
let orgView: OrgSnapshot = { classes: [], students: [], loadError: false };

export function getOrgSnapshot(): OrgSnapshot {
  const app = getAppSnapshot();
  if (app !== lastApp) {
    lastApp = app;
    orgView = { classes: app.classes, students: app.students, loadError: app.loadError };
  }
  return orgView;
}

export function getServerOrgSnapshot(): OrgSnapshot | null {
  return getServerAppSnapshot();
}

export function subscribeOrg(listener: () => void): () => void {
  return subscribeApp(listener);
}
