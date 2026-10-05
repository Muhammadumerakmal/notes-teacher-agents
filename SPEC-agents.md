# Spec: agents

Module id: `agents` (see `CAPABILITY-MAP.md`). Depends on: `notes`, `org`. Gemini-powered chat assistant: five specialists + a triage router, tools over the local note snapshot, one streaming API route, `/assistant` UI with Save-as-note.

## Objective

A teacher asks the in-app assistant things like "summarize what's happening with Ada lately" and gets an answer grounded in their notes — streamed live, attributed to the specialist that answered, and savable back into the notes store as a new note.

**User stories**
- As a teacher, I type a question and watch the answer stream in; I see which specialist answered.
- As a teacher, I can bypass the router and address a specialist directly (e.g. "Parent comms").
- As a teacher, I save a useful reply as a note and land on it, ready to edit.

## Tech Stack

- **New dependencies (approved via this spec's gate):** `@openai/agents`, `@openai/agents-extensions`, `@ai-sdk/google`, `zod` (plus whatever peer deps those packages declare — finalized at install)
- Gemini via `aisdk(google(...))` from `@openai/agents-extensions/aisdk`; `GEMINI_API_KEY` in `.env.local` (**server-only**, never `NEXT_PUBLIC_`); `setTracingDisabled(true)`
- Model: `gemini-2.5-flash` (override with optional `GEMINI_MODEL` env)
- Server route streams SSE as a `ReadableStream`; client consumes with `fetch` + `TextReader`
- Agents are **stateless per request**: the client sends its notes/classes/students snapshot with each call; tools filter that payload in memory (no server storage, no DB)

## Agents & Handoffs

| Agent id | Role |
|---|---|
| `triage` | Default router. Classifies the request and **hands off** to exactly one specialist |
| `summarizer` | Condense notes into overviews (student, class, date range, free text) |
| `progress` | Learning-progress insights from `progress`/`observation` notes |
| `behavior` | Behavior patterns + calm, actionable next steps |
| `parent-comms` | Draft parent-facing messages (email/SMS tone) grounded in notes |
| `planner` | Follow-ups, next lessons, and to-do extraction from notes |

- Each specialist has a short system prompt (its role + "answer only from tool results; say when notes don't cover it") and the tool set below. Specialists do **not** re-handoff; one hop: triage → specialist.
- The UI defaults to `triage`; the user may select a specialist directly (request then skips triage).

## Tools (function calling, over the request snapshot)

```ts
search_notes({ query })      // reuses lib/search/query.ts searchNotes (empty criteria allowed)
list_classes()               // [{ id, name, period, subject }]
list_students({ classId })   // roster of one class (all students if classId omitted)
get_note({ id })             // full note by id
```

- Tools are pure functions over the request payload, unit-testable without any model.
- The conversation history (user + assistant messages from the current session) is passed as input items so multi-turn questions work.

## Streaming Contract — `POST /api/agents/run`

Request (zod-validated):

```json
{
  "message": "string (1..4000 chars)",
  "agent": "triage" | "summarizer" | "progress" | "behavior" | "parent-comms" | "planner",
  "history": [{ "role": "user" | "assistant", "content": "string (≤4000)" }],
  "snapshot": { "notes": [Note], "classes": [Class], "students": [Student] }
}
```

Response: `Content-Type: text/event-stream`; events as `data: <json>\n\n`:

```json
{ "type": "agent", "agent": "progress" }   // first event: who is answering (after handoff for triage)
{ "type": "delta", "text": "chunk…" }      // repeated
{ "type": "done" }
{ "type": "error", "message": "…" }        // streamable error (missing key, model failure); HTTP status set when caught before streaming
```

- Missing `GEMINI_API_KEY` → `500` + `{"error": …}` (or an `error` event if headers already sent).
- Invalid body → `400` with zod message. Snapshot arrays capped by zod (`max`) to sane limits (notes ≤2000, classes ≤500, students ≤5000).
- No API key, model text, or env value is ever sent to the client except error messages safe to show.

## UI — `/assistant`

| Element | Behavior |
|---|---|
| Message list | User bubbles right, assistant bubbles left; assistant text streams in token-by-token; badge shows which specialist answered (`via triage` when routed) |
| Composer | Textarea + Send (Enter submits, Shift+Enter newline); disabled while streaming |
| Specialist picker | `Auto (triage)` default + the five specialists |
| Save-as-note | On any completed assistant message: saves `{ title, body, type: 'generated', tags: ['ai'] }` (title = first non-empty line, truncated 80 chars; body = full reply markdown) via the existing notes repo, then navigates to `/notes/[id]` |
| States | Empty conversation prompt; streaming state ("…"); `error` event rendered as a red inline message; missing-key hint when server reports it |

Chat history is **session-only** (component state; cleared on refresh). Loading-state: pages follow the established snapshot pattern where needed (assistant itself needs no snapshot read for display, but sends the current snapshot with each request).

## Commands

Same as `SPEC-notes.md`, plus:
- `npm install` for the four new packages
- `.env.local` with `GEMINI_API_KEY=…` (not committed; `.gitignore` already covers it — verify)

## Project Structure

```
lib/agents/agents.ts        → agent factory: triage + 5 specialists, system prompts, handoffs, model binding
lib/agents/tools.ts         → snapshot tool implementations (pure; uses lib/search)
lib/agents/protocol.ts      → zod schemas + SSE event types + event encoders (shared client/server)
app/api/agents/run/route.ts → POST handler: validate → run → stream SSE
app/assistant/page.tsx      → /assistant chat UI (replaces placeholder)
components/assistant/…       → ChatMessage, ChatComposer (extract if the page needs it)
tests/unit/agents/{agents,tools,protocol}.test.ts
tests/unit/api/run-route.test.ts        (Runner + env mocked; no network)
tests/integration/assistant-page.test.tsx  (fetch mocked; Save-as-note hits real notes repo)
```

## Testing Strategy

- **No network anywhere in the suite:** `Runner.run` (or the SDK entry used) is `vi.mock`ed; tools/protocol/agents factory are pure/structural (assert agent ids, tool names, handoff targets, system-prompt presence)
- **Route:** valid body → status 200 + SSE content-type + parsed events; invalid body → 400; missing key → 500 error shape; mocked run emits deltas → forwarded
- **Integration:** send message → mocked fetch stream → bubbles render progressively; agent badge appears; error event renders; Save-as-note writes to localStorage via real repo and routes to the note
- **Regression:** all existing suites unmodified; coverage ≥90% lines on `lib/agents/`

## Boundaries

- **Always:** API key server-side only; snapshot-based stateless calls; zod at the route edge; reuse `notes` repo for Save-as-note; run lint/test/build before done
- **Ask first:** persisting conversations, tool writes (creating notes from tools), multi-agent parallel runs, real network tests, changing the SSE contract, `GEMINI_MODEL` default changes
- **Never:** call the network in tests; ship `GEMINI_API_KEY` to the client; bypass zod validation; edit existing suites

## Success Criteria

1. Factory builds `triage` + 5 specialists with correct ids, shared tools, and triage handoffs to each; structural tests pass offline.
2. `/api/agents/run` validates input, streams SSE (`agent` → `delta`* → `done`), surfaces missing-key and model errors safely; 400 on invalid body.
3. `/assistant` streams replies with specialist badge, picker works, Save-as-note creates a `generated` note and navigates to it.
4. Test suite contains zero network calls; `lib/agents` coverage ≥90%; `npm run lint`, `npm run test`, `npm run build` green; existing suites unmodified.

## Open Questions

- Persisting conversations across refresh (localStorage chat log) — deferred.
- Streaming citation/footnotes (which notes informed the answer) — deferred.
- Rate limiting / request timeouts — revisit if the model hangs are noticed.
- Allowing tools to write (create draft notes directly) — ask-first per Boundaries.
