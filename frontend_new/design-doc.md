# Maestro

**Landing Page Design Document · v1.0 · April 2026**

*Design specification for the interactive voice AI tutor landing page.*

---

## 1. Product & Audience

### 1.1 What Maestro Is

Maestro is an interactive voice AI agent that teaches. Not the way most AI tools work today, where they give you an answer and move on. Maestro crafts a structured syllabus around what you want to learn, then walks you through it topic by topic, lecture by lecture, in real-time conversation. It asks you questions, gauges your understanding, generates visual aids like mind maps, flowcharts, and diagrams on the fly, and adjusts its approach based on how you respond.

The core belief: AI should strengthen the human brain, not outsource it. Maestro exists to make you smarter, not to do the thinking for you.

### 1.2 Target Audience

- **Self-directed learners:** People who are already motivated but lack structure. Self-taught developers picking up new domains, career switchers, curious professionals going deep on unfamiliar topics.
- **Graduate and advanced students:** People who need to synthesize complex material and want a patient, adaptive tutor that can go at their pace.
- **Knowledge workers upskilling:** Engineers learning adjacent fields, managers studying technical domains, researchers crossing disciplines.

These people share a trait: they don't want to be spoon-fed. They want to understand. The landing page must respect their intelligence while making it viscerally clear that Maestro is a different kind of AI tool.

### 1.3 Positioning Against the Market

Every other AI education product (Khanmigo, Speak, Synthesis) positions around efficiency: learn faster, skip the boring parts, let AI do the work. Maestro's positioning is the opposite: learn deeper. The landing page must make this distinction unmistakable within the first 3 seconds of viewing.

---

## 2. Design Philosophy

### 2.1 Warm, Not Cold

Most AI product pages use dark backgrounds with cold blues and neon accents, signaling speed, automation, infrastructure. Maestro signals something different: intimacy, focus, depth. The visual feeling is a late-night study session in a well-lit room, not a server dashboard.

### 2.2 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `background-primary` | `#1C1917` (stone-900) | Main page background. Warm dark, not pure black. |
| `background-panel` | `#292524` (stone-800) | Elevated panels and card surfaces |
| `text-primary` | `#FAFAF9` (stone-50) | Headings and primary body text |
| `text-secondary` | `#A8A29E` (stone-400) | Captions, labels, secondary information |
| `accent-primary` | `#D97706` (amber-600) | CTAs, active states, waveform peaks, annotation highlights |
| `accent-glow` | `#F59E0B` (amber-500) | Glow effects, hover states, emphasis |
| `accent-subtle` | `#FEF3C7` (amber-100) | Light amber for backgrounds of inline code or tags |
| `surface-muted` | `#44403C` (stone-700) | Borders, dividers, inactive elements |

No blues, no purples, no greens. The entire page lives in the warm stone and amber family. This creates immediate visual differentiation from every other AI landing page.

### 2.3 Typography

| Role | Font | Weight | Size | Notes |
|---|---|---|---|---|
| Page headings | Newsreader / Freight Display | 700 | 48–72px | Serif with authority. Feels like a textbook chapter title. |
| Section labels | DM Mono or JetBrains Mono | 400 | 12–14px | All-caps, letter-spaced. Labels like `SYLLABUS`, `PHILOSOPHY`. |
| Body text | Source Sans 3 / IBM Plex Sans | 400 | 17–18px | Humanist sans. Warm, readable at length. |
| Annotation accents | Caveat or Kalam | 400 | Varies | Handwriting font for margin-note-style highlights. Used sparingly. |

The serif-for-headings, sans-for-body pairing is deliberate. It signals accumulated knowledge at the heading level while maintaining clean readability in body content. The handwriting font appears only in annotation moments, as if a teacher marked up the page.

### 2.4 Animation Principles

- **Breathing rhythm:** Primary animations cycle on 4-second periods. This is the tempo of focused thought, not the frantic pace of a SaaS dashboard.
- **Ease-out entrances, ease-in exits:** Elements arrive by decelerating (like settling into place). Elements leave by accelerating away (like releasing).
- **One signature moment:** The hero waveform and the chaos-to-structure scroll transition carry 80% of the page's visual impact. Everything else is restrained.
- **Scroll-driven, not time-driven:** Animations are tied to scroll position via `maestro-effects`. The user controls the pace, just as they would in a real learning experience.

---

## 3. Page Structure

### 3.1 Layout: Horizontal Scroll

The page scrolls horizontally when the user scrolls vertically. This is the defining structural choice. It reinforces the "journey" metaphor: you move forward through the page like turning pages in a book or progressing through a lesson. The implementation is powered by `createHorizontalScroll` from `maestro-effects`.

#### Fixed Header

Minimal. Persistent. Pinned to the top of the viewport at `z-index: 100`.

- **Left:** Logo — the wordmark "Maestro" set in the serif heading font (Newsreader), regular weight, `text-primary` color.
- **Center/Right:** Two to three nav links: `How It Works`, `Pricing`, `Blog`. Set in body sans, `text-secondary` color, no underlines. Hover: `text-primary`.
- **Far right:** Single CTA button — "Start Learning" with `accent-primary` background, `background-primary` text, subtle rounded corners (6px).
- **Height:** 56–64px.
- **Background:** `background-primary` at 85% opacity with `backdrop-filter: blur(12px)`. Horizontal content is faintly visible behind it during scroll.
- **Bottom border:** 1px `surface-muted`, barely visible.

#### Fixed Footer

One line. Small. Pinned to the bottom of the viewport at `z-index: 100`.

- **Left:** `© 2026 Maestro` in `text-secondary`, 13px.
- **Right:** Three links: `Privacy · Terms · @maestro`. Same `text-secondary` styling.
- **Height:** 40–48px maximum. This footer does NOT expand, does NOT contain sitemap grids, does NOT have newsletter signups, does NOT have a logo repeat. It is minimal by design.
- **Background:** Same treatment as header — 85% opacity + backdrop-blur.
- **Top border:** 1px `surface-muted`.

#### Scroll Container

Fills the viewport between header and footer:

```css
.scroll-container {
  position: fixed;
  top: var(--maestro-header-h);
  left: 0;
  width: 100vw;
  height: calc(100vh - var(--maestro-header-h) - var(--maestro-footer-h));
  overflow: hidden;
  display: flex;
}
```

Each panel is `width: 100vw` and `height: 100%` within this container.

#### Mobile Adaptation

Below 768px: horizontal scroll disables, panels stack vertically with native scroll, header collapses to logo + hamburger menu, footer remains unchanged, all `maestro-effects` still fire via IntersectionObserver fallback.

---

### 3.2 Panel Specifications

---

#### Panel 1 — The Hook

**Goal:** Stop the scroll. Communicate the core value in one line.

**Layout:** 90% negative space. Center-aligned vertically and horizontally. Single headline in large serif (Newsreader, 64px, `text-primary`):

> *"What if your AI actually taught you?"*

Below: a single-line subhead in body sans (18px, `text-secondary`):

> *"Maestro is a voice AI tutor that builds your understanding, not just your chat history."*

Below that: the waveform canvas visualization in idle mode, spanning roughly the bottom 30% of the panel width. A subtle "scroll to explore →" indicator at the far right edge in `text-secondary`, 13px, with a slow fade-pulse animation (opacity 0.4 ↔ 0.8, 3s cycle).

**Effects:** `createWaveformVisualizer` in `idle` mode. Gentle breathing sine waves in amber/gold. Mouse parallax on the entire waveform.

---

#### Panel 2 — The Problem

**Goal:** Create resonance. Show the learner's current frustration.

**Layout:** Text fragments scattered across the panel at random positions, rotations (−15° to +15°), and opacities (0.3–0.7). Fragments include real learner frustrations:

- "I watched 40 hours of tutorials and still can't build anything"
- "Every AI just gives me the answer without explaining why"
- "I don't know what I don't know"
- "I keep starting courses and never finishing"
- "The docs assume I already understand everything"
- "ChatGPT writes my code but I can't debug it myself"
- "I memorized the syntax but I don't understand the concepts"
- "Nobody teaches the *why*, just the *how*"

Set in body sans at varying sizes (14–24px), `text-secondary` tones. Some fragments are slightly bolder, some more faded. The overall impression is visual noise, overwhelm, chaos. Some fragments have slight parallax depth for dimensionality.

**Effects:** `createScrollOrganizer` at progress 0 (fully scattered).

---

#### Panel 3 — The Shift

**Goal:** The "aha" moment. Chaos resolves into structure.

**Layout:** As the user scrolls from Panel 2 into Panel 3, the scattered fragments collapse, re-align, and settle into a clean structured syllabus layout. The fragments literally become syllabus items: numbered topics, indented subtopics, connected by thin amber lines showing dependencies. A heading appears at the top (serif, 40px):

> *"Maestro doesn't give you answers. It builds your understanding."*

The organized state has a warm amber accent line (2px) down the left edge of the syllabus, like a notebook margin. Syllabus items are in body sans, left-aligned, with clear hierarchy (topic at 18px bold, subtopic at 16px regular, indented).

**Effects:** `createScrollOrganizer` resolving from progress 0 to 1 across the Panel 2→3 boundary. Each fragment animates independently with stagger. The last 20% of progress uses a stronger ease-out for a satisfying snap-into-place.

---

#### Panel 4 — The Live Lesson

**Goal:** Show, don't tell. Demonstrate what a Maestro session feels like.

**Layout:** Split into two zones.

**Left zone (40%):** The waveform visualizer in active mode occupying the top portion. Below it, an embedded audio player — minimal, custom-styled: a play/pause circle button in `accent-primary`, a thin progress bar in `surface-muted` with `accent-primary` fill, and a duration label in mono (e.g., `0:00 / 0:52`). The visitor can tap play to hear a 45–60 second clip of Maestro actually teaching a concept.

**Right zone (60%):** A mind map / flowchart that draws itself in real time. When the audio plays, nodes appear in sync with the narration. When paused or before playback, the mind map is either empty (pre-play) or frozen at its current state. Labels on nodes match the concepts being taught in the audio. Connections draw themselves as bezier curves. A subtle amber glow pulses on each newly drawn node.

**Section label** (mono, 12px, `text-secondary`, all-caps, top-left of panel): `LIVE LESSON`

**Effects:** `createWaveformVisualizer` in active mode, connected to audio via `reactToAudio`. `createMindMapDrawer` with node appearance timed to audio timestamps via `onNodeDrawn` callbacks. If no audio is playing and the user simply scrolls through, the mind map draws itself at scroll speed instead.

---

#### Panel 5 — The Visual Craft

**Goal:** Showcase the range of visual aids Maestro creates during lessons.

**Layout:** Section heading in serif (40px): *"Your tutor draws on the whiteboard while it teaches."* Below, a staggered showcase of 5–6 visual artifact cards arranged in a loose, overlapping grid with slight rotations (2–3°). Each card is a `background-panel` surface with a thin `surface-muted` border and 16px padding. Cards contain:

1. **Mind map** — nodes gently pulsing with amber glow, connections visible
2. **Flowchart** — decision diamonds and process rectangles, connections drawing themselves in a loop
3. **Annotated diagram** — a technical diagram with labels fading in one by one
4. **Concept comparison table** — two-column layout with highlights on key differences
5. **Dependency tree** — hierarchical layout showing prerequisite relationships
6. **Timeline** — horizontal progression with milestone markers

Each card has a small label beneath it in mono (12px, `text-secondary`): `MIND MAP`, `FLOWCHART`, etc.

**Effects:** `createAnnotationHighlight` with underline style on the section heading, drawing as the panel enters view.

---

#### Panel 6 — The Philosophy

**Goal:** Articulate the anti-outsourcing position clearly and boldly.

**Layout:** Full-panel text block, centered vertically, left-aligned with generous margins (20% padding on each side). Three principles stacked vertically with 80px spacing between them.

**Principle 1:**
Heading (serif, 36px, `text-primary`): *"Maestro asks before it tells."*
Body (sans, 17px, `text-secondary`): "Your AI asks probing questions, waits for you to reason, then builds on your answer. Understanding is active, not passive."

**Principle 2:**
Heading: *"Understanding is the metric, not completion."*
Body: "Maestro doesn't track how many lessons you've clicked through. It tracks whether you can explain what you've learned."

**Principle 3:**
Heading: *"Your brain is the product."*
Body: "In a world where every AI tool outsources your thinking, Maestro is the tool that makes your thinking sharper."

**Section label** (mono, 12px, top-left): `PHILOSOPHY`

**Effects:** `createAnnotationHighlight` — circles the word "asks" in principle 1, underlines "Understanding" in principle 2, highlights "Your brain" in principle 3. Each annotation draws sequentially as the user scrolls through, with 200ms stagger between them.

---

#### Panel 7 — Social Proof

**Goal:** Build credibility through real learning outcomes.

**Layout:** 2–3 featured testimonials arranged horizontally with comfortable spacing. Each testimonial card (`background-panel`, rounded corners 12px) contains:

- **Quote** (sans, 17px, `text-primary`): The learning outcome in the person's words.
- **Attribution** (sans, 14px, `text-secondary`): Name, role, what they learned.
- **Syllabus thumbnail:** A miniature, non-interactive rendering of the actual syllabus Maestro generated for them. Shows 6–8 topic titles with connecting lines. This is social proof that doubles as a product demo.

Example testimonial:
> "Three weeks ago I couldn't read a research paper. Maestro built me a custom path from linear algebra through backprop to attention mechanisms. I just implemented a transformer from scratch."
> — *Priya K., self-taught ML engineer*

**Section label** (mono, 12px, top-left): `OUTCOMES`

**Effects:** None. Clean, content-focused. Subtle CSS `opacity: 0 → 1` + `translateY(12px) → 0` on scroll entry only. No canvas effects — the content speaks for itself.

---

#### Panel 8 — CTA

**Goal:** Convert. One clear action.

**Layout:** The waveform from Panel 1 returns, now in active mode — alive, energetic, waiting. It spans the middle 40% of the panel height. Above it, centered (serif, 56px, `text-primary`):

> *"Start your first lesson."*

Below the waveform: a single large CTA button — "Begin →" in `accent-primary` fill, `background-primary` text, 18px font, 16px vertical padding, 48px horizontal padding, 8px border-radius. Subtle hover: `accent-glow` background, slight scale(1.02).

Secondary text link below the button (sans, 14px, `text-secondary`): "Or see how it works" — scrolls back to Panel 4.

**Effects:** `createWaveformVisualizer` in active mode with slightly elevated amplitude (0.8 instead of default 0.6), signaling readiness and energy.

---

## 4. Language & Voice

### 4.1 Words to Use

Understand. Master. Build intuition. Think clearly. Go deeper. Reason through. Strengthen. Your pace. Your path. Focus. Depth. Structure. Clarity. Genuine understanding.

### 4.2 Words to Avoid

10×. Supercharge. Unlock. Automate. Effortless. Hack. Instant. Skip. Outsource. Let AI do it for you. Crush it. Level up. Grind. Game-changing. Revolutionary.

### 4.3 Tone

Confident but not arrogant. Patient but not patronizing. The voice is a knowledgeable friend who happens to be a great teacher — not a corporate brand selling you a subscription. Write in second person. Short sentences. No jargon unless the audience would naturally use it. Never use exclamation marks in headlines.

---

## 5. Component Inventory

| Component | Instances | Notes |
|---|---|---|
| Fixed Header | 1 (persistent) | Logo, 2–3 nav links, CTA. 56–64px. backdrop-blur. |
| Fixed Footer | 1 (persistent) | Copyright + 2–3 links. 40–48px max. backdrop-blur. |
| Panel Container | 1 | Horizontal flex wrapper. 8 child panels. |
| Waveform Canvas | 3 instances | Panels 1, 4, 8. Shared component, different `mode` prop. |
| Scatter/Organize Group | 1 | Panels 2–3. 8–12 text fragment elements. |
| Mind Map Canvas | 1 | Panel 4. Hybrid canvas + SVG. |
| Audio Player | 1 | Panel 4. Custom minimal player. |
| Artifact Card | 5–6 | Panel 5. Static/animated visual aid previews. |
| Philosophy Block | 3 | Panel 6. Large text with annotation overlay. |
| Testimonial Card | 2–3 | Panel 7. Quote + syllabus thumbnail. |
| CTA Button | 3 | Header, Panel 1 (secondary), Panel 8 (primary). |

---

## 6. Technical Stack

- **Framework:** Next.js 15 (App Router) or Astro 5. Static export for the landing page; no SSR needed.
- **Styling:** Tailwind CSS v4 with a custom theme extending the stone + amber palette. No component library (no shadcn, no MUI). Hand-crafted components only.
- **Effects:** `maestro-effects` (self-built, see companion design doc). Zero-dependency canvas/SVG library.
- **Fonts:** Self-hosted via `next/font` or `@fontsource`. Newsreader (serif headings), Source Sans 3 (body), DM Mono (labels), Caveat (annotation accents).
- **Audio:** HTML5 Audio element for the demo clip. `maestro-effects` waveform connected via Web Audio API / MediaStream.
- **Deployment:** Vercel or Cloudflare Pages. Static assets on CDN.
- **Target:** Lighthouse 95+ on all four categories.

### 6.1 Performance Budget

| Asset | Budget | Notes |
|---|---|---|
| HTML + CSS + JS (gzip) | < 120 KB | Includes maestro-effects, Tailwind utilities, page logic |
| Fonts (woff2) | < 80 KB | Four font families, subset to Latin + common glyphs |
| Audio demo clip | < 500 KB | Opus codec, mono, 48kbps. Lazy-loaded on Panel 4 entry. |
| Images | < 200 KB total | Minimal. Testimonial avatars (WebP, 64px). Syllabus thumbnails (SVG). |
| Total page weight | < 900 KB | Before lazy-loaded assets |

---

## 7. Build Approach

Following the Dhravya/Supermemory playbook: front-load taste into tooling, then let Claude Code execute.

1. **Build `maestro-effects` as a standalone npm package first.** Test each effect in isolation with a Storybook-like playground. Nail the waveform and scroll organizer before anything else.
2. **Write a Claude Code SKILL.md** that encodes every design decision in this document: the color tokens, typography rules, animation principles, vocabulary constraints, and philosophical framing. This skill file is the taste layer.
3. **Write all panel copy in a plain Markdown file** before touching any code. The story arc (confusion → structure → mastery) must work as text before it gets visual polish.
4. **Scaffold the page with Claude Code** using the skill. Horizontal scroll first, then panel content, then effects integration.
5. **Polish pass:** Hand-tune animation timings, check mobile fallback, audit accessibility (keyboard navigation, reduced motion via `prefers-reduced-motion`, screen reader panel announcements via `aria-label`).

Target: landing page complete in one focused build session (4–6 hours) once `maestro-effects` and the skill file are ready.

---

## 8. Accessibility

- **Reduced motion:** All `maestro-effects` check `prefers-reduced-motion`. When enabled: waveform renders static, scroll organizer shows final state, mind map shows complete state, annotations appear without draw animation.
- **Keyboard navigation:** `createHorizontalScroll` supports arrow keys. Each panel is a landmark with `role="region"` and `aria-label`.
- **Screen readers:** Panel transitions announce via `aria-live="polite"` region. Waveform and mind map canvases have descriptive `aria-label` attributes.
- **Focus management:** Tab order follows panel sequence. CTA buttons are reachable without scrolling through decorative content.
- **Color contrast:** `text-primary` on `background-primary` = 15.4:1 ratio. `text-secondary` on `background-primary` = 6.2:1 ratio. `accent-primary` on `background-primary` = 5.8:1 ratio. All exceed WCAG AA.