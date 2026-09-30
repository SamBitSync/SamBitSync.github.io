# Forest records

Add a version-2 JSON registry here for actual work. Process frontmatter `forest` names a root node, not a file. This directory currently contains no published records. Nodes are questions; IDs remain stable across roots. Domain and closure are independent optional tags. A pop means enough to continue in this attempt, never permanent mastery.

Append attempts in chronological order; array order breaks same-day ties. Every attempt starts by pushing its root. Only one attempt can remain unfinished globally. To resume a stopped session, start a new attempt and explicitly push the starting route. Depth counts edges below the root.

Events:
- `push {node}` adds to the stack, deriving an exposure edge from its previous top if none exists.
- `expose {from,node}` records discovery without traversal, including circular discoveries.
- `pop {node,note?}` must match the top; the note can explain what sufficed.
- `reflect {node,note}` records changing understanding without moving the stack.
- `stop {reason,note?}` ends a session. Reasons are `time_budget`, `deferred`, `popped_to_root`. The last requires exactly the root to remain. Nothing follows stop.

An exposure edge keeps its first discovery provenance. Its stable ID is `attempt-id:zero-based-event-index`. Repeated pushes/exposures do not replace or revive it. Never reorder or delete old events. Explicit `edges` contain only `sharpens` relationships, directed from the sharpening question to the question sharpened. They have their own IDs and originating attempt.

To retire a relationship, append `{edge,date,reason}` to `dissolutions`. Retire a question with its `dissolved: {date,reason}` field. Never delete nodes, edges, or past attempts. Never edit or backdate `first_encountered`. These historical disciplines rely on Git history; builds do not depend on Git availability. If reconsidering a dissolved relationship, record a reflection before extending this minimal model to support revival.

Build validation checks references, chronology, duplicate IDs, stack correctness, dissolution targets and one unfinished attempt. Cycles are allowed; the view ends repeated visits with reference markers. Historical views are end-of-attempt snapshots: date-only dissolution judgments apply at the end of that day. Old question wording/classifications are available through Git, not reconstructed by the UI.

`due` is a review deadline (any closure type); it is not a duration. The browser marks overdue dates quietly. `duration_minutes` belongs to the attempt. `root_commit` optionally stores the full existing Git commit hash of the root note; do not invent one for uncommitted text.

The removed examples are retained outside the content collection in tests/fixtures/forest-registry.json and tests/fixtures/forest-september.json. The original GLMM article is retained in tests/fixtures/glmm.mdx. They are fixtures, not published history.

The coordinated survey figure is the default renderer: a relationship map, selected question, live stack, dated replay and expandable event history. Selecting a question leaves the event position unchanged. Stepping updates focus and stack together. Mobile uses a vertical route.

See [PROCESS-SCHEMA.md](../../../docs/PROCESS-SCHEMA.md) for the complete contract.
