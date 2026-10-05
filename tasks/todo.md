# Tasks: agents

Module: `agents` · Spec: `SPEC-agents.md` · Plan: `tasks/plan.md`
Ordered by dependency. Each task: acceptance + verify + files.
Gates: `SPEC-notes.md`, `SPEC-org.md`, `SPEC-search.md`, `SPEC-export.md`.

- [x] Task 0: Dependencies + framework docs
  - Acceptance: `npm install @openai/agents @openai/agents-extensions @ai-sdk/google zod` exit 0; peer/zod conflicts checked (`npm ls zod`) — any forced version change reported, not silently absorbed; Next.js route-handler docs read in `node_modules/next/dist/docs/` (per AGENTS.md) and any divergence from this plan noted below; installed SDK docs/types checked for `Runner`/`aisdk`/handoff entry points and noted below
  - Verify: install clean; notes recorded in this file; full test suite still green
  - Files: package.json, package-lock.json; notes appended below

### Task 0 notes (2026-10-05)

- Installed: `@openai/agents@0.18.0`, `@openai/agents-extensions@0.18.0`, `@ai-sdk/google@4.0.87`, `zod@4.6.5` — **one deduped zod 4.6.5 across the whole tree**, no peer conflicts.
- Next 16 route handlers (read `15-route-handlers.md`): unchanged Web API convention — `export async function POST(request: Request)` in `app/**/route.ts`; POST responses are never cached; no `RouteContext` needed (our path is static). Nothing differs from the plan.
- SDK entry points (read installed types): `Agent`, `handoff`, `run`, `setTracingDisabled` from `@openai/agents`; model binding via `aisdk` from **`@openai/agents-extensions/ai-sdk`** (import path is `/ai-sdk`, not `/aisdk`); `google` from `@ai-sdk/google`.
- Streaming: `run(agent, input, { stream: true })` → `StreamedRunResult` (`AsyncIterable<RunStreamEvent>`). Text deltas: `event.type === 'raw_model_stream_event'` + `event.data.type === 'output_text_delta'` → `event.data.delta`. Answering agent: `event.type === 'agent_updated_stream_event'` → `event.agent.name`.
- zod is v4 — schema code must use zod 4 idioms.

- [ ] Task 1: Protocol (TDD: tests first)
  - Acceptance: `lib/agents/protocol.ts` — zod `runRequestSchema` (message 1..4000, agent enum incl. `triage`, history items ≤4000, snapshot caps notes ≤2000 / classes ≤500 / students ≤5000), SSE event union (`agent`/`delta`/`done`/`error`), `encodeEvent()` server-side (`data: <json>\n\n`), `createEventDecoder()` client-side buffering partial/multi-event chunks incl. multi-byte text; round-trip tests written first
  - Verify: `npm run test` green; coverage include gains `lib/agents/**`; ≥90% on `lib/agents` already
  - Files: lib/agents/protocol.ts, tests/unit/agents/protocol.test.ts, vitest.config.mts

- [ ] Task 2: Snapshot tools (TDD: tests first)
  - Acceptance: `lib/agents/tools.ts` — pure `search_notes` (delegates `searchNotes` from `lib/search`), `list_classes`, `list_students` (optional classId), `get_note`; JSON-serializable results; tool descriptors (name/description/zod input shape) exported for the factory; unit tests cover each tool + empty results + unknown id
  - Verify: `npm run test` green (offline)
  - Files: lib/agents/tools.ts, tests/unit/agents/tools.test.ts

- [ ] Task 3: Agents factory (structural, offline)
  - Acceptance: `lib/agents/agents.ts` — `buildAgents()` returns `{ triage, specialists: {summarizer, progress, behavior, parent-comms, planner}, all }`; each has its system prompt (role + tools-only grounding rule), shared tool set, triage handoffs targeting all five specialists; model = `aisdk(google(...))` with `GEMINI_MODEL` override defaulting to `gemini-2.5-flash`; `setTracingDisabled(true)`; no model/network call at build time; structural tests assert ids/prompts/handoffs/tools (SDK entry points as discovered in task 0)
  - Verify: tests green with no network; `npm run build` passes (bundle check)
  - Files: lib/agents/agents.ts, tests/unit/agents/agents.test.ts

- [ ] Task 4: Streaming route
  - Acceptance: `app/api/agents/run/route.ts` POST — zod-validate via protocol (400 + message on failure), missing `GEMINI_API_KEY` → 500 with safe error, otherwise run (Runner mocked in tests) and stream SSE `agent` → `delta`* → `done`; runtime model errors mid-stream emit `error` event; API key never echoed
  - Verify: route tests green offline (direct `POST(new Request(...))` invocation); existing suites unmodified
  - Files: app/api/agents/run/route.ts, tests/unit/api/run-route.test.ts

- [ ] Task 5: /assistant UI + integration tests
  - Acceptance: `/assistant` — chat list with streaming assistant bubbles + specialist badge (`via triage` when routed), composer (Enter send / Shift+Enter newline, disabled while streaming), specialist picker (Auto + five), error-event rendering, missing-key hint, session-only history sent with each request (current snapshot attached), Save-as-note on completed replies (first line ≤80 chars as title, `type: 'generated'`, `tags: ['ai']`) → navigates to `/notes/[id]`; components extracted only if the page needs it
  - Verify: integration tests green (fetch mocked with ReadableStream SSE, router push mocked); `npm run dev` smoke `/assistant` 200; `npm run build` passes
  - Files: app/assistant/page.tsx, components/assistant/* (as needed), tests/integration/assistant-page.test.tsx

- [ ] Task 6: Module gate
  - Acceptance: `npm run lint`, `npm run test`, `npm run build` green; `lib/agents` coverage ≥90%; all prior suites unmodified; zero network calls in suite; SPEC-agents success criteria 1–4 confirmed
  - Verify: commands clean; coverage reviewed; result recorded below
  - Files: (config tweaks only if required)
