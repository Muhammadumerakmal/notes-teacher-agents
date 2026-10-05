import { describe, expect, it } from 'vitest';
import {
  AGENT_IDS,
  createEventDecoder,
  encodeEvent,
  runRequestSchema,
} from '@/lib/agents/protocol';

const validNote = {
  id: 'n-1',
  title: 'T',
  body: '',
  tags: [],
  type: 'general',
  classId: null,
  studentIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const validRequest = {
  message: 'Summarize Ada',
  snapshot: { notes: [validNote], classes: [], students: [] },
};

describe('runRequestSchema', () => {
  it('accepts a minimal request and applies defaults', () => {
    const parsed = runRequestSchema.parse(validRequest);
    expect(parsed.agent).toBe('triage');
    expect(parsed.history).toEqual([]);
    expect(parsed.snapshot.notes).toHaveLength(1);
  });

  it('accepts a full request with history and agent', () => {
    const parsed = runRequestSchema.parse({
      ...validRequest,
      agent: 'parent-comms',
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ],
    });
    expect(parsed.agent).toBe('parent-comms');
    expect(parsed.history).toHaveLength(2);
  });

  it('rejects empty or overlong messages', () => {
    expect(runRequestSchema.safeParse({ ...validRequest, message: '   ' }).success).toBe(false);
    expect(runRequestSchema.safeParse({ ...validRequest, message: 'x'.repeat(4001) }).success).toBe(
      false,
    );
  });

  it('rejects unknown agent ids and roles', () => {
    expect(runRequestSchema.safeParse({ ...validRequest, agent: 'ghost' }).success).toBe(false);
    expect(
      runRequestSchema.safeParse({
        ...validRequest,
        history: [{ role: 'system', content: 'x' }],
      }).success,
    ).toBe(false);
    expect(AGENT_IDS).toEqual([
      'triage',
      'summarizer',
      'progress',
      'behavior',
      'parent-comms',
      'planner',
    ]);
  });

  it('enforces snapshot caps', () => {
    expect(
      runRequestSchema.safeParse({
        ...validRequest,
        snapshot: { notes: [], classes: [], students: Array(5001).fill({ id: 's', classId: 'c', name: 'N', createdAt: '2026-01-01T00:00:00.000Z' }) },
      }).success,
    ).toBe(false);
  });

  it('deep-validates snapshot entries', () => {
    expect(
      runRequestSchema.safeParse({
        ...validRequest,
        snapshot: { ...validRequest.snapshot, notes: [{ ...validNote, type: 'bogus' }] },
      }).success,
    ).toBe(false);
  });
});

describe('encodeEvent / createEventDecoder', () => {
  const events = [
    { type: 'agent', agent: 'progress' },
    { type: 'delta', text: 'Hello 👋 world' },
    { type: 'delta', text: ' — next chunk' },
    { type: 'done' },
    { type: 'error', message: 'boom' },
  ] as const;

  it('frames events as data: <json>\\n\\n', () => {
    expect(encodeEvent({ type: 'done' })).toBe('data: {"type":"done"}\n\n');
  });

  it('round-trips when the stream arrives whole', () => {
    const decoder = createEventDecoder();
    const output = decoder.push(events.map(encodeEvent).join(''));
    expect(output).toEqual(events);
  });

  it('round-trips no matter where the stream is split', () => {
    const wire = events.map(encodeEvent).join('');
    for (let cut = 1; cut < wire.length; cut += 7) {
      const decoder = createEventDecoder();
      const got = [...decoder.push(wire.slice(0, cut)), ...decoder.push(wire.slice(cut))];
      expect(got).toEqual(events);
    }
  });

  it('round-trips character-by-character chunks', () => {
    const wire = events.map(encodeEvent).join('');
    const decoder = createEventDecoder();
    const got: ReturnType<typeof decoder.push> = [];
    for (const char of wire) got.push(...decoder.push(char));
    expect(got).toEqual(events);
  });

  it('skips comment lines and malformed payloads without throwing', () => {
    const decoder = createEventDecoder();
    const wire =
      ': keep-alive\n\n' +
      'data: {"type":"delta","text":"ok"}\n\n' +
      'data: {broken json\n\n' +
      'event: ping\n\n' +
      'data: {"type":"done"}\n\n';
    expect(decoder.push(wire)).toEqual([
      { type: 'delta', text: 'ok' },
      { type: 'done' },
    ]);
  });

  it('flush parses a final unterminated frame and clears the buffer', () => {
    const decoder = createEventDecoder();
    expect(decoder.push('data: {"type":"done"}\n')).toEqual([]);
    expect(decoder.flush()).toEqual([{ type: 'done' }]);
    expect(decoder.flush()).toEqual([]);
  });
});
