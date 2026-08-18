# Inspiration Board

Status: **Implemented**. Product-free replacement for the reference Shortlist.

## Routes

- `/account/inspiration`
- APIs under `/api/account/inspiration`

## What it stores

- Generated images (ready generations)
- Uploaded images (JPEG / PNG / WebP)
- Title, note, room label, colors, materials, optional project link

## What it does not store

SKU, price, variant, cart, reservation, checkout, or Product configuration.

## Semantics

- Saving is owner-scoped; duplicates of the same upload or generation are rejected.
- Removing a board item does **not** delete the underlying upload or generation.
- Filters: All / Generated / Uploaded / project.

## Deferred

- Collaborative shared boards
- Commerce shortlist migration (explicitly out of scope)
