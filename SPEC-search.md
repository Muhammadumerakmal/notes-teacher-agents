# Spec: search

Module id: `search` (see `CAPABILITY-MAP.md`). Depends on: `notes`, `org`. Full-text search + filters over the teacher's notes.

## Objective

A teacher can find notes fast: type words and/or combine filters (class, student, tag, type, date) and see matching notes as cards, live. All querying is client-side over the existing snapshot — no index, no server, no new dependencies.

**User stories**
- As a teacher, I type "fractions" and see every note whose title, body, or tags mention it.
- As a teacher, I filter to one class, then to specific students within it, to review a roster's history.
- As a teacher, I filter by tag, type, or last-updated date range to prepare for a meeting.
- As a teacher, I combine a text query with filters and get notes matching **all** of them.

## Tech Stack

- Same project (Next.js 16, TS, Tailwind, Vitest) — **no new dependencies**
- Pure query functions in `lib/search/` over `Note[]` (no storage access, no React)
- Page reads the snapshot with the established `useSyncExternalStore` pattern; results reuse `NoteCard`

## Data Model / Query Contract

```ts
// lib/search/query.ts
interface SearchCriteria {
  query: string;            // free text; trimmed; '' = no text constraint
  classId: string | null;   // null = any class (including unlinked)
  studentIds: string[];     // [] = any; otherwise note must link ANY of them (OR)
  tag: string | null;       // null = any tag
  types: NoteType[];        // [] = any; otherwise note.type ∈ types (OR)
  dateFrom: string | null;  // ISO date (input[type=date] value, YYYY-MM-DD); inclusive on updatedAt
  dateTo: string | null;    // inclusive on updatedAt
}

function searchNotes(notes: Note[], criteria: SearchCriteria): Note[];
function allTags(notes: Note[]): string[];   // distinct, case-normalized (first-seen casing), sorted A→Z
```

**Matching rules (all constraints AND together):**
1. **Text** — case-insensitive; the query is split on whitespace into terms; **every** term must appear as a substring of `title + ' ' + body + ' ' + tags.join(' ')`. (Substring, not word-boundary: "frac" matches "fractions".)
2. **classId** — `note.classId === classId` when set; `null` = any class. The search page renders `ClassSelect` with an added optional `anyLabel` prop (default `'No class'`, org behavior unchanged) so its default option reads **"Any class"** — picking a specific class narrows to it. Filtering to *unlinked* notes is deferred (Open Questions).
3. **studentIds** — when non-empty: note must contain **at least one** of the ids (OR).
4. **tag** — exact match against one of `note.tags` (case-insensitive compare).
5. **types** — `note.type` must be one of the selected types.
6. **dateFrom/dateTo** — compare `note.updatedAt` (YYYY-MM-DD prefix compare against the input values; inclusive both ends; only applied when set).

**Stability:** `searchNotes` is pure and returns notes in input order (the page sorts for display). `allTags` is pure. No localStorage reads/writes — the page passes `snapshot.notes` in.

## UI

| Route | Behavior |
|---|---|
| `/search` | Search field (autofocus, placeholder "Search notes…"); filter row: ClassSelect with `anyLabel="Any class"` (org component + small optional prop), student chips (only when a class is selected; from that class's roster), tag chips (from `allTags`), type chips (the 5 `NOTE_TYPES`, labels capitalized), date-from/date-to inputs (updatedAt); result count line; results as `NoteCard` grid sorted by `updatedAt` desc; "No notes match" state when criteria are non-empty but nothing matches; prompt state ("Type to search, or pick a filter.") when everything is empty/default |

**Semantics**
- Filtering is **live** — every keystroke/selection re-queries from the snapshot (pure function; no debounce needed at local scale).
- All controls are controlled and combinable; a "Clear filters" button appears when any criterion is non-default and resets everything (including the query).
- Class change clears the selected student ids (students of other classes can't match); class is not cleared by other controls.

## Commands

Unchanged from `SPEC-notes.md` (dev / build / lint / test / test:coverage).

## Project Structure

```
lib/search/query.ts        → searchNotes + allTags (pure, no I/O)
components/search/…        → SearchFilters (filter row) — only if the page needs extraction; otherwise inline
components/notes/ClassSelect.tsx → + optional `anyLabel` prop (additive; org default unchanged)
app/search/page.tsx        → /search page (replaces placeholder)
tests/unit/search/query.test.ts
tests/integration/search-page.test.tsx
```

## Testing Strategy

- **Unit (`lib/search`):** text matching (case-insensitivity, multi-term AND, matches title/body/tags, no match), each filter individually (class, students-OR, tag, types, date range inclusive), combined criteria, `allTags` dedupe/sort, empty-criteria passthrough (returns all in order)
- **Integration (jsdom):** seeded notes — type query → count + cards update; pick class → students chips appear and results narrow; no-match state; prompt state; clear filters resets
- **Regression:** entire `notes` + `org` suites must pass unchanged
- Coverage ≥90% lines on `lib/search/`

## Boundaries

- **Always:** pure query module (I/O-free, React-free); page reads only through snapshots; reuse `NoteCard`; run lint/test/build before done
- **Ask first:** URL-synced search params; match highlighting; fuzzy/typo tolerance; searching note *history* or deleted notes; new dependencies; touching `lib/storage/`
- **Never:** write to storage from search; add dependencies; delete/filter-mutate notes from the search view

## Success Criteria

1. Text search matches across title/body/tags, case-insensitively, with multi-term AND.
2. Each filter works alone and combines with others via AND (multi-value filters OR internally); student chips only offered for the chosen class; class change clears student selection.
3. Result count is accurate; cards link to `/notes/[id]`; sorted newest-updated first.
4. Prompt state when no criteria; no-match state when criteria exclude everything; Clear filters resets all controls.
5. `npm run lint`, `npm run test`, `npm run build` green; `lib/search` coverage ≥90%; `notes` + `org` suites pass unmodified.

## Open Questions

- Filter to "unlinked notes" (no class) — deferred unless requested.
- URL-synced criteria (shareable search links) — deferred.
- Highlighting matched terms in excerpts — deferred.
- Date filter field: `updatedAt` (decided); `createdAt` available later if needed.

## Amendments & completion

- **2026-10-05 — module gate passed:** `npm run lint` 0 problems; `npm run test` 10 files / 91 tests green (`notes` + `org` cases unmodified); `npm run build` success; `lib/search/query.ts` 100% covered; overall `lib/storage` + `lib/search` 98.68% lines; dev smoke `/search` 200 clean; SPEC-search success criteria 1–5 confirmed. `ClassSelect` gained the additive `anyLabel` prop (default `'No class'`). Task checklist in `tasks/todo.md`.
