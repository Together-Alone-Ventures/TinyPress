# ADR-12 — TinyPress Stage 5 Frontend

## Status
Proposed

## Context
TinyPress v1 canister is feature-complete. Stage 5 adds a lightweight frontend suitable for third-party demos on ICP mainnet. The purpose is to demonstrate the TinyPress behavior clearly, not to turn TinyPress into a production social app.

Current repo state is backend-only: one Rust canister (`tinypress`) and no frontend canister.

TinyPress must remain an ordinary app. It is zombie-delete-naive. Stage 5 must not introduce deletion-aware terminology into the TinyPress UI, naming, or app framing.

ADR-01's no-scaffold-tools constraint applies to the canister layer and is unaffected by this frontend decision. The hand-written `.did` remains the authoritative canister interface.

## Decision
Stage 5 will add a separate frontend asset canister using React + Vite.

Authentication will use Internet Identity.

The frontend will be intentionally narrow and demo-oriented. It will support:
- sign in with Internet Identity
- create, view, update, and delete the caller's profile
- create posts
- create comments
- view posts and comments needed for the demo flow
- show the resulting state where posts/comments remain visible after profile deletion

## Rationale
React + Vite is preferred over plain HTML/JS because:
- it is closer to the DaffyDefs style the project wants to echo
- it gives cleaner component structure for a demo UI with multiple stateful panels
- it remains lightweight enough for this stage
- it is a better base for later refinement than a one-file frontend

## Non-goals
- no backend redesign
- no new TinyPress canister methods unless a minimal supporting fix is strictly required
- no admin panel
- no moderation tools
- no production-grade styling or product polish
- no MKTd03 integration in Stage 5

## UX principle
The frontend should make ordinary TinyPress behavior legible.
It should not use MKTd03-specific or deletion-aware terminology in user-facing copy, component naming, or panel labeling.

## Acceptance criteria
- frontend builds and deploys locally through dfx
- frontend authenticates with Internet Identity
- a user can create a profile, post, and comment
- deleting the profile succeeds
- surviving posts/comments remain visible in the demo flow
- no deletion-aware or MKTd03-specific terminology appears in UI copy, component names, or panel labels
- frontend is suitable for a third-party mainnet demo
