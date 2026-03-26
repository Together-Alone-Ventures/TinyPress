# DATE: 2026-03-26

## CURRENT GOAL

TinyPress repo-boundary cleanup checkpoint completed.

Immediate next objective:
- keep TinyPress continuity documents repo-local and current
- continue TinyPress work without reintroducing MKTd03-specific documentation drift

## CURRENT STATUS

TinyPress is now operating as its own standalone repo with:
- public-facing repo guidance narrowed and updated
- TinyPress ADR restored to the TinyPress repo
- Stage 5 pass 2B frontend work already landed on `main`

Current repo state:
- TinyPress `main` @ `0e2fe2c` — `docs: add repo guidance and restore TinyPress ADR`

Related adjacent repo state:
- MKTd03 `main` @ `0e3ef37` — `docs: narrow repo guidance and remove TinyPress ADR`

## RECENT CLEANUP COMPLETED

- Moved `TinyPress_ADR_v1.1.docx` from MKTd03 into `TinyPress/docs/adr/`
- Replaced duplicated mixed-scope `CLAUDE.md` content with a concise TinyPress-local repo guidance file
- Confirmed local `.env` remains untracked
- Confirmed generated frontend artifacts reviewed during cleanup were not tracked repo content

## TINY PRESS BOUNDARY RULES

TinyPress should remain:
- a standalone application repo
- focused on TinyPress code, app architecture, ADRs, and local operating notes
- documented in application-specific terms

TinyPress docs should not become a storage location for:
- generic MKTd03 protocol documentation
- generic CVDR product-family framing
- cross-product commercial positioning
- reusable standards material better housed in TAV-Engineering-Standards

## WORKING METHOD

When performing further cleanup or doc updates:
1. inspect current repo contents first
2. classify before moving or rewriting
3. keep TinyPress-local docs in TinyPress
4. keep protocol/product-family material out of TinyPress unless clearly example-only
5. use tightly bounded edits and review diffs before commit

## KEY FILES

- `CLAUDE.md` — repo-local guidance
- `RESTART_PACK.md` — current continuity state
- `MILESTONE_LOG.md` — TinyPress historical progress log
- `docs/adr/TinyPress_ADR_v1.1.docx` — TinyPress architecture reference

## NEXT LIKELY TASKS

Choose deliberately from the following:
- continue TinyPress-local documentation cleanup if further drift is found
- resume TinyPress implementation work from the current Stage 5 / Stage 6 checkpoint
- separately plan any standards extraction into TAV-Engineering-Standards without bloating this repo

## SAFE RESTART PROMPT

If resuming in a new chat, paste:

> TinyPress is now a standalone repo and must remain app-local in scope.  
> Current TinyPress main is at commit `0e2fe2c`; adjacent MKTd03 main is at `0e3ef37`.  
> Repo-boundary cleanup already completed: TinyPress ADR restored to TinyPress; public-facing repo guidance narrowed in both repos.  
> Use `RESTART_PACK.md`, `MILESTONE_LOG.md`, and `CLAUDE.md` first.  
> Keep TinyPress documentation application-specific and avoid reintroducing generic MKTd03/CVDR material into this repo.
