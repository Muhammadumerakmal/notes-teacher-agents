# Capability Map: Teacher Notes Agent

Approved 2026-10-05. This map is the index of what exists; each module has its own spec (`SPEC-<module-id>.md`).

| Module id | Responsibility | Depends on |
|---|---|---|
| `notes` | App shell (layout/nav), note CRUD, markdown editor + preview, tags, autosave, storage repository | — |
| `org` | Classes & students management; link notes to classes/students | `notes` |
| `search` | Full-text search + filters (class, student, tag, type, date) | `notes`, `org` |
| `agents` | Gemini agents via OpenAI Agents SDK: 5 specialists + triage/handoffs, function tools over note snapshots, streaming API route, `/assistant` UI, Save-as-note | `notes`, `org` |
| `export` | Markdown / CSV / PDF (print stylesheet) export of notes | `notes`, `org` |
| `dashboard` | Home view: recent notes, stats, quick actions | `notes`, `org`, `search` |

**Build order:** `notes` → `org` → `search`, `export` (independent) → `agents` → `dashboard`

**Rules:** stable module ids (never renamed), dependency arrows point one way (no cycles), interfaces live at the boundary — `notes` owns the storage repository API, `org` owns class/student queries.
