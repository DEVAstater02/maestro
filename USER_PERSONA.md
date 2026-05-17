# User Persona — Architecture Reference

## Overview

User persona is a hybrid of **structured profile fields**, **LLM-maintained prose notes**, and **a dedicated knowledge table**.

| Store | Table | What lives there |
|---|---|---|
| Structured fields | `users` | Learning style, grade, interests, persona_notes |
| Knowledge scores | `user_knowledge` | Prior subject familiarity + per-syllabus completion scores |

Persona is fetched once at session init (two DB reads: `users` + `user_knowledge`) and injected as a static string into the tutor system prompt on every turn.
Persona is **person-level** — shared across all syllabuses for a given user. It evolves across sessions.

---

## Fields

### `users` table fields

| Field | Type | Default | Description |
|---|---|---|---|
| `learning_style` | `VARCHAR(50)` | `'Direct'` | How the student prefers information delivered (e.g. `Direct`, `Socratic`, `Visual`, `Example-first`) |
| `reasoning_speed` | `VARCHAR(20)` | `'Moderate'` | Self-reported or inferred pace (e.g. `Slow`, `Moderate`, `Fast`) |
| `grade` | `VARCHAR(100)` | `NULL` | Grade level or academic stage (e.g. `10th grade`, `Undergraduate`) |
| `interests` | `TEXT` | `NULL` | Free-text interests (e.g. `gaming, music, robotics`) — used to pick relatable analogies |
| `analogy_pool` | `JSON` | `NULL` | List of domains/analogies that resonate with this student (e.g. `["cooking", "sports"]`) |
| `persona_notes` | `TEXT` | `NULL` | LLM-maintained prose: behavioral observations about HOW this student learns. Updated every 10 turns and on course completion. Max ~150 words. |

`knowledge_map` JSON column on `users` is **dropped** — replaced by the dedicated `user_knowledge` table.

### `user_knowledge` table

```sql
CREATE TABLE user_knowledge (
    user_id    VARCHAR(36)               NOT NULL,
    type       ENUM('prior','completed') NOT NULL,
    ref_id     VARCHAR(255)              NOT NULL,
    label      VARCHAR(255)              NULL,
    score      TINYINT UNSIGNED          NOT NULL DEFAULT 0,
    updated_at TIMESTAMP                 DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, type, ref_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

| Column | `prior` rows | `completed` rows |
|---|---|---|
| `ref_id` | Normalized subject string (`"python"`, `"algebra"`) | `syllabus_id` UUID |
| `label` | NULL (ref_id is human-readable already) | Syllabus title at write time — avoids join at read time |
| `score` | 0–50 (hard cap — inferred, never demonstrated mastery) | 0–100 (`floor(100 / total_nodes)` × nodes completed) |

**Why separate table over JSON blob on `users`:**
- Node advance uses atomic `INSERT ... ON DUPLICATE KEY UPDATE score = LEAST(score + delta, 100)` — no read-modify-write, no race condition
- Each row is independently queryable (future analytics: "which users completed Python Basics?")
- `ref_id` for completed uses UUID — referential integrity, title changes don't orphan rows
- `label` stored at write time eliminates join at session init

---

## Fetch Path

**Trigger:** Session init in `/ws/voice` WebSocket handler, immediately after JWT decode.

```
JWT token → decode_access_token() → user_id
→ PersistenceRepository.get_user(user_id)          ← SELECT on users
→ PersistenceRepository.get_user_knowledge(user_id) ← SELECT on user_knowledge
→ UserRecord populated with prior_knowledge + completed_courses dicts
```

**File:** `app/main.py` — inside `conversation_ws_handler()`

```python
user_record = conv_service.persistence_repo.get_user(user_id)
if user_record:
    knowledge = conv_service.persistence_repo.get_user_knowledge(user_id)
    user_record.prior_knowledge = knowledge["prior"]       # {subject: score}
    user_record.completed_courses = knowledge["completed"] # {syllabus_id: (label, score)}
```

Two `SELECT` calls on WebSocket connect — both PK lookups, negligible latency. Result held in memory for session lifetime. `persona_notes` is the only field mutated in-place during a session; `completed_courses` is mutated in-place on each `<advance_node/>`.

If `token` is absent (anonymous session), `user_record = None` and persona injection falls back to `"No profile available."`.

---

## Prompt Injection

`_build_persona_context(user_record)` in `app/main.py` assembles the structured block:

```
Learning style: Visual | Pace: Moderate | Grade: 10th
Interests: gaming, music
Prior exposure: Python (30/50), Algebra (45/50)
Completed courses: Python Basics (mastered), Data Structures (60% through)
Analogies that resonate: cooking, sports
Behavioral notes: Prefers code examples before theory. Cooking analogies land well.
                  Asks many clarifying questions. Struggles with abstract recursion framing.
```

This string is passed as `{USER_PERSONA}` into:

| Prompt | File | Usage |
|---|---|---|
| `TUTOR_PROMPT` | `app/prompts/prompts.py` | System prompt — tutor uses profile to tailor style, analogies, pacing every turn |
| `REVIEW_PROMPT` | `app/prompts/prompts.py` | System prompt in review mode (post course-complete) — same purpose |
| `WELCOME_USER_CONTEXT` | `app/prompts/prompts.py` | User context for greeting — tutor can personalize opening |

`_build_persona_context` silently omits any field that is `None` or empty — no empty lines in the injected block.

---

## Update Cycle

Two fields change after initial registration: `persona_notes` and `knowledge_map`. Structured fields (`learning_style`, `grade`, etc.) are set at registration and updated manually.

### When updates fire

| Event | Trigger | Fields updated | Mechanism |
|---|---|---|---|
| Curation complete | `<conclude_curation>` tag detected | `knowledge_map.prior` | `asyncio.create_task(bootstrap_knowledge_map(...))` |
| Every 10 turns | Same cadence as session memory flush | `persona_notes` | `asyncio.create_task(update_persona_notes(...))` |
| Node advance | `<advance_node/>` detected | `knowledge_map.completed` | `asyncio.create_task(repo.update_knowledge_map(...))` |
| Course complete | `<advance_node/>` on last node | `persona_notes` | `asyncio.create_task(update_persona_notes(...))` after forced memory flush |

All are **fire-and-forget** — zero latency impact on the turn cycle. Audio has already been sent to the user before any of these calls are made.

### `persona_notes` update flow

```
messages snapshot (pre-flush)
→ ConversationService.update_persona_notes()
→ LLM call with PERSONA_UPDATE_PROMPT
   (current notes + structured fields + session memory + conversation)
→ parse <updated_persona_notes> tag
→ PersistenceRepository.update_persona_notes(user_id, notes)   ← DB write
→ user_record.persona_notes = notes                            ← in-memory mutation
```

### `user_knowledge` update flows

**Curation bootstrap (`prior` rows):**

```
<conclude_curation> detected
→ syllabus generated + sent to client (existing flow, unchanged)
→ asyncio.create_task(bootstrap_knowledge_map(user_id, curation_messages, subject))
    → LLM call with PERSONA_BOOTSTRAP_PROMPT
      (full curation conversation + subject being studied)
    → parse <knowledge_map>[{"subject": "python", "score": 30}, ...]</knowledge_map> tag
    → for each entry:
        PersistenceRepository.upsert_prior_knowledge(user_id, subject, score)
        ← INSERT ... ON DUPLICATE KEY UPDATE score = VALUES(score)
```

LLM instructed: observe vocabulary, claimed knowledge, misconceptions — emit scores 0–50 max. Never above 50. Only emit subjects actually evidenced in conversation.

**Node advance increment (`completed` rows):**

```
<advance_node/> detected in /ws/voice handler
→ per_node_delta = floor(100 / TOTAL_NODES)  ← computed at session init
→ PersistenceRepository.increment_completed_course(
      user_id, syllabus_id, syllabus_title, per_node_delta
  )
  ← INSERT INTO user_knowledge (user_id, 'completed', syllabus_id, syllabus_title, delta)
     ON DUPLICATE KEY UPDATE score = LEAST(score + VALUES(score), 100)
→ user_record.completed_courses[syllabus_id] = (
      syllabus_title,
      min(current_score + per_node_delta, 100)
  )  ← in-memory mutation
```

Atomic DB write — no read-modify-write, no race condition. Final node lands at exactly 100 because `per_node_delta × total_nodes = 100` (floored, last node uses remainder).

**File:** `app/main.py` — `/ws/voice` handler at `<advance_node/>` detection block
**Prompt:** `PERSONA_BOOTSTRAP_PROMPT` in `app/prompts/prompts.py` (new — curation bootstrap only)

In-memory mutation means the **next turn's prompt immediately reflects updated notes** without a DB re-fetch.

**File:** `app/services/conversation_service.py` — `update_persona_notes()`

**Prompt:** `PERSONA_UPDATE_PROMPT` in `app/prompts/prompts.py`

### What the LLM observes

`PERSONA_UPDATE_PROMPT` instructs the model to focus exclusively on **behavioral patterns**, not content:
- Explanation styles that landed (examples-first, theory-first, analogies, code)
- Analogies or domains that resonated
- Confusion or breakthrough moments
- Pace preferences
- Question patterns (clarifying, challenging, confirming)

Session content (what topics were covered) is tracked separately in `session_memory_string` on the `sessions` table. Persona notes never duplicate that.

**Hard cap:** LLM is instructed to stay under 150 words. If nothing new was observed, it compresses and returns the existing notes unchanged.

---

## Data Model

**`app/models/database_models.py` — `UserRecord`**

```python
@dataclass
class UserRecord:
    id: str
    name: str
    email: Optional[str] = None
    password_hash: Optional[str] = None
    learning_style: str = "Direct"
    reasoning_speed: str = "Moderate"
    analogy_pool: Optional[Any] = None
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None
    dob: Optional[datetime] = None
    grade: Optional[str] = None
    interests: Optional[str] = None
    persona_notes: Optional[str] = None
    # Populated from user_knowledge table at session init — not on users row
    prior_knowledge: dict = field(default_factory=dict)      # {subject_str: score 0-50}
    completed_courses: dict = field(default_factory=dict)    # {syllabus_id: (label, score 0-100)}
```

`knowledge_map` field removed. `prior_knowledge` and `completed_courses` are populated by a second DB call at session init — they are not columns on `users`.

---

## Migrations

```sql
-- migrations/add_persona_notes.sql  (already applied)
ALTER TABLE users ADD COLUMN persona_notes TEXT DEFAULT NULL;

-- migrations/add_user_knowledge.sql  (new)
CREATE TABLE user_knowledge (
    user_id    VARCHAR(36)               NOT NULL,
    type       ENUM('prior','completed') NOT NULL,
    ref_id     VARCHAR(255)              NOT NULL,
    label      VARCHAR(255)              NULL,
    score      TINYINT UNSIGNED          NOT NULL DEFAULT 0,
    updated_at TIMESTAMP                 DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, type, ref_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Drop the old JSON blob (run after user_knowledge table is live and backfill is done)
ALTER TABLE users DROP COLUMN knowledge_map;
```

Existing users start with zero rows in `user_knowledge` — treated as "no prior knowledge on record" by `_build_persona_context` (sections omitted from injected block until first curation or node advance).

---

## Implementation Plan

### Step 1 — DB migration

Apply `migrations/add_user_knowledge.sql`. Do **not** drop `knowledge_map` column yet — drop only after all code is live and verified.

### Step 2 — Data model

`app/models/database_models.py`:
- Remove `knowledge_map` field from `UserRecord`
- Add `prior_knowledge: dict` and `completed_courses: dict` fields (runtime-only, populated at session init)

### Step 3 — Repository methods

`app/repositories/persistence_repo.py` — add three methods:

| Method | SQL | Called by |
|---|---|---|
| `get_user_knowledge(user_id)` | `SELECT type, ref_id, label, score FROM user_knowledge WHERE user_id = %s` → builds `{"prior": {...}, "completed": {...}}` | Session init in `/ws/voice` |
| `upsert_prior_knowledge(user_id, subject, score)` | `INSERT ... ON DUPLICATE KEY UPDATE score = VALUES(score)` | `bootstrap_knowledge_map()` |
| `increment_completed_course(user_id, syllabus_id, label, delta)` | `INSERT ... ON DUPLICATE KEY UPDATE score = LEAST(score + VALUES(score), 100)` | `<advance_node/>` handler |

Also update `get_user()` and `get_user_by_email()` to remove `knowledge_map` from SELECT + `UserRecord` instantiation.

### Step 4 — Prompt

`app/prompts/prompts.py` — add `PERSONA_BOOTSTRAP_PROMPT`:
- Input: full curation conversation + subject being studied
- Instructs LLM to observe vocabulary, claimed knowledge, misconceptions
- Output: `<knowledge_map>[{"subject": "python", "score": 30}]</knowledge_map>` JSON array inside tags
- Hard rule: scores 0–50 max, only emit subjects evidenced in conversation

### Step 5 — Service method

`app/services/conversation_service.py` — add `bootstrap_knowledge_map()`:
```
async def bootstrap_knowledge_map(user_id, messages, subject, provider=None):
    → LLM call with PERSONA_BOOTSTRAP_PROMPT
    → parse <knowledge_map> tag → JSON array
    → for each entry: repo.upsert_prior_knowledge(user_id, entry["subject"], entry["score"])
```

### Step 6 — Curation handler

`app/main.py` `/ws/curation` — after syllabus UUID sent to client:
```python
asyncio.create_task(conv_service.bootstrap_knowledge_map(user_id, messages, subject))
```

### Step 7 — Session init

`app/main.py` `/ws/voice` — after `get_user()` call:
```python
if user_record:
    knowledge = conv_service.persistence_repo.get_user_knowledge(user_id)
    user_record.prior_knowledge = knowledge["prior"]
    user_record.completed_courses = knowledge["completed"]
```

Also compute `per_node_delta = math.floor(100 / TOTAL_NODES)` here and store in session scope.

### Step 8 — Advance handler

`app/main.py` `/ws/voice` at `<advance_node/>` detection — add after existing advance logic:
```python
if user_id and user_record:
    conv_service.persistence_repo.increment_completed_course(
        user_id, syllabus_id, syllabus_title, per_node_delta
    )
    cur = user_record.completed_courses.get(syllabus_id, (syllabus_title, 0))
    user_record.completed_courses[syllabus_id] = (cur[0], min(cur[1] + per_node_delta, 100))
```
No `asyncio.create_task` needed here — DB write is a single atomic INSERT, fast enough to call inline.

### Step 9 — `_build_persona_context`

`app/main.py` — update to read `prior_knowledge` and `completed_courses` instead of `knowledge_map`:
```
Prior exposure: Python (30/50), Algebra (45/50)
Completed courses: Python Basics (mastered), Data Structures (60% through)
```
"mastered" when score == 100. "X% through" otherwise.

### Step 10 — Drop old column

After verifying Step 1–9 in staging:
```sql
ALTER TABLE users DROP COLUMN knowledge_map;
```

---

## Onboarding Flow

### Current flow (as-built)

```
1. Registration form (AuthScreen.tsx)
   Fields collected: name, email, password, grade (optional), interests (optional)
   Missing from form: learning_style, dob (model supports dob but form has no field)
   → POST /api/auth/signup → create_user() → users table → JWT issued → Dashboard

2. Dashboard → user clicks "Start Course"
   Client sends initial WebSocket message: { topic, subject, user_persona: "<client string>" }
   → /ws/curation connects

3. Curation session
   Server fetches: CurationService.get_user_profile(user_id)
     Returns: name, grade, learning_style, interests, reasoning_speed
     Missing: persona_notes, prior_knowledge, completed_courses
   Voice interview runs (5-6 turns, same length regardless of user history)
   → <conclude_curation> detected
   → syllabus generated using client-supplied user_persona string (not DB-derived)
   → syllabus stored to DB
   → asyncio.create_task(bootstrap_knowledge_map(...))   ← fire-and-forget
   → final_syllabus sent to client

4. Knowledge bootstrap (background)
   bootstrap_knowledge_map() receives curation_history as List[str]
   format_history() expects List[Dict] with 'role' and 'input' keys  ← TYPE MISMATCH BUG
```

### Gaps identified

| # | Gap | Severity | Effect |
|---|---|---|---|
| G1 | `curation_history` is `List[str]` but `format_history()` expects `List[Dict]` | Bug | `bootstrap_knowledge_map` produces garbage or fails silently — prior knowledge never extracted |
| G2 | `user_persona` for syllabus generation is client-supplied string, not DB-derived | Correctness | Two persona representations exist in parallel; can diverge; client can send anything |
| G3 | `get_user_profile()` omits `persona_notes`, `prior_knowledge`, `completed_courses` | Missing context | Curation starts cold for returning users — wastes turns on already-known information |
| G4 | Curation interview length never adapts — always runs full 5-6 turns | Inefficiency | Returning users re-answer questions already captured in persona/knowledge |
| G5 | `learning_style` has no self-report path — defaults to `Direct` for all users | Missing data | One high-signal structured field never seeded; all users treated identically |

---

## Onboarding Optimizations — Implementation Plan

Continuing from Step 10 of the knowledge_map implementation plan above.

### Step 11 — Fix curation_history format (G1)

**File:** `app/routers/curation.py`

Change history accumulation from string list to dict list:
```python
# Before
curation_history.append(f"Tutor: {current_question}")
curation_history.append(f"Student: {transcribed_text}")

# After
curation_history.append({"role": "assistant", "input": current_question})
curation_history.append({"role": "user", "input": transcribed_text})
```

`bootstrap_knowledge_map()` already calls `self.format_history(messages)` — now receives correct format. No changes needed in ConversationService.

### Step 12 — Consolidate user_persona to server-side (G2)

**File:** `app/routers/curation.py` and `app/services/curation_service.py`

Remove `user_persona` from client-supplied initial message. Build it server-side from `user_profile_str` (already fetched). Pass to `generate_syllabus()` instead of the client string:

```python
# In curation_ws_handler — remove:
user_persona = initial_msg.get("user_persona", "A student")

# Replace generate_syllabus call:
syllabus_json = await curation_service.generate_syllabus(
    topic=topic,
    user_persona=user_profile_str,   # ← DB-derived, not client string
    subject=subject,
    conclusion_text=conclusion_text
)
```

### Step 13 — Feed full persona into curation (G3)

**File:** `app/services/curation_service.py` — `get_user_profile()`

Extend to fetch and include `persona_notes`, `prior_knowledge`, `completed_courses`:

```python
def get_user_profile(self, user_id: str) -> str:
    user_record = self.persistence_repo.get_user(user_id)
    if not user_record:
        return "No existing profile data."

    knowledge = self.persistence_repo.get_user_knowledge(user_id)

    lines = [
        f"Name: {user_record.name}",
        f"Grade: {user_record.grade or 'Unknown'}",
        f"Learning Style: {user_record.learning_style}",
        f"Interests: {user_record.interests or 'Not specified'}",
        f"Reasoning Speed: {user_record.reasoning_speed}",
    ]
    if knowledge["prior"]:
        prior = ", ".join(f"{k} ({v}/50)" for k, v in knowledge["prior"].items())
        lines.append(f"Prior subject familiarity: {prior}")
    if knowledge["completed"]:
        done = ", ".join(
            f"{v['label']} ({'mastered' if v['score'] == 100 else str(v['score']) + '%'})"
            for v in knowledge["completed"].values()
        )
        lines.append(f"Completed courses: {done}")
    if user_record.persona_notes:
        lines.append(f"Behavioral notes: {user_record.persona_notes}")
    return "\n".join(lines)
```

Requires `get_user_knowledge()` repo method (already planned in Step 3). Note: `get_user_knowledge()` returns `completed` values as dicts `{label, score}` — update Step 3 return format accordingly.

### Step 14 — Adapt curation depth for returning users (G4)

**File:** `app/prompts/curation.py` — `CURATION_SYSTEM_PROMPT`

Add a section that instructs the interviewer to use prior knowledge context:

```
### RETURNING USER ADAPTATION
If the student profile includes completed courses or prior subject familiarity:
- Do NOT re-ask about knowledge they have already demonstrated.
- Reference their completed work to calibrate starting depth ("Since you've done Python Basics, I'll assume you're comfortable with loops and functions — tell me how much you've worked with classes.").
- A student with completed courses and behavioral notes needs 2-3 turns, not 5-6.
- A first-time user with no history needs the full interview.
```

No code changes beyond the prompt string — the LLM reads the enriched `user_profile_str` from Step 13 and this instruction together.

### Step 15 — Add learning_style to registration (G5)

**File:** `frontend/src/app/components/AuthScreen.tsx`

Add a select field in the signup section after the interests field:

```tsx
{mode === "signup" && (
  <div className="auth-field auth-field-animate">
    <label htmlFor="auth-style" className="auth-label">
      How do you prefer to learn? <span className="auth-optional">(optional)</span>
    </label>
    <select
      id="auth-style"
      value={learningStyle}
      onChange={e => setLearningStyle(e.target.value)}
      className="auth-input"
    >
      <option value="">Select a style...</option>
      <option value="Direct">Direct — just explain it clearly</option>
      <option value="Socratic">Socratic — ask me questions, guide me</option>
      <option value="Example-first">Example-first — show me before explaining</option>
      <option value="Visual">Visual — use diagrams and analogies</option>
    </select>
  </div>
)}
```

**File:** `app/models/auth_models.py` — add `learning_style: Optional[str] = None` to `SignupRequest`

**File:** `app/services/auth_service.py` — pass `learning_style` to `create_user()`

**File:** `app/repositories/persistence_repo.py` — add `learning_style` to `create_user()` INSERT

**File:** `app/models/database_models.py` — `learning_style` already has a default; no change needed

---

### Onboarding optimization sequence

All five steps are independent. Recommended order: **G1 first** (it's a live bug), then G2, G3, G4 (build on each other), then G5 (isolated frontend change).

---

## What Is Not Here (Deferred)

- `analogy_pool` writes — nothing appends to this during sessions. Planned: `PERSONA_UPDATE_PROMPT` could extract resonant analogies into this structured field for queryability.
- Cross-user analytics — structured fields (`learning_style`, `grade`) are queryable via SQL. `persona_notes` is not — full-text or vector search needed for cohort queries.
