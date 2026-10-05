import { z } from 'zod';
import { classSchema, noteSchema, studentSchema } from '../storage/schema';

export const AGENT_IDS = [
  'triage',
  'summarizer',
  'progress',
  'behavior',
  'parent-comms',
  'planner',
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export const runRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  agent: z.enum(AGENT_IDS).default('triage'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .max(40)
    .default([]),
  snapshot: z.object({
    notes: z.array(noteSchema).max(2000),
    classes: z.array(classSchema).max(500),
    students: z.array(studentSchema).max(5000),
  }),
});

export type RunRequest = z.infer<typeof runRequestSchema>;

export type RunEvent =
  | { type: 'agent'; agent: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function encodeEvent(event: RunEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export interface EventDecoder {
  push(chunk: string): RunEvent[];
  flush(): RunEvent[];
}

function parseFrame(frame: string): RunEvent | null {
  if (!frame.startsWith('data: ')) return null;
  try {
    const parsed: unknown = JSON.parse(frame.slice(6));
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'type' in parsed &&
      typeof (parsed as { type: unknown }).type === 'string'
    ) {
      return parsed as RunEvent;
    }
    return null;
  } catch {
    return null;
  }
}

export function createEventDecoder(): EventDecoder {
  let buffer = '';

  return {
    push(chunk: string): RunEvent[] {
      buffer += chunk;
      const events: RunEvent[] = [];
      let index = buffer.indexOf('\n\n');
      while (index !== -1) {
        const event = parseFrame(buffer.slice(0, index));
        buffer = buffer.slice(index + 2);
        if (event !== null) events.push(event);
        index = buffer.indexOf('\n\n');
      }
      return events;
    },
    flush(): RunEvent[] {
      const rest = buffer;
      buffer = '';
      if (rest === '') return [];
      const event = parseFrame(rest);
      return event === null ? [] : [event];
    },
  };
}
