# Process: authoring and presentation contract

Process is a field notebook with three practices. An encounter is a dated occasion of work. An entry records a particular question, observation or reconsideration on that occasion. A recurring subject can have several dated entries.

The public illustrative records have been removed. Their data, prose and subnotes remain in `tests/fixtures`, which Astro does not publish. This contract preserves the tested presentation while allowing the record to grow from actual use.

## Shared entry metadata

Actual entries live in `src/content/inquiries/*.json`, each file containing `{ "records": [...] }`.

| Field | Meaning |
| --- | --- |
| `id` | Stable entry identifier, lowercase letters, numbers and hyphens. Determines `/process/entries/{id}/`. |
| `encounter` | Stable occasion identifier. Records from the same dated occasion can share it. |
| `date` | Encounter date, `YYYY-MM-DD`, without a time. |
| `title` | Specific question, observation or change recorded on that occasion. |
| `subject` | Context for the work, never automatically converted into a tag. |
| `summary` | Short page description, not repeated as a subtitle in the register. |
| `movement` | `forest`, `autopsy`, `ship`, or an ordinary `note`. |
| `example` | Set to `false` for actual records. |

Optional shared fields:

- `tags`: separate topics, for example `["LSN", "Statistics"]`. Multiword tags are valid. Slash/pipe combinations and duplicates are rejected. Consistent spelling groups entries across practices.
- `writing`: sections shaped as `{ heading, paragraphs: [...] }`. Prose can be added later. It interprets the record without creating events or changing derived state.
- `reconstruction`: explanation of uncertainty in a later account, date or sequence.
- `arose_from`: another entry id in the same bundle, recording what prompted this entry. Reverse links are automatic.
- `next`: a next question or action, when useful.

Keep connected entries in one bundle so references can be checked together. Different dates use different encounter ids. Multiple practices can share an encounter on the same date; the heatmap counts that occasion once.

## Forest of Ignorance

**Question:** What must I clarify to continue?

The entry requires `question`. Optional `account` and `reflection` support a prose-only record. Add `forest_attempt` only when a trustworthy ordered log exists. It references an attempt in a version-2 registry under `src/content/forest`; its date must match the entry.

Registry structure:

- `nodes`: global questions with stable `id`, short `label`, articulated `question` and `first_encountered`. Optional `note` creates a question-note page; blank lines separate paragraphs. Optional `process_note` links to an ordinary published Process note.
- `attempts`: dated encounters with `id`, `root`, `date` and ordered `events`. Optional title, note, duration and root commit can be supplied.
- `edges`: explicit `sharpens` relationships with id, endpoints and originating attempt. Exposure relationships are derived from push/expose events.
- `dissolutions`: dated, reasoned retirement of relationships by stable edge id. Nodes have an optional dated `dissolved` judgment.

Events are `push {node}`, `pop {node,note?}`, `reflect {node,note}`, `expose {from,node}`, and `stop {reason,note?}`. Each attempt first pushes its root. Pop must match the top. Reflect leaves the stack unchanged. Exposure discovers a question without pursuing it. Stop ends the encounter and preserves its remaining stack.

Domain and closure are independent optional classifications: technical/philosophical and convergent/divergent. Every combination renders normally. Any question can pop when enough has been clarified to continue the parent explanation. Optional due dates remain quiet review signals.

Presentation:

- One coordinated figure contains the relationship map, selected question and stack replay.
- Inspecting a station leaves replay position unchanged. Stepping an event updates focus and stack together.
- Overview and dated routes keep station positions stable. Revisited stations carry multiple step numbers. Cycles appear as return relationships.
- The reading panel links to a subnote when present. Full stack snapshots and notes remain in expandable event history.
- Mobile redraws the route vertically. Date labels are compact; no invented timestamps.

Stack, maximum depth, touched nodes and termination reason come from events. See the Forest README for chronology, dissolution and history rules.

## Black-Box Autopsy

**Question:** What process produced this?

The movement requires only `observation`. Such an entry can display the observation alone, before an expectation, rival or assessment exists.

Optional structure:

- `expected`: what was expected instead, when that contrast matters.
- `rivals`: `{ id, explanation, introduced }`. One explanation is allowed. Introduction dates remain visible.
- `checks`: `{ id, date, description, produced }`. A check records both what was done and what it produced, and can exist without a named rival.
- Check `comparisons`: optional `{ rival, result }` list. Results are `supports`, `against`, `inconclusive`, or `not_tested`. An omitted list becomes empty.
- Check `assessment` and `discriminates`: optional interpretations. `discriminates: "no"` explicitly records a check that did not distinguish explanations.
- Entry `assessment`, `residue`, and `status` (`open` or `resolved`) are optional judgments. Resolution may still leave unexplained residue.

Only existing sections render. Dated introductions and checks expose chronology; same-day ordering needs prose if it matters. Comparisons appear only where a check references rivals. There is no mandatory sequence diagram, verdict slot, stack or completion score.

## Neurath’s Ship

**Question:** What else does this change?

The movement requires `belief` and `challenge`: what was held, and what prompted reconsideration. It can begin before a replacement or consequence is known.

Optional structure:

- `revision`: `suspended`, `qualified`, `narrowed`, or `withdrawn`. Omit when the change is not yet characterized.
- `belief_date`, `source`, `provenance`: context for the earlier belief. Provenance distinguishes a contemporary record from a later reconstruction; unknown details can be omitted.
- `replacement`: where the writer stands now, including being undecided.
- `replacement_status`: explicit `undecided`, `provisional`, or `settled` judgment, independent of repairs.
- `consequences`: `{ id, description, depends }`. `depends` explains how something rested on the belief. This is the tracing work.
- Consequence `kind` (belief/explanation/decision/work), `status` (holds/needs_repair/repaired/abandoned), `reason`, and `href` are optional.
- `repairs`: dated `{ date, consequence, note }` entries tied to a recorded consequence. Small changes can stay in this log without a new essay.

Only recorded sections render. Repairs outstanding are counted from `needs_repair`; unassessed consequences are identified when displaying the count. The count never determines whether a replacement is settled. There is no mandatory diagram, plank inventory or fixed sequence.

## Index, topics and reading

Process keeps three entrances and their figures. Each practice retains its epigraph. The register uses the specific dated entry title, then separate topic links; it omits repeated summaries.

When entries exist, the calendar is followed by a quiet topic strip. It shows up to eight topics ordered by entry count, then alphabetically. The remainder is expandable. Counts cover the whole notebook, independent of a selected day. Every tag opens a generated topic page.

With no entries, show “No entries recorded yet.” Hide the empty heatmap and topic strip. Forest has a quiet empty question state. No fabricated activity or sample cards appear.

Written prose leads when present. The structured record sits in a disclosure below; without prose it opens directly. No empty written-account slot appears. Related encounters, question subnotes, and previous/next reading links are derived when available.

The site stays static. Small scripts coordinate calendar filtering and Forest selection/replay. All typography, borders and colours use existing site tokens. No success colours or checkmarks are introduced.

## Validation and history

The executable inquiry schema lives in `src/lib/process-schema.ts`, registered in `src/content.config.ts`. Types and reference checks live in `src/lib/process-records.ts`. Forest validation and derivations live in `src/lib/forest.ts`.

Build validation rejects malformed fields, duplicate ids within a bundle, missing references, invalid pops, pushes of an already stacked question, invalid chronology, events after stop, and multiple unfinished attempts within a Forest registry. Discovery cycles are allowed. Use one shared Forest registry for global questions and the unfinished-attempt rule.

Autopsy comparisons must name existing rivals introduced no later than their check. Ship repairs must name existing consequences. Forest entry references must match attempt dates.

First encounter dates and existing history should never be backdated or silently deleted. Preserve prior accounts in Git and retire questions/relationships with reasons. Builds validate current data, without relying on Git history or an editable baseline for historical immutability.

Fixtures retain the removed illustrative month and original demos. `node --test tests/*.test.mjs` checks references, replay, sparse cores and topic counts. Fixtures are excluded from public collections.
