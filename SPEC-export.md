# Spec: export

Module id: `export` (see `CAPABILITY-MAP.md`). Depends on: `notes`, `org`. Take notes out of the app: Markdown, CSV, and a print-ready view for PDF.

## Objective

A teacher can export their notes in the format they need: **Markdown** for documents/notes apps, **CSV** for spreadsheets, and **PDF** via a print-optimized view (browser "Save as PDF" — no PDF library, no new dependencies). Scope: all notes, or the notes of one class.

**User stories**
- As a teacher, I download all notes as one Markdown file to paste into a report.
- As a teacher, I download one class's notes as a CSV to open in Excel/Sheets.
- As a teacher, I print a clean, paginated view of my notes (or save it as a PDF).

## Tech Stack

- Same project (Next.js 16, TS, Tailwind, Vitest) — **no new dependencies** (no PDF/CSV libraries; hand-rolled formatters, `Blob` downloads, browser print)
- Pure formatter functions in `lib/export/` (string in → string out, no I/O, no React)
- Client download helper (`Blob` + object URL + programmatic `<a download>`); print uses `window.print()` with `@media print` rules in `app/globals.css`
- Class/student display names resolved from the org snapshot (repo read functions or snapshot passed in as context)

## Format Contracts

### Markdown — `notesToMarkdown(notes, ctx): string`

Per note, in `updatedAt` desc order (page sorts; function preserves input order):

```markdown
# Fractions recap

- Date: 2026-03-10
- Type: observation
- Class: Algebra I (Period 3)
- Students: Ada, Grace
- Tags: math

Covered equivalent fractions.

---

```

- Header `# {title}`; body verbatim (already markdown); notes separated by `---` + blank line (none after the last note).
- `Date` = `updatedAt` `YYYY-MM-DD`. Class line omitted when `classId` null; `Students`/`Tags` lines omitted when empty. Unknown class/student ids (dangling) resolve to nothing → omit line / drop the id.

### CSV — `notesToCsv(notes, ctx): string`

- Header: `id,title,type,tags,class,students,created_at,updated_at,body`
- One row per note (input order); `tags`/`students` joined with `;`; CRLF line endings; RFC-4180 quoting (fields containing `,` `"` or newlines are quoted; inner `"` doubled); UTF-8 **BOM** (`﻿`) prefixed for Excel.

### PDF — print view (part of the `/export` page)

- No file generation: the page renders the selected scope's notes as formatted articles (same content shape as Markdown: title, meta line, body).
- A "Print / Save as PDF" button calls `window.print()`; `@media print` rules hide sidebar, header, controls, and the preview chrome, and add page breaks between notes.

## Data / Context

```ts
// lib/export/types.ts (or inline in formatters)
interface ExportContext {
  classNames: Map<string, { name: string; period: string }>;
  studentNames: Map<string, string>;
}
function buildExportContext(classes: Class[], students: Student[]): ExportContext;
```

No storage access from `lib/export/` — the page builds context from snapshots.

## UI

| Route | Behavior |
|---|---|
| `/export` | Scope selector: "All notes" (default) or one class via `ClassSelect` `anyLabel="All classes"`; count line ("Exporting N notes"); buttons **Download Markdown**, **Download CSV**, **Print / Save as PDF**; below: live preview (rendered articles for current scope); empty state when scope has no notes (buttons disabled); load-error banner (same copy as other pages) |

- Downloads fire `downloadText(filename, content, mime)` from `lib/export/download.ts` — filename `teacher-notes-YYYY-MM-DD.md` / `.csv` (date = today, local).
- Preview reuses the print layout (it *is* the print content).

## Commands

Unchanged from `SPEC-notes.md` (dev / build / lint / test / test:coverage).

## Project Structure

```
lib/export/markdown.ts   → notesToMarkdown + buildExportContext
lib/export/csv.ts        → notesToCsv
lib/export/download.ts   → downloadText (Blob + object URL; client-only)
app/export/page.tsx      → /export (replaces placeholder)
app/globals.css          → + @media print rules (additive; screen styles unchanged)
tests/unit/export/{markdown,csv}.test.ts (+ download.test.ts if jsdom-friendly)
tests/integration/export-page.test.tsx
```

## Testing Strategy

- **Unit:** markdown structure (heading/meta/omission rules/separator, context name resolution, dangling ids); CSV (header, CRLF, quoting of commas/quotes/newlines, `;` joins, BOM); download helper with mocked `URL.createObjectURL` if exercised
- **Integration (jsdom):** seed notes + classes; scope switch updates count/preview; Download buttons call `downloadText` with content containing expected titles (spy via `vi.mock`); Print button calls `window.print` (spy); empty scope disables buttons
- **Regression:** `notes` + `org` + `search` suites pass unmodified
- Coverage ≥90% lines on `lib/export/`

## Boundaries

- **Always:** pure formatters (I/O-free); client-only download/print; scope built from snapshots; run lint/test/build before done
- **Ask first:** real PDF generation (library), XLSX/DOCX formats, exporting search-filtered views, per-note export buttons in the editor, touching screen styles (only `@media print` is pre-approved as additive)
- **Never:** add dependencies; write to storage; break the existing suites

## Success Criteria

1. Markdown export produces the contracted structure for mixed scopes (with/without class/students/tags), names resolved, dangling ids tolerated.
2. CSV export is valid RFC-4180: header, CRLF, quoting, `;` joins, BOM present; opens cleanly in spreadsheet tooling.
3. Print button invokes `window.print()`; preview shows current scope; print CSS hides chrome (verified by rule presence + integration spy).
4. Scope selector switches all-note/class exports; empty scope shows state and disables buttons.
5. `npm run lint`, `npm run test`, `npm run build` green; `lib/export` coverage ≥90%; `notes` + `org` + `search` suites unmodified.

## Open Questions

- Exporting only search-filtered results (needs URL/param bridge) — deferred.
- Per-note download button on the note detail page — deferred.
- Custom filename/title prefix, date-range scope — deferred.

## Amendments & completion

- **2026-10-05 — module gate passed:** `npm run lint` 0 problems; `npm run test` 14 files / 112 tests green (`notes` + `org` + `search` cases unmodified); `npm run build` success; `lib/export/**` 100% covered; overall `lib/storage` + `lib/search` + `lib/export` 98.98% lines; dev smoke `/export` 200 clean; SPEC-export success criteria 1–5 confirmed. `globals.css` gained the additive `@media print` block. Task checklist in `tasks/todo.md`.
