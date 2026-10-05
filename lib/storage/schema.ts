import { z } from 'zod';
import { NOTE_TYPES } from './types';

export const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  type: z.enum(NOTE_TYPES),
  classId: z.string().nullable(),
  studentIds: z.array(z.string()),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const noteInputSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()).optional(),
  type: z.enum(NOTE_TYPES).optional(),
  classId: z.string().nullish(),
  studentIds: z.array(z.string()).optional(),
});

export const classSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  period: z.string(),
  subject: z.string(),
  createdAt: z.string().min(1),
});

export const classInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  period: z.string().optional(),
  subject: z.string().optional(),
});

export const studentSchema = z.object({
  id: z.string().min(1),
  classId: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().min(1),
});

export const studentInputSchema = z.object({
  id: z.string().min(1).optional(),
  classId: z.string().min(1),
  name: z.string().min(1),
});

export type Class = z.infer<typeof classSchema>;
export type ClassInput = z.infer<typeof classInputSchema>;
export type Student = z.infer<typeof studentSchema>;
export type StudentInput = z.infer<typeof studentInputSchema>;

export const envelopeSchema = z.object({
  version: z.literal(1),
  notes: z.array(z.unknown()),
  classes: z.array(z.unknown()).optional(),
  students: z.array(z.unknown()).optional(),
});
