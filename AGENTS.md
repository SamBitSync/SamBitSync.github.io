# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Academic zettelkasten / portfolio site for Sambit, a cognitive science research intern in Kathmandu. Built with Astro as a static site. The site organizes knowledge across four content collections: Maps (cross-domain synthesis), Meta (epistemological frameworks), Process (lab notebook entries), and Project (completed research outputs).

## Commands

```bash
npm run dev        # Start dev server (localhost:4321)
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

If content collections fail to load (empty collection errors), clear the cache:
```bash
rm -rf .astro && npm run dev
```

There are no tests or linting configured.

## Architecture

### Content Collections (src/content.config.ts)

Four collections using Astro v5 glob loader pattern:
- **maps** (`src/content/maps/`) — Cross-domain blog posts with `mapType` (moc/synthesis/literature/conceptual) and `aspects` taxonomy
- **meta** (`src/content/meta/`) — Framework pieces with `maturity` (seedling/budding/evergreen) and `framework`/`category` fields
- **process** (`src/content/process/`) — Lab notebook with `dimension` (formal/empirical/implementation/troubleshooting/exploration/canon/structured-learning/readings) and `status`. Supports `series`/`seriesTitle`/`seriesFocus` fields for grouping related entries, and `project` for linking to a topic slug. **Draft entries live in `src/content/process/_drafts/`** and are excluded from the collection by the glob pattern (`*.{md,mdx}` — root only, no subdirectories). To publish a draft: move it up to `src/content/process/`.
- **project** (`src/content/project/`) — Portfolio items with `outputs` array and `type` enum

All content is MDX. Schemas are defined with Zod in `src/content.config.ts`.

### Routing

Each collection has an index page and a dynamic `[...slug].astro` page under `src/pages/{collection}/`. Dynamic pages use `getStaticPaths()` + `getCollection()` + `render()` pattern. Process section also has topic-based routing (`/process/topics/[topic]`).

### Layout & Theming

Single layout: `src/layouts/BaseLayout.astro`. Supports light/dark mode via `data-theme` attribute on `<html>`, persisted to localStorage. Light mode is pale chart paper (#e9eff1, cool blue-grey); dark mode is a cyanotype blueprint (#0c151d). A noise overlay texture is applied in light mode only.

CSS variables are defined globally in BaseLayout. Key font stack: DM Sans (sans), Newsreader (serif), IBM Plex Mono (mono).

### Key Libraries

- **MDX** with remark-wiki-link plugin — `[[Page Name]]` links resolve to `/meta/{slug}` by default, where slug is lowercased with spaces replaced by hyphens
- **rehype-section-wrapper** (`src/lib/rehype-section-wrapper.js`) — Custom rehype plugin that wraps h2 sections in `div.section-card` containers
- **HTMX** loaded via CDN in BaseLayout for progressive enhancement
- **D3** available for interactive visualizations (used in map components)

### Topic Taxonomy (src/lib/taxonomy.ts)

Process entries are organized into topics/domains. `TOPIC_TAXONOMY` maps project slugs to domain categories (systems, tools, patterns, courses, library). Used by the process topic pages.

### Process Content Structure

**Published** (`src/content/process/` root): only fully written entries.
**Drafts** (`src/content/process/_drafts/`): outlines and stubs — ignored by the collection loader.

Domain → project slug mapping (defined in `TOPIC_TAXONOMY`):

| Domain | Project slugs |
|--------|--------------|
| **systems** | `trilingual-minds`, `predictive-processing`, `phonology`, `attention`, `binding-problem`, `generative-models`, `control-theory`, `scientific-communities`, `language-acquisition` |
| **tools** | `eyetracking`, `mousetracking`, `bayesian-statistics`, `causation`, `sts`, `signal-processing`, `building-cognitive-experiments`, `explanatory-depth`, `computational-cognitive-science`, `mechanistic-interpretability` |
| **patterns** | `strange-loops`, `neuroai`, `information-theory`, `algorithmic-information`, `computation-as-dynamics`, `learning-as-optimization`, `representation-spaces`, `geometric-deep-learning`, `compression-as-intelligence`, `beyond-folk-psychology` |
| **courses** | `moocs`, `course-work` |
| **library** | `books`, `readings` |

To create a new process entry: add frontmatter with at minimum `title`, `description`, `date`, `dimension`, `status`, and `project` (matching a slug above). Place in `_drafts/` until ready to publish.

### Components

- `src/components/maps/` — Interactive map visualizations (D3-based): OrientationFrameworkMap, TheoriesOfCognitionMap, BeliefDynamicsMap, StratifiedCogSciMap, ResearchProgrammesBoard
- `src/components/process/` — ActivityHeatmap, TopicCard
- `src/components/Graph.astro` — General graph component
- `src/components/ConnectionsMap.astro` — Cross-content connection visualization

## Known Issues

Astro v5.x has a content collections race condition that can cause "collection does not exist or is empty" errors, particularly on Windows. Workaround: `rm -rf .astro && npm run dev`.

## Design Language & Voice

The site is a public zettelkasten — "an intellectual workshop with the tools left visible" — not a portfolio. Every design and content decision should reinforce that identity. Live at https://sambit.com.np (CNAME + astro `site` — the old sambitmaps.systems domain is dead).

### Voice & content rules
- **Questions before credentials.** The homepage leads with current questions; affiliations are mono sub-lines, never headlines.
- **Claims as titles.** Meta entries are titled by the claim they defend ("Reality is always larger than any representation we construct of it"), with the framework name in `framework`.
- **Epistemic honesty is the brand.** Maturity markers are load ratings, not decoration. Never inflate: no invented collaborators, impact claims, publication pipelines, or "doctoral-level" framing. When in doubt, understate.
- **Two registers**: essayistic (serif, Meta/Maps: synthesis and claims) and lab (sans/mono, Process: work shown, not summarized).
- **No em-dashes in site copy.** Use colons, commas, parentheses, or a new sentence instead.

### Visual identity (chart paper / cyanotype / archival)
- Palette is a TWO-INK system on chart paper `#e9eff1` (cool pale blue-grey; ink-slate text `#16232c`): wayfinding ink `--accent: #2b5d76` (links, content nav; dark `#8fb4c9`) and surveyor's red `--annotation: #a23b2e` (dark `#cf7a63`) reserved for survey apparatus only: station marks, plate registration corners, sheet numbers, fig. numbers, the centroid, the nav brand mark, masthead overline glyphs. Never use annotation red for links or emphasis. Dark mode is a cyanotype (blueprint blue-black `#0c151d` bg, pale cyan linework), not generic zinc. Semantic colors stay earthy: terracotta `#a0724e`, stone `#57534e`, sage `#6a7f5f`, ochre `#97742f`, brick `#a14f43`, forest `#46703f`, sienna `#8b4513` (semantic only, no longer the brand accent), slate `#5a708a`, plum `#7d5b78`. Never saturated Tailwind hues. Accent lives only in BaseLayout CSS vars; never hardcode it elsewhere.
- Type: Newsreader (serif) for essayistic titles, claims, article h1/h2, italic leads; DM Sans for UI/body; IBM Plex Mono for micro-labels (uppercase, letter-spaced ~0.08em).
- No emoji as UI. Dimensions use mono abbreviations (`form`, `emp`, `impl`, `fix`, `expl`, `canon`, `course`, `read`); maturity uses geometric glyphs (open ○ seedling → half ◐ budding → filled ● evergreen).
- Cards are flat "index cards": 3px radius, hairline `--border`, subtle shadow, colored 2px top rule for domain theming. No large rounded corners or floating shadows.
- Section system: numbered mono overlines with an open-circle glyph (`○ 01 · Knowledge topology` Maps, `02` Meta, `03` Process, `04` Project) via global `.masthead` / `.masthead-overline` classes in BaseLayout. The nav brand carries the triangle+centroid mark.
- The homepage triangle must stay legible, not decorative: centroid labeled `LANGUAGE` (the phenomenon under triangulation), a serif italic caption explaining the triangulation, and two-way hover wiring (question item <-> vertex <-> plank pill). If it ever loses those, cut it.
- Footer "Last plank replaced" is computed from the newest content date across collections — keep it derived, never hardcoded.

### The survey grammar (sitewide motifs)
The site's governing conceit: **an ongoing survey of language, minds & knowledge**, triangulated from three fixed stations (philosophy, experiments, modeling). Neurath's boat is the survey vessel; residual reality is why the survey never closes. Recurring motifs, all defined in `src/lib/survey.ts`, `src/components/StationMark.astro`, and BaseLayout globals:
- **Accession numbers**: every entry gets a chronological document id: Maps `M-01…`, Meta `F-01…`, Process `L-01…`, Project `A-01…` (`accessionIndex()`; `.accession` class). Shown on indexes, detail headers, and the homepage soundings list.
- **Station marks**: a small triangle glyph with one vertex filled showing which method an entry was sighted from (`StationMark`, `stationFor(dimension)`; empirical/troubleshooting → experiments, formal/implementation → modeling, everything else → philosophy; meta entries are always philosophy).
- **Sheet numbers**: mastheads read `Sheet 01 · Charts of the territory` (Maps), `Sheet 02 · Instruments & frameworks` (Meta), `Sheet 03 · The field log` (Process), `Sheet 04 · Finished artifacts` (Project); About is `Surveyor's note`. Project's label stays plain on purpose: it is the one section visitors (reviewers, employers) must parse instantly, so no survey metaphor there.
- **Plate marks**: `.plate` puts cartographic registration ticks on opposite corners of a container (homepage sheet).
- **Scale rule**: `.scale-rule` is a map scale bar used as a section divider; prefer it over plain `<hr>` on composed pages.
- **Cartouche**: the homepage title block (double-ruled box) carries surveyor, base, stations, datum, load ratings, last revision (the build date, so it refreshes on every deploy), and links. The surveyor's name lives here, not in a hero; the artifact leads, the name is a credit line.
- **Coordinates**: the footer carries `27.7172° N · 85.3240° E` (Kathmandu).
- **The orrery** (homepage `fig. 1`): inner ring holds the inscribed method triangle with LANGUAGE at the open centroid; the outer ring carries engagements in slow orbit (~150s/rev, respects reduced motion). Solid nodes link to written frameworks; dashed open nodes are interests still forming. Update the `satellites` array in `src/pages/index.astro` as interests change.
