# Account architecture visual baseline

Frozen screenshots of the production Account UI for architecture-refactor
parity checks. Capture + compare suite:
`e2e/account-architecture-baseline.spec.ts`.

## How to run

```bash
pnpm test:e2e e2e/account-architecture-baseline.spec.ts
```

1. Captures candidates into `docs/account-architecture-candidate/` (gitignored)
2. Pixel-compares each PNG to this folder (threshold: 8% mismatched pixels)
3. Writes diffs + `SUMMARY.txt` to `docs/account-architecture-diff/` (gitignored)

Re-approve baselines after an intentional visual change:

```bash
# PowerShell
$env:UPDATE_ACCOUNT_BASELINE="1"; pnpm test:e2e e2e/account-architecture-baseline.spec.ts
```

Unexplained diffs above threshold block done.

Primary viewports: 1440×900, 1280×800, 1024×768, 390×844, 360×800.
