# JOBRADAR — Search less. Find better.

A precision-first job-search meta-indexer. Instead of blasting you with volume,
JOBRADAR indexes original postings (ATS + company career pages), deduplicates
them aggressively, and matches them against your profile with **hard filters**
(eliminate) vs **soft filters** (boost score) — every score fully explainable.

> **Demo mode.** This build ships with `DEMO DATA`: 72 realistic sample listings
> across 28 sources. Connect real sources in **Admin → Sources** to go live.

## Quick start

```bash
npm install
npm run dev        # development server
npm run build      # production build → dist/
npx vite preview   # serve the production build (SPA fallback included)
```

No backend. All state (searches, saved jobs, applications, admin config) lives in
`localStorage`.

## The required flow (all verified in headless Chromium)

`CREATE SEARCH → RUN SEARCH → FILTER → OPEN JOB → SAVE JOB → APPLY →
RETURN → MARK AS APPLIED → RUN SEARCH AGAIN → SEE ONLY NEW JOBS`

- **Create search**: natural-language box on Home (“Finance Manager jobs in
  Europe requiring English”) with a *“Here’s what I understood”* panel, or the
  visual **Search Builder** (`/search#builder`) with per-block Hard/Soft toggles.
- **Run search**: staged pipeline animation
  `SOURCE DISCOVERY → INGESTION → NORMALIZATION → CLASSIFICATION →
  DEDUPLICATION → EXPIRATION → FILTERING → MATCHING → SCORING → SORTING`,
  with a **Diagnostics** panel showing per-stage counts.
- **Filter**: quick filters (min match %, date, remote, salary floor, sources),
  new-since-last-search, sorting, and the full builder.
- **Open job**: detail page with match ring, explainable score trace, languages,
  visa/relocation (never invented — only what the posting states), and
  **Source & verification** (ATS, posted/discovered dates, source-quality bar,
  “Also found on N other sources”).
- **Apply**: always opens the **original posting in a new tab**. JOBRADAR never
  pretends to submit applications for you.
- **Save / Mark as applied**: saved jobs persist; the Applications page is a
  Kanban (drag & drop) from *Saved → Applied → Interview → Offer*.

## Matching engine (`src/lib/`)

| Module | Responsibility |
|---|---|
| `types.ts` | `Job`, `SearchProfile`, `HardFilterKey` (now includes `title`) |
| `taxonomies.ts` | Titles, skills, industries, seniority, work models |
| `synonyms.ts` | Occupation graph: variants, related, **excluded meanings** (e.g. *Credit Controller* ≠ *Financial Controller*) |
| `normalize.ts` | Title/company normalization, fuzzy title similarity |
| `dedup.ts` | Duplicate groups (threshold 72), canonical = most original source |
| `match.ts` | Hard-filter failures + explainable soft scoring |
| `nlparse.ts` | Natural-language → `SearchProfile` (+ warnings for unrecognized terms) |
| `searchEngine.ts` | Full pipeline, empty-state relaxation hints, diagnostics |

### Hard vs soft (the core differentiator)

- **Hard** filters *eliminate*: required languages, title (similarity ≥ 0.45,
  excluded meanings score 0), salary floor (**undisclosed salaries fail** —
  never invented), location, remote, visa, date, seniority.
- **Soft** filters only move the 0–100 match score; the trace shows every check.

## Verification status (2026-10-01, headless Chromium, zero console errors)

- NL search → understood panel → 16–60 results depending on query
- Re-run marks previously seen jobs; “Only new since last search” toggle
- Dedup: 8 deliberate clusters merge (Siemens ×3 → 1 card + “Also found on 2
  other sources”); distinct same-company roles stay separate
- Required English excludes 100% of jobs lacking it; preferred Spanish only boosts
- Hard title “Financial Controller”: 7 results, 0 excluded-meaning titles
  (Credit/Document/Project/Traffic Controller), 53 hard-rejected
- Hard salary €100k: 19 results, 0 undisclosed salaries pass
- Closed jobs hidden by default; `MAY_BE_CLOSED` shown with badge
- Empty state offers honest relaxation hints (“Lower minimum match to 70%”,
  gain counts respect the current score floor); **Apply** on a hint unlocks jobs
- Mobile 390×844 renders cleanly; no horizontal overflow

### Known gaps / future work

- UI primitives are custom shadcn-*style* components; the official shadcn
  `components.json` metadata was not added.
- Main bundle ~967 kB (271 kB gzip) — route-level `React.lazy` code splitting
  recommended before production.
- NL parser drops terms outside its taxonomies (e.g. “Klingon”, “Antarctica”);
  it warns in the understood panel but cannot match what it doesn't know.
- Search state is in-memory; a page reload clears results (saved searches persist).
