# Mock and placeholder surfaces (internal audit)

Inventory of incomplete or mock-backed surfaces. Update as features ship.

## Public-facing risk

- **`/room-planner`** — Preview only; not a live 3D planner. **Workspace rail:** the **Rooms** entry that navigated here was removed; `RoomPlannerContent` may remain reachable only via legacy `PanelId` wiring (illustrative).

## Internal placeholders

- **`ValidateContent`** — Demo checklist; “Fix” links are routing hints (e.g. assistant, collections), not automated repairs.
- **`RoomPlannerContent`** — Mock dimensions and SVG; informational only.

## Mock-backed, acceptable for demos

- **Cart / commerce** — Mock cart data (`lib/site/commerce/mock-data`); checkout may lack full order plumbing.
- **Quiz / inspiration flows** — Confirm persistence before claiming saved state.

## Before production launch

- **Promo codes** — No fake apply; cart states when codes are not supported (Phase 1).
- **Eva settings view** — Status-only until real prefs exist (Phase 1).
- **Orders / fulfilment** — Verify backend before promise-heavy copy.
- **Full room planner** — Product/engineering milestone, not Phase 1.

Copy expectations for profile and settings: see [`CURRENT_RUNTIME_TRUTH.md`](./CURRENT_RUNTIME_TRUTH.md) (guardrails + account); not duplicated in this audit.
