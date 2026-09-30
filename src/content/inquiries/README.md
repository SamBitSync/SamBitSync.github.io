# Actual Process encounters

Add JSON files with a records array here. Only root-level *.json files are published. This directory intentionally contains no illustrative records.

The authoring and presentation contract is in [PROCESS-SCHEMA.md](../../../docs/PROCESS-SCHEMA.md). The executable schema is src/lib/process-schema.ts, registered through src/content.config.ts. Types and reference checks live in src/lib/process-records.ts.

Start with shared entry metadata plus the movement's small core:

- Forest: question.
- Autopsy: observation.
- Ship: belief and challenge (what prompted reconsideration).
- Ordinary note: account.

Add prose, explanations, checks, consequences and repairs when there is something to record. Omit unknown fields. Tags are separate array items, such as LSN and Statistics; subject is context and does not create a tag.

The removed September prose is retained in tests/fixtures/inquiries-september.json; its Forest routes and subnotes are in tests/fixtures/forest-september.json. These are outside every published collection.
