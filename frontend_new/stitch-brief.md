---
title: Maestro — Stitch AI Design Brief
version: 1.0
date: 2026-04-13
purpose: Hand-off document for generating landing page UI mockups in Stitch AI.
---

# Maestro — Stitch AI Design Brief

This brief is sized for Stitch AI prompts. The full specification is attached as an appendix ([design-doc.md](design-doc.md)). Use §3 below as the per-panel prompt set — generate panels individually, not as one mega-page.

---

## 1. The product in 200 words

**Maestro is a voice-first AI learning agent.** It teaches the way a brilliant tutor would — through real-time conversation — while simultaneously drawing on a shared canvas (mind maps, flowcharts, architecture diagrams) to externalize what's being discussed. You talk, it talks back, and visual scaffolding materializes alongside the dialogue.

**One sentence:** Maestro is what a 1-on-1 session with a world-class tutor feels like, reproduced through voice and live diagrams.

**Who it's for:** self-directed learners, graduate students, knowledge workers upskilling. People who are already motivated but lack structure, and who don't want to be spoon-fed — they want to understand.

**Positioning contrast:** Every other AI education product (Khanmigo, Speak, Synthesis) sells *efficiency* — "learn faster, skip the boring parts, let AI do the work." Maestro sells the opposite: **learn deeper.** The landing page must make this distinction unmistakable within 3 seconds.

**Three non-negotiables:**
1. **Voice is the primary interface**, not a bolted-on feature. Typing is a cognitive tax when learning.
2. **The canvas is a second speaker** — diagrams build in sync with narration, not as post-hoc summaries.
3. **Narrative pacing** — horizontal scroll, panel-by-panel, one beat at a time. The product and its marketing share a belief about how understanding is built.

**What it is NOT:** a chatbot with TTS bolted on, a course platform, a flashcard app, a lecture generator. Those all treat learning as content delivery. Maestro treats learning as a live, two-way, visually-grounded conversation.

---

## 2. Design system (hard constraints)

### 2.1 Visual feeling

> A late-night study session in a well-lit room, not a server dashboard.

Warm, intimate, focused. Most AI product pages use dark backgrounds with cold blues and neon accents. Maestro rejects this entirely.

### 2.2 Color palette

| Token | Hex | Usage |
|---|---|---|
| `background-primary` | `#1C1917` | Main page background. Warm dark, not pure black. |
| `background-panel` | `#292524` | Elevated panels, card surfaces |
| `text-primary` | `#FAFAF9` | Headings, primary body text |
| `text-secondary` | `#A8A29E` | Captions, labels, secondary info |
| `accent-primary` | `#D97706` | CTAs, active states, waveform peaks, highlights |
| `accent-glow` | `#F59E0B` | Glow effects, hover states |
| `accent-subtle` | `#FEF3C7` | Light amber for inline tags / code |
| `surface-muted` | `#44403C` | Borders, dividers, inactive elements |

**Absolutely no blues, purples, or greens.** The entire page lives in warm stone + amber.

### 2.3 Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Headings | Newsreader (serif) | 700 | 48–72px |
| Section labels | DM Mono | 400 | 12–14px all-caps letter-spaced |
| Body | Source Sans 3 | 400 | 17–18px |
| Annotation accents | Caveat (handwriting) | 400 | used sparingly |

Serif headings signal accumulated knowledge. Handwriting appears only as teacher-marked-up margin notes.

### 2.4 Animation principles

- **Breathing rhythm:** 4-second cycles. Tempo of focused thought, not a SaaS dashboard.
- **Ease-out in, ease-in out.**
- **One signature moment per page** — hero waveform + chaos-to-structure transition carry 80% of visual impact. Everything else restrained.
- **Scroll-driven, not time-driven.** User controls pace.

---

## 3. Panel-by-panel prompts for Stitch

Use each block below as a separate Stitch generation. Each prompt is self-contained: goal, layout, copy, visual cues.

### Panel 1 — The Hook

**Goal:** Stop the scroll. Core value in one line.

**Prompt:**
> Generate a landing page hero section, full viewport. Warm dark background (#1C1917). 90% negative space, center-aligned. Single serif headline (Newsreader, 64px, #FAFAF9): *"What if your AI actually taught you?"* Below, one subhead line in humanist sans (18px, #A8A29E): *"Maestro is a voice AI tutor that builds your understanding, not just your chat history."* Bottom 30% of panel: a horizontal ambient waveform visualization in amber gradient (#D97706 peaks fading to #F59E0B), gentle breathing sine curves, idle state. Bottom-right corner: small mono text "scroll to explore →" in #A8A29E. No other elements. No gradients on background. No shadows.

### Panel 2 — The Problem

**Goal:** Resonate with learner frustration. Visual chaos.

**Prompt:**
> Full-viewport panel, same warm dark background. Scatter 8 short text fragments across the canvas at random positions, with rotations between -15° and +15°, and opacities from 0.3 to 0.7. Fragments are quotes of learner frustration:
> - "I watched 40 hours of tutorials and still can't build anything"
> - "Every AI just gives me the answer without explaining why"
> - "I don't know what I don't know"
> - "I keep starting courses and never finishing"
> - "The docs assume I already understand everything"
> - "ChatGPT writes my code but I can't debug it myself"
> - "I memorized the syntax but don't understand the concepts"
> - "Nobody teaches the why, just the how"
>
> Sizes vary 14–24px, sans-serif, text in #A8A29E tones. Feel: overwhelming, noisy, unstructured. No heading, no framing — the chaos IS the message.

### Panel 3 — The Shift

**Goal:** "Aha" moment. Chaos resolves into structure.

**Prompt:**
> Same panel, but now the scattered fragments have collapsed into a clean structured syllabus. A warm amber accent line (#D97706, 2px) runs down the left edge like a notebook margin. Serif heading at top (40px, #FAFAF9): *"Maestro doesn't give you answers. It builds your understanding."* Below, numbered syllabus items — topics (18px bold) with indented subtopics (16px regular) connected by thin amber lines showing dependencies. Left-aligned. Feels like a textbook table of contents but alive. Warm dark background.

### Panel 4 — The Live Lesson

**Goal:** Show, don't tell. Demonstrate a Maestro session.

**Prompt:**
> Split-panel demo. Top-left: small mono label "LIVE LESSON" in #A8A29E. Warm dark background #1C1917.
>
> **Left column (35%):** Serif heading (38px, #FAFAF9): *"Watch Maestro teach."* Subline (15px, #A8A29E): "The diagram builds as Maestro explains each layer." A pill-shaped input field showing the learner's question as readonly text: *"Teach me how convolutional neural networks work."* Below: active-state waveform in amber, more energetic than hero. Below: thin progress bar (3px, amber fill on stone-700 track), mono timecode "0:00 / 0:52", and 6 small section dots (amber when active, stone when not).
>
> **Right column (65%):** A whiteboard-style canvas with subtle inner shadow and stone-800 background, 16px rounded corners. Inside: a horizontal architecture diagram of a CNN — Input (28×28×1) → Conv_1 → Max-Pool → Conv_2 → Max-Pool → Flattened → fc_3 → fc_4 → Output (10 classes). Nodes are stone-muted blocks with subtle amber glow on active ones. Stepped connection lines. Small brackets below some nodes labeling channel counts. Top-right corner: tiny mono label "WHITEBOARD" at 30% opacity. Zoom controls (− 100% +) top-left as small circular buttons. A compact legend row below the whiteboard: "Input/Output", "Feature maps", "Operation", "Fully connected".

### Panel 5 — The Visual Craft

**Goal:** Show the range of visual aids Maestro generates.

**Prompt:**
> Full-panel showcase. Serif heading (40px, #FAFAF9): *"Your tutor draws on the whiteboard while it teaches."* Below: 6 artifact cards in a loose, overlapping grid with slight rotations (2–3° each). Each card is a stone-800 surface with thin stone-700 border, 12px radius, 16px padding. Cards contain:
> 1. **Mind map** — central node, radiating branches with amber glow
> 2. **Flowchart** — decision diamonds + process rectangles
> 3. **Annotated diagram** — technical schematic with labels
> 4. **Concept comparison table** — two columns with highlights
> 5. **Dependency tree** — hierarchical prerequisite graph
> 6. **Timeline** — horizontal progression with milestones
>
> Below each card, a small mono label at 12px in #A8A29E: "MIND MAP", "FLOWCHART", etc. Overall feeling: a teacher's notebook fanned out across a desk.

### Panel 6 — The Philosophy

**Goal:** Anti-outsourcing position, clearly stated.

**Prompt:**
> Full-panel text block. Left-aligned with generous 20% margins. Top-left mono label: "PHILOSOPHY". Three principles stacked vertically with 80px spacing. Each principle has a serif heading (36px, #FAFAF9) and a sans body (17px, #A8A29E).
>
> 1. *"Maestro asks before it tells."* — "Your AI asks probing questions, waits for you to reason, then builds on your answer. Understanding is active, not passive." Draw a hand-drawn amber circle (Caveat-handwriting style) around the word "asks".
> 2. *"Understanding is the metric, not completion."* — "Maestro doesn't track how many lessons you've clicked through. It tracks whether you can explain what you've learned." Draw an amber underline under the word "Understanding".
> 3. *"Your brain is the product."* — "In a world where every AI tool outsources your thinking, Maestro is the tool that makes your thinking sharper." Highlight "Your brain" with a soft amber background swipe.
>
> Annotations look hand-drawn, slightly wobbly, like a teacher marked up the page in amber marker.

### Panel 7 — Social Proof

**Goal:** Credibility via real learning outcomes.

**Prompt:**
> Three testimonial cards arranged horizontally with comfortable spacing. Each card: stone-800 background, 12px rounded corners, 24px padding. Contents:
> - Quote (17px, #FAFAF9): the learning outcome in the person's words
> - Attribution (14px, #A8A29E): name, role, what they learned
> - **Syllabus thumbnail**: miniature non-interactive rendering of the custom syllabus Maestro built for them — 6–8 topic titles with thin connecting lines
>
> Example quote: *"Three weeks ago I couldn't read a research paper. Maestro built me a custom path from linear algebra through backprop to attention mechanisms. I just implemented a transformer from scratch." — Priya K., self-taught ML engineer*
>
> Top-left mono label: "OUTCOMES". Clean, content-focused, no canvas effects.

### Panel 8 — CTA

**Goal:** Convert. One action.

**Prompt:**
> Full-panel closer. The hero waveform returns, now in active mode — elevated amplitude, alive, in amber (#D97706). Spans middle 40% of panel height.
>
> Above the waveform, centered (serif, 56px, #FAFAF9): *"Start your first lesson."*
>
> Below the waveform, a single large CTA button: text "Begin →", #D97706 fill, #1C1917 text, 18px font, 16px vertical padding, 48px horizontal padding, 8px radius. Hover state glows #F59E0B with subtle scale(1.02).
>
> Below the button, small link (14px, #A8A29E): "Or see how it works" — scrolls back to Panel 4.

---

## 4. Language constraints

Give Stitch these lists so it doesn't default to generic AI SaaS copy.

### ✅ Words to use

Understand · Master · Build intuition · Think clearly · Go deeper · Reason through · Strengthen · Your pace · Your path · Focus · Depth · Structure · Clarity · Genuine understanding

### ❌ Words to avoid

10× · Supercharge · Unlock · Automate · Effortless · Hack · Instant · Skip · Outsource · Let AI do it for you · Crush it · Level up · Grind · Game-changing · Revolutionary

### Tone

Confident but not arrogant. Patient but not patronizing. A knowledgeable friend who happens to be a great teacher — not a corporate brand selling a subscription. Second person. Short sentences. No jargon. Never use exclamation marks in headlines.

---

## 5. Reference images to attach in Stitch

- **Screenshots of current implementation**: run `bun dev` and capture each of the 8 panels at 1440×900. These anchor Stitch to what already exists rather than starting blank.
- **Positive references** (for "warm dark + serif + restraint"): Stripe's docs, Linear's changelog pages, Vercel's blog, Are.na.
- **Counter-references** (what to reject): generic AI SaaS landing pages with cyan/purple gradients, glowy neon, "supercharge" copy.

---

## 6. Workflow — Stitch as design stage, Claude Code as execution stage

Based on the separation-of-concerns workflow: **Stitch owns design intent, Claude Code owns technical execution.** Do not ask either tool to do the other's job.

### Stage 1 — Gather inspiration *before* opening Stitch

Don't start Stitch from a blank prompt. First, collect:
- 6–10 hero-section references from Dribbble / Mobbin / Godly that match "warm dark + serif + restraint"
- 2–3 typography specimens showing serif-heading + sans-body pairings (Newsreader-adjacent)
- 2–3 diagram/whiteboard UI references for Panel 4 (e.g., tldraw, Excalidraw, Observable notebooks)
- 2–3 counter-references to explicitly reject (generic purple-gradient AI SaaS pages)

Save these as an `inspiration/` folder. You'll attach them inside Stitch.

### Stage 2 — Build the design in Stitch 2.0 (target: 80–90% complete)

1. **Don't paste the whole brief at once.** Stitch degrades on long prompts.
2. **One panel per Stitch thread.** Use the prompts in §3 individually.
3. **Paste §2 (design system) as preamble** in each thread — color tokens, type scale, animation principles. This is the "design system lock."
4. **Attach inspiration images + the current panel screenshot** as references.
5. **Iterate on the visual canvas, not the code.** Stitch's value is the layout feedback loop — use its canvas to refine spacing, hierarchy, corner radii, font pairings. Screenshot the output, mark it up, feed it back.
6. **Iterate in order:** layout → color/type → copy. If a generation strays into cold blues or "supercharge" language, regenerate rather than patching.
7. **Reject scope creep.** If Stitch adds "trusted by" logos, feature grids, extra CTAs, or newsletter signups — reject. Minimalism is the design.
8. **Stop at 80–90%.** Don't try to nail pixel perfection in Stitch. The last 10–20% happens in code.

### Stage 3 — Export to Claude Code with a locked design contract

When a panel's Stitch design is approved, move it to implementation. Add or update a `CLAUDE.md` at the repo root containing:

```markdown
# Maestro Landing — Implementation Rules

You are a senior UI engineer implementing a finalized design. You do NOT redesign.

## Design language — preserve exactly
- Colors: only the tokens in src/styles/global.css. Never introduce blues, purples, greens, or gradients not in the spec.
- Type: Newsreader (serif headings), Source Sans 3 (body), DM Mono (labels), Caveat (annotations). No other fonts.
- Spacing/radii: match the imported Stitch design. Tailwind utilities, not inline styles.
- Animation: 4s breathing rhythm, ease-out entrances, scroll-driven. No spring/bounce.

## Stack
- Astro 5 + Tailwind v4. No shadcn, no MUI, no component library.
- Effects via the local `maestro-effects` package only.
- Keep components in src/components/PanelNXxx.astro — one file per panel.

## What NOT to do
- Do not add features the Stitch design doesn't show.
- Do not "improve" copy. Word choice is locked by stitch-brief.md §4.
- Do not add loading spinners, toast notifications, or form validation UI.
- Do not introduce new dependencies without asking.
```

Then, for each panel: paste the Stitch screenshot + HTML export into Claude Code and say *"implement this in [src/components/PanelN…astro](src/components/), preserving the design language from CLAUDE.md."*

### Stage 4 — Polish and integrate

Once all 8 panels match their Stitch designs:
- Add subtle depth (grain texture on `background-primary`, soft inner shadows on panels)
- Wire up motion via `maestro-effects` (waveform, scroll organizer, diagram drawer)
- Integrate real audio clip for Panel 4
- Ship to Vercel via the existing Astro static export
- Lighthouse audit against the §6.1 performance budget in [design-doc.md](design-doc.md)

---

## Appendix A — Full design document

See [design-doc.md](design-doc.md) in this repo for the complete v1.0 specification including technical stack, performance budget, accessibility requirements, and build approach.

## Appendix B — Current implementation entrypoints

- [src/pages/index.astro](src/pages/index.astro) — horizontal scroll controller, panel orchestration
- [src/components/](src/components/) — the 8 panel Astro components
- [src/styles/global.css](src/styles/global.css) — token definitions
