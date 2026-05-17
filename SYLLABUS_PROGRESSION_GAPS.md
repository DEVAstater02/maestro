# Syllabus Progression — Architecture Gaps

> Scope: teaching/learning phase only. User persona gaps are tracked separately.

---

## Gap 1 — No current node pointer in tutor context

**What happens:** Full `content_json` is `json.dumps()`-ed and passed as `CONVERSATION_SYLLABUS`. Tutor is told to "follow the syllabus sequence" but receives no explicit signal about which node is active.

**Effect:** On session start and resume, tutor infers position from session memory prose. Leads to re-teaching covered nodes, skipping ahead, or starting from the beginning every time.

**File:** `app/main.py:99`, `app/prompts/prompts.py` (`TUTOR_CONTEXT`)

**Fix:** Extract `current_chapter_index` from the session, resolve it to the active `content_node`, and pass it explicitly:
```
CURRENT NODE (index {N}): {node_title} — {concept}
```

---

## Gap 2 — `current_chapter_index` is never read or written

**What happens:** Column exists in `sessions` table (`tables.sql`). Nothing in `app/main.py`, `app/services/conversation_service.py`, or `app/repositories/persistence_repo.py` reads or writes it.

**Effect:** Always 0 for every session. Can't be used to anchor tutor position or track progress across sessions.

**File:** `tables.sql`, `app/repositories/persistence_repo.py`

**Fix:**
- `get_latest_session()` — add `current_chapter_index` to the SELECT and return it
- Add `update_chapter_index(session_id, index)` method to `PersistenceRepository`
- Load it in `/ws/voice` handler and inject into tutor context

---

## Gap 3 — Session memory doesn't reference node IDs

**What happens:** `SESSION_MEMORY_PROMPT` asks LLM to produce prose: "topics covered, concepts explained, questions asked". No `node_id` references. Memory says "we covered recursion" not "node_003 complete".

**Effect:** On resume, tutor reads prose and guesses position. No machine-readable link between memory and syllabus structure. `current_chapter_index` can't be recovered from memory even if we wanted to.

**File:** `app/prompts/session_memory.py`

**Fix:** Add to `SESSION_MEMORY_PROMPT`:
- Instruct LLM to output a structured block at the end:
  ```
  <progress>{"last_node_id": "node_003", "chapter_index": 2}</progress>
  ```
- Parse this in `update_memory()` to extract and persist `current_chapter_index`

---

## Gap 4 — Raw `content_json` is noisy tutor context

**What happens:** Full `content_json` is dumped including `module_id`, `guardrails`, `assessment_logic`, `metadata` — none of which the tutor needs turn-by-turn.

**Effect:** Wastes tokens. LLM has to parse its own generation format mid-conversation. `content_nodes` (the only field that matters for teaching) is buried.

**File:** `app/main.py:99`

**Fix:** Pre-process syllabus before injecting. Build a clean teaching context:
```python
nodes = content_json.get("content_nodes", [])
objectives = content_json.get("learning_objectives", [])
# Format as clean numbered list, not raw JSON
```
Inject only `learning_objectives` + ordered `content_nodes` (title + concept per node, not full objects).

---

## Gap 5 — No node-advance feedback loop

**What happens:** Tutor prompt says "when student shows understanding, nudge toward next concept." Nothing happens mechanically when it does — no signal, no state change, no counter increment. Progress is invisible to every layer.

**Effect:** `current_chapter_index` can never self-update. Progress resets every session. Syllabus display (future feature) has nothing real to read.

**File:** `app/prompts/prompts.py` (`TUTOR_PROMPT`), `app/main.py`

**Fix:** Two-part:
1. Instruct tutor to emit `<advance_node/>` XML tag in its response when confident current node is understood
2. In `/ws/voice` handler, after each LLM response: detect tag, strip it from spoken text, call `update_chapter_index(session_id, current_index + 1)`, send `{"type": "node_advance", "index": N}` over WebSocket

---

---

## Gap 6 — Course completion not handled

**What happens:** When `<advance_node/>` is detected on the last node, the condition
`CURRENT_NODE_INDEX < total_nodes - 1` is `False` — the block is silently skipped.

**Effect:**
- `sessions.is_completed` never set (column exists, never touched)
- No `course_complete` WebSocket event sent to client
- Tutor prompt still says "node N of N", keeps emitting `<advance_node/>` every turn — infinite silent no-op
- On session reconnect, tutor resumes in teaching mode with no awareness course is done

**File:** `app/main.py`, `app/repositories/persistence_repo.py`, `app/prompts/prompts.py`

**Fix — three parts:**

**Part A — Sentinel index + DB flag**
When last node is understood: set `CURRENT_NODE_INDEX = total_nodes` (one past end) and persist.
On any session resume where `current_chapter_index >= total_nodes`, course is known complete without
a separate flag. Also call `mark_session_complete(session_id)` to set `is_completed = TRUE`.

**Part B — Forced memory flush on completion**
`update_memory()` runs every 10 turns — does not fire on course completion. Final turns
(the student understanding the last node) are lost from `SESSION_MEMORY`.
Fix: call `update_memory(force=True)` immediately when course_complete fires, before
sending the WebSocket event. This captures the full learning journey into `SESSION_MEMORY`
so it survives reconnect.

**Part C — Prompt switching (teaching → review)**
On reconnect with `SESSION_COMPLETE = True`, the tutor must NOT resume teaching or emit
`<advance_node/>`. Use a separate `REVIEW_PROMPT` system prompt (instead of `TUTOR_PROMPT`)
that instructs the tutor to offer review, connect concepts, and celebrate completion.
Similarly, use `WELCOME_COMPLETE_SYSTEM_PROMPT` for the greeting instead of `WELCOME_SYSTEM_PROMPT`.
`SESSION_COMPLETE` is derived each session from `CURRENT_NODE_INDEX >= total_nodes` — persisted
via the sentinel, so it survives reconnects without a new DB column.

---

## Implementation Order

| Step | What | Files touched |
|------|------|---------------|
| 1 | Read & return `current_chapter_index` from session | `persistence_repo.py` |
| 2 | Add `update_chapter_index()` to repo | `persistence_repo.py` |
| 3 | Strip noisy fields, build clean syllabus context | `main.py` |
| 4 | Inject current node into `TUTOR_CONTEXT` | `prompts/prompts.py`, `main.py` |
| 5 | Add `<advance_node/>` signal to tutor prompt | `prompts/prompts.py` |
| 6 | Detect signal in WS handler, update index, emit WS event | `main.py` |
| 7 | Add structured `<progress>` block to session memory prompt | `prompts/session_memory.py` |
| 8 | Parse progress block in `update_memory()` | `conversation_service.py` |
| 9 | Add `mark_session_complete()` to repo | `persistence_repo.py` |
| 10 | Add `REVIEW_PROMPT` + `WELCOME_COMPLETE_SYSTEM_PROMPT` | `prompts/prompts.py` |
| 11 | Detect last-node advance: sentinel, forced flush, DB flag, WS event | `main.py` |
| 12 | Derive `SESSION_COMPLETE` on session init; switch prompts in greeting + loop | `main.py` |

---

## Status

| Step | Status |
|------|--------|
| 1–12 | ✅ Implemented |

---

## Syllabus Display UI

All backend gaps above unblocked the frontend. Implemented:

| Item | Detail |
|------|--------|
| `session_state` WS message | Sent after `audio_format` on connect — carries `current_node_index`, `total_nodes`, `is_completed` so frontend can init without waiting for first turn |
| `content_json` prop | `learn/[id]/page.tsx` fetches and passes `content_json` down to `LearningScreen` |
| `SyllabusPanel.tsx` | Left sidebar: node list with three visual states (done ✓ / current ring / upcoming dim), completion banner with Trophy icon |
| `LearningScreen.tsx` | Toggle button in header, `AnimatePresence` animated slide-in, handles `session_state` / `node_advance` / `course_complete` WS events to update `currentNodeIndex` and `isSessionComplete` |

**Status: ✅ Implemented**

---

## UI / Theme Changes

| Item | Detail |
|------|--------|
| Dark stone palette | `globals.css` `:root` updated to warm stone (`#1c1917` bg, `#292524` surface, `#44403c` surface-alt, `#57534e` border) |
| Amber accent | `--theme-accent: #d97706`, `--theme-accent-hover: #f59e0b` — replaces previous zinc accent |
| Teal → Amber | All hardcoded `teal-*` Tailwind classes replaced with `amber-*` across `SyllabusPanel`, `LearningScreen`, `page.tsx` |
| Theme toggle removed | `ThemeToggle` component stripped from all pages; `ThemeProvider` removed from `providers.tsx` |
| MermaidChart | Hardcoded to dark stone theme vars — drops `useTheme` dependency |
| VoiceOrb | Glow, sphere gradient, and edge stroke recolored from green → amber/orange to match palette |

**Status: ✅ Implemented**

---

## Deferred

- User persona injection into tutor context (revisiting user storage model first — `learning_style`, `reasoning_speed`, `analogy_pool`, `knowledge_map`, `dob`, `grade`, `interests` in `users` table may need restructuring before injection)
