# Private Process fixtures

These files are outside Astro's published collections and generate no site pages.

- inquiries-september.json: reconstructed month, including illustrative prose.
- forest-september.json: matching routes and question subnotes.
- forest-registry.json and glmm.mdx: original illustrative GLMM inquiry and article.
- inquiry-demo.ts: retired event-based Autopsy/Ship prototype, retained only to preserve its tests. It is not the production schema.
- sparse-inquiries.json: minimal Autopsy and Ship records used to check optional fields and sparse rendering.

Run node --test tests/*.test.mjs. Use docs/PROCESS-SCHEMA.md and the production schemas when authoring actual records.
