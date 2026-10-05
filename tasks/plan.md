# Plan: agents

Spec: `SPEC-agents.md`. Adds four dependencies (approved at spec gate): `@openai/agents`, `@openai/agents-extensions`, `@ai-sdk/google`, `zod`. Server-only `GEMINI_API_KEY` in `.env.local`. No storage changes; existing suites unmodified.

## Components & dependencies

```
0. deps + docs          npm install the four packages; read Next route-handler docs
                        (node_modules/next/dist/docs per AGENTS.md) + installed SDK type docs
        │
        ▼
1. protocol (TDD)       lib/agents/protocol.ts — zod request schema + SSE event types,
        │               encoders (server) + decoder (client), round-trip tested offline
        ├──► 2. tools (TDD)      lib/agents/tools.ts — pure snapshot tools (search_notes
        │                        reuses lib/search); independent of SDK
        │
        ▼
3. agents factory       lib/agents/agents.ts — triage + 5 specialists, system prompts,
        │               handoff config, aisdk(google(...)) model binding; structural tests
        │               (no network — Runner never invoked)
        ▼
4. streaming route      app/api/agents/run/route.ts — validate (protocol) → run (mocked in
        │               tests) → SSE stream; 400/500 paths
        ▼
5. /assistant UI        page + ChatMessage/ChatComposer — fetch stream parser (protocol
        │               decoder), specialist picker, Save-as-note via real notes repo,
        │               integration tests with mocked fetch
        ▼
6. gate                 lint + test + coverage + build + regression (notes/org/search/export)
```

- **Sequential:** 0 → 1 → (2 ∥ 3) → 4 → 5 → 6. Tasks 2 and 3 both need deps (task 0) but not each other; 4 needs 1+3; 5 needs 1.
- **Invariant:** all existing suites (112 tests) pass unmodified after every task; zero network calls in the entire suite (`Runner` mocked, `fetch` mocked).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| SDK API drift (exports: `Runner`, `aisdk`, handoff helpers) | Task 0 reads the installed package's types/docs first; factory tests assert structure so API mismatches fail fast at task 3 |
| zod major-version conflict between project and SDK peers | Check `npm ls zod` after install; if forced to a different major, align code to the installed version (config-level, reported at task 0) |
| SSE framing bugs (split chunks, partial JSON lines) | Shared encoder/decoder in `protocol.ts` with round-trip test incl. multi-byte chars; client buffers partial lines |
| Route hard to test (Next response/stream semantics) | Route is a plain `POST(Request)` function — invoke directly in vitest with `Request`/`Response`; mocked run yields canned deltas |
| jsdom lacks streaming fetch | Test mock returns a `ReadableStream` Response; helper builds SSE bytes from event list |
| Missing `GEMINI_API_KEY` breaks dev/build | Route returns safe error; page renders key hint; build never calls the model (factory only binds at call time) |
| Save-as-note navigates during test | `useRouter().push` mocked in integration test (established pattern) |

## Verification checkpoints

1. **After task 0:** install exit 0; no peer conflicts reported; Next docs for route handlers read (recorded here if they differ from Next 15 conventions).
2. **After tasks 1–2:** protocol + tools unit tests green offline; coverage include gains `lib/agents/**`.
3. **After task 3:** factory structural tests green without network; `npm run build` still passes (SDK bundles server-side).
4. **After task 5:** integration tests green (stream render + save-as-note); `npm run dev` smoke `/assistant` 200 (page loads; no model call without user action).
5. **After task 6 (module gate):** `npm run lint && npm run test && npm run build` green; `lib/agents` ≥90%; SPEC-agents success criteria 1–4 confirmed.
