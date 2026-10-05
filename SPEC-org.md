# Spec: org

Module id: `org` (see `CAPABILITY-MAP.md`). Depends on: `notes`. Classes & students management, plus linking notes to them.

## Objective

A teacher can create classes (with period/subject), manage each class's roster of students, and link any note to a class and any number of that class's students — from inside the note editor. Deleting roster data never destroys notes.

**User stories**
- As a teacher, I can create a class ("Algebra I, Period 3") and add students to it.
- As a teacher, while writing a note I can pick the class and toggle the students it concerns.
- As a teacher, I can see which notes are linked to a class on its detail page.
- As a teacher, if I delete a class or student, my notes survive and simply become unlinked.

## Tech Stack

- Same project as `notes` (Next.js 16, TS, Tailwind, Vitest) — no new dependencies
- `zod` schemas for `Class` / `Student`; storage envelope extended in place
- Pages read through `useSyncExternalStore` snapshots (pattern established in `notes`)

## Data Model

```ts
interface Class {
  id: string;          // crypto.randomUUID()
  name: string;        // non-empty, trimmed
  period: string;      // optional, '' allowed
  subject: string;     // optional, '' allowed
  createdAt: string;   // ISO 8601
}

interface Student {
  id: string;
  classId: string;
  name: string;        // non-empty, trimmed
  createdAt: string;
}
```

**Envelope contract change (documented here and amended in SPEC-notes.md):**
storage payload becomes `{ version: 1, notes: [], classes: [], students: [] }`.
`classes`/`students` are optional on read (old payloads → `[]`); always written on write.
`loadError` becomes: corrupt envelope OR any invalid entry (note, class, or student) dropped.
Corrupt entries in one array never block the others (partial recovery).

**Cascade rules (never delete notes):**
- `deleteClass(id)` → removes the class, removes its students, sets matching notes' `classId` to `null`, filters those students out of every note's `studentIds`
- `deleteStudent(id)` → removes the student, filters it out of every note's `studentIds`

**Repository API (`lib/storage/org.ts`):**
`listClasses()`, `getClass(id)`, `saveClass(ClassInput)`, `deleteClass(id)`,
`listStudents(classId)`, `getStudent(id)`, `saveStudent(StudentInput)`, `deleteStudent(id)`,
plus org snapshots: `getOrgSnapshot()` / `getServerOrgSnapshot()` / `subscribeOrg()` (same useSyncExternalStore contract as notes; one shared listener set — a write that changes notes must notify org readers too).

**Internal refactor:** envelope read/write + listener/snapshot plumbing moves to `lib/storage/envelope.ts`, used by both `notes.ts` and `org.ts`. `notes.ts` public exports remain byte-compatible for existing callers/tests.

## UI

| Route | Behavior |
|---|---|
| `/classes` | Create-class form (name, period, subject); class cards with student/note counts; link to detail |
| `/classes/[id]` | Class info + rename form; roster: add student, rename, delete (confirm); list of linked notes |
| NoteEditor (extended) | ClassSelect dropdown ("No class" + classes); StudentSelect toggle chips (only students of selected class); changing class clears `studentIds`; values flow into `saveNote({ classId, studentIds })` |

Sidebar link "Classes" already exists (placeholder replaced).

## Commands

Unchanged from `SPEC-notes.md` (dev / build / lint / test / test:coverage).

## Project Structure

```
lib/storage/envelope.ts   → shared envelope read/write, listeners, snapshots (refactor)
lib/storage/org.ts        → class/student repository + org snapshots
lib/storage/schema.ts     → + classSchema, studentSchema, inputs (envelope gains arrays)
lib/storage/notes.ts      → delegates to envelope.ts; public API unchanged
components/org/           → ClassForm, ClassCard, StudentList
components/notes/         → + ClassSelect, StudentSelect; NoteEditor extended
app/classes/page.tsx      → roster management home (replaces placeholder)
app/classes/[id]/page.tsx → class detail
tests/unit/storage/org.test.ts, tests/integration/classes-pages.test.tsx
```

## Testing Strategy

- **Unit:** class/student CRUD; cascade unlink (notes survive, fields cleaned); backward-compat (notes-only payload → empty arrays); partial corruption (bad class entry dropped, notes kept, `loadError` true); snapshot stability + subscription notifications
- **Integration (jsdom):** classes list renders seeded classes; create form adds one; detail page shows students + linked notes; NoteEditor picks a class/student and the saved note carries the links
- **Regression:** entire `notes` suite must pass unchanged (public API promise)
- Coverage ≥90% lines on `lib/storage/`

## Boundaries

- **Always:** zod-validate at the storage boundary; preserve `notes.ts` public API; cascade-unlink (never cascade-delete) on roster deletion; run lint/test/build before done
- **Ask first:** changing the `Note`/`NoteInput`/`NoteReadResult` types; bumping envelope `version`; new dependencies; files owned by `search`/`agents`/`export`/`dashboard`
- **Never:** delete notes as part of roster deletion; read/write localStorage outside `lib/storage/`; commit secrets

## Success Criteria

1. Class CRUD + student CRUD within a class, all persisted across reloads.
2. NoteEditor links a note to a class + its students; links visible on class detail; editable later.
3. Deleting class/student shows confirm; notes survive with cleaned links.
4. Old notes-only payloads load without loss (classes/students default to empty).
5. Corrupt class/student entries are skipped with `loadError`, no crash; notes unaffected.
6. `npm run lint`, `npm run test`, `npm run build` green; `lib/storage` coverage ≥90%; full `notes` test suite passes unmodified.

## Open Questions

- Bulk roster import (CSV paste) — deferred until requested.
- Students shared across classes (multi-enrollment) — revisit only if a real need appears.

## Amendments & completion

- **2026-10-05 — module gate passed:** `npm run lint` 0 problems; `npm run test` 8 files / 68 tests green (`notes` cases unmodified); `npm run build` success; `lib/storage` lines 98.44% (functions 100%); dev smoke `/classes` + `/classes/[id]` 200 without errors; SPEC-org success criteria 1–6 confirmed. Task checklist recorded in `tasks/todo.md` (search module).
