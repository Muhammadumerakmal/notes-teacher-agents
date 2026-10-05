# Spec: notes

Module id: `notes` (see `CAPABILITY-MAP.md`). Covers the app shell, note CRUD, markdown editing/preview, and the storage repository that every other module consumes.

## Objective

A teacher can create, edit, browse, and delete notes; organize them with title, freeform tags, and a note type; write in markdown with live preview; and trust that data survives page reloads. This module delivers the localStorage-backed repository every downstream module (`org`, `search`, `agents`, `export`, `dashboard`) reads through.

**User stories**
- As a teacher, I can create a note with a title and markdown body and see it in my notes list.
- As a teacher, I can edit/delete a note and toggle between edit and preview.
- As a teacher, I can tag notes and set a type (general, observation, behavior, progress, generated).
- As a teacher, I can close and reopen the app without losing anything.

## Tech Stack

- Next.js (App Router, TypeScript, ESLint), Tailwind CSS
- `react-markdown` for preview rendering
- `zod` (v4) for schema validation at the storage boundary
- `vitest` + `@vitest/coverage-v8` + jsdom (`@testing-library/react` for component tests)
- Storage: `localStorage`, single namespaced key, JSON payload, versioned envelope

## Commands

```
Scaffold:  npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
Install:   npm i react-markdown && npm i -D vitest @vitest/coverage-v8 jsdom @testing-library/react
Dev:       npm run dev
Build:     npm run build
Lint:      npm run lint
Test:      npm run test          # vitest run
Coverage:  npm run test:coverage # vitest run --coverage
```

## Project Structure

```
app/
  layout.tsx        → App shell: sidebar nav (all 6 module links) — this module
  notes/page.tsx    → Notes list (recent, by updatedAt)
  notes/new/        → Create note
  notes/[id]/       → View/edit note
  placeholder.tsx   → "Coming soon" page for unbuilt module links
lib/
  storage/          → This module: types, zod schema, repository, localStorage adapter
components/
  notes/            → NoteEditor, NoteCard, TagInput, TypeSelect, MarkdownPreview
tests/
  unit/storage/     → Repository + schema tests (vitest, jsdom localStorage)
  components/       → NoteEditor component test
SPEC-*.md, CAPABILITY-MAP.md, tasks/   → specs + plan/todo at project root
```

## Code Style

One real example beats prose — repository functions look like this:

```ts
// lib/storage/types.ts
export type NoteType = 'general' | 'observation' | 'behavior' | 'progress' | 'generated';

export interface Note {
  id: string;               // crypto.randomUUID()
  title: string;            // non-empty; editor falls back to "Untitled"
  body: string;             // markdown
  tags: string[];           // trimmed, deduped, lowercased
  type: NoteType;
  classId: string | null;   // reserved for org module; null until linked
  studentIds: string[];     // reserved for org module; empty until linked
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}

// lib/storage/notes.ts
export function saveNote(input: NoteInput): Note {
  const existing = input.id ? getNote(input.id) : undefined;
  const note = noteSchema.parse({
    ...existing,
    ...input,
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  persistNote(note);
  return note;
}
```

Conventions: TypeScript strict; named exports only (Next pages/layouts exempt); zod-parse every read/write at the storage boundary; ISO 8601 strings for dates; `@/*` import alias; no `any` in `lib/`; components are client components only when they use state (`'use client'`).

## Testing Strategy

- **Unit (vitest, jsdom):** `lib/storage` — CRUD round-trips, zod rejection of corrupt entries, corrupted-storage recovery (falls back to empty store, surfaces error state), tag normalization. Coverage: ≥90% lines on `lib/storage`.
- **Component (vitest + Testing Library):** NoteEditor — typing updates preview, save calls repository (mocked).
- **Manual checks:** reload persistence, delete confirm, preview toggle.
- No e2e in this module (would need `agents` etc. first); revisit at `dashboard`.

## Boundaries

- **Always:** run `npm run lint`, `npm run test`, `npm run build` before calling the module done; zod-validate all persisted data; use the repository API — no direct `localStorage` calls outside `lib/storage`; follow the Note schema above.
- **Ask first:** adding npm dependencies; changing the `Note` schema (breaks `org`/`search`/`agents`/`export`); Next.js config changes; touching files owned by other modules (`lib/search`, `lib/agents`, `lib/export`, class/student pages).
- **Never:** commit secrets or `.env.local`; persist data server-side (localStorage only); bypass schema validation; delete tests to make them pass.

## Success Criteria

1. Create/edit/delete notes; markdown preview toggle renders sanitized markdown; tags + type selectable.
2. Data persists across full page reloads (localStorage, versioned envelope).
3. Corrupt storage payload never crashes the app — recovers to empty store and reports error state.
4. Unbuilt module links in the shell render the placeholder page, not a 404.
5. `npm run lint`, `npm run test`, `npm run build` all pass; `lib/storage` coverage ≥90% lines.

## Open Questions

- JSON backup/restore: deferred to `export` module (out of scope here).
- Rich-text/WYSIWYG editing: rejected in favor of markdown textarea — reopen only on request.

## Amendments

- **2026-10-05 (org module):** storage envelope extended to `{ version: 1, notes, classes, students }` — `classes`/`students` optional on read for backward compatibility (see `SPEC-org.md` for the contract, cascade rules, and the internal `envelope.ts` refactor). Public API of `lib/storage/notes.ts` unchanged. Load-error banner copy broadened from "stored notes" to "stored data".
- **2026-10-05 — notes module gate passed:** `npm run lint` 0 problems; 35/35 tests green; `npm run build` success (9 routes); `lib/storage` coverage 98.2% lines / 100% funcs; all sidebar links resolve.
