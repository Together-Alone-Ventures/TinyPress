# Repository Guidance — TinyPress

## Scope

TinyPress is the repository for the TinyPress application, including canister code, frontend code, application architecture decisions, and repository-local operating notes.

TinyPress documentation is written in application-specific terms and remains focused on the app itself.

## In scope

This repository is the appropriate home for:

- TinyPress canister and frontend code
- TinyPress architecture decisions and ADRs
- local build, run, and test instructions
- repository-local restart and milestone notes
- application-specific implementation and UX documentation

## Out of scope

Protocol-level CVDR / MKTd03 documentation, generic product-family framing, and cross-product commercial materials should be maintained in the relevant protocol or standards repositories rather than duplicated here.

## Relationship to adjacent repositories

TinyPress may be used alongside broader protocol work, but this repository should remain focused on TinyPress as an application codebase.

## Standards and continuity

Shared engineering standards and reusable cross-repository workflow guidance should be maintained centrally in TAV-Engineering-Standards.

For repository-local continuity, use:

- `RESTART_PACK.md`
- `MILESTONE_LOG.md`

## Writing guidance

Prefer simple, app-local explanations that describe what TinyPress currently implements. Keep protocol-level or cross-repository material in the appropriate companion repositories.
