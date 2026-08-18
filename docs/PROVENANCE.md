# Provenance

Retired inputs (kept only as archives outside this repo; never referenced as
live code):

| Archive                          | Date       | md5                                  | Disposition                                                                 |
| -------------------------------- | ---------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `furnishes_prod-main__53_.zip`   | 2026-06-24 | (large legacy production repo)       | Behavioral reference only — see docs/legacy/. Never copy code.              |
| `furnishes_2-main.zip`           | 2026-07-18 | rebuild attempt snapshot             | Retired. Superseded by this repo.                                           |
| `furnishes-phase-2-products.zip` | 2026-07-21 | rebuild attempt snapshot             | Seed of this repo (Landing + tooling). Products surface not carried over.   |
| `SpektralLanding_final__1_.jsx`  | 2026-07-16 | md5 8915f0536544a5254b0ae33e3a349a91 | Byte-identical to `reference/2026-07-16/landing.jsx` (sha256-lf 5db06956…). |

Frozen design hashes are authoritative in
`reference/2026-07-16/source-manifest.json` and verified by
`pnpm check:reference-integrity`.
