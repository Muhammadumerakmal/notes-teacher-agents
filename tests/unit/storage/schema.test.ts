import { describe, expect, it } from 'vitest';
import {
  classInputSchema,
  classSchema,
  envelopeSchema,
  noteInputSchema,
  noteSchema,
  studentInputSchema,
  studentSchema,
} from '@/lib/storage/schema';

const validNote = {
  id: 'n-1',
  title: 'Observation',
  body: 'Body text',
  tags: ['math'],
  type: 'observation',
  classId: null,
  studentIds: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

describe('noteSchema', () => {
  it('accepts a valid note', () => {
    expect(noteSchema.parse(validNote)).toEqual(validNote);
  });

  it('rejects an invalid type enum', () => {
    expect(() => noteSchema.parse({ ...validNote, type: 'bogus' })).toThrow();
  });

  it('rejects a missing id', () => {
    const noId: Record<string, unknown> = { ...validNote };
    delete noId.id;
    expect(() => noteSchema.parse(noId)).toThrow();
  });
});

describe('noteInputSchema', () => {
  it('accepts minimal input (title + body)', () => {
    expect(noteInputSchema.parse({ title: 't', body: '' })).toEqual({ title: 't', body: '' });
  });

  it('accepts full input with reserved org fields', () => {
    const input = {
      id: 'n-1',
      title: 't',
      body: 'b',
      tags: ['math'],
      type: 'progress' as const,
      classId: 'c-1',
      studentIds: ['s-1'],
    };
    expect(noteInputSchema.parse(input)).toEqual(input);
  });

  it('rejects missing body', () => {
    expect(() => noteInputSchema.parse({ title: 't' })).toThrow();
  });
});

describe('classSchema / studentSchema', () => {
  const validClass = {
    id: 'c-1',
    name: 'Algebra I',
    period: 'Period 3',
    subject: 'Math',
    createdAt: '2026-01-01T10:00:00.000Z',
  };
  const validStudent = {
    id: 's-1',
    classId: 'c-1',
    name: 'Ada L.',
    createdAt: '2026-01-01T10:00:00.000Z',
  };

  it('accepts valid class and student entries', () => {
    expect(classSchema.parse(validClass)).toEqual(validClass);
    expect(studentSchema.parse(validStudent)).toEqual(validStudent);
  });

  it('rejects empty names and missing classId', () => {
    expect(() => classSchema.parse({ ...validClass, name: '' })).toThrow();
    expect(() => studentSchema.parse({ ...validStudent, name: '' })).toThrow();
    const { classId: _omit, ...noClass } = validStudent;
    void _omit;
    expect(() => studentSchema.parse(noClass)).toThrow();
  });

  it('accepts minimal inputs', () => {
    expect(classInputSchema.parse({ name: 'Chemistry' })).toEqual({ name: 'Chemistry' });
    expect(studentInputSchema.parse({ classId: 'c-1', name: 'Ada' })).toEqual({
      classId: 'c-1',
      name: 'Ada',
    });
    expect(() => classInputSchema.parse({ name: '' })).toThrow();
  });
});

describe('envelopeSchema', () => {
  it('accepts a version-1 envelope with notes', () => {
    const env = { version: 1, notes: [validNote] };
    expect(envelopeSchema.parse(env)).toEqual(env);
  });

  it('rejects a version-2 envelope', () => {
    expect(() => envelopeSchema.parse({ version: 2, notes: [] })).toThrow();
  });

  it('rejects a payload without a notes array', () => {
    expect(() => envelopeSchema.parse({ version: 1 })).toThrow();
  });
});
