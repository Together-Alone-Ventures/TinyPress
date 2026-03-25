## March 2026 — MILESTONE: TinyPress Stage 3 complete

Decisions made:
  - StoredComment/Comment split: reply_to_comment_id stored internally,
    absent from public API and DID. StoredCommentCodec used as candid
    serialisation helper to avoid CandidType on StoredComment.
  - get_comments_by_author: storage and index prepared (COMMENTS_BY_AUTHOR),
    public query deferred to Stage 4.
  - dfx.json candid path corrected from src/tinypress/tinypress.did to
    tinypress.did.

Irreversible actions taken:
  - Committed and pushed e4d8d67 to TinyPress main. Stage 3 memory IDs
    7..10 are now in use; do not reuse or reassign them.

Do not revisit:
  - Comments as embedded Vec<Comment> inside Post — rejected, settled.
  - reply_to_comment_id in public API in v1 — reserved in struct only.
  - author_profile_id as caller input — derived from caller only.

## 2026-03-25 — MILESTONE: TinyPress Stage 4 complete

Decisions made:
  - get_comments_by_author exposed as public query over existing
    COMMENTS_BY_AUTHOR index (MemoryId 10); DID updated in same commit.
    Follows get_posts_by_author pattern: Vec<Comment>, no Result wrapper,
    empty vec for absent or comment-free profile_id.
  - STANDING TAV PRINCIPLE: toy dApps are always deployable on mainnet
    with a lightweight frontend suitable for third-party demos.
    Canister-only is never the finished state.
  - Stage 5 = TinyPress frontend, before MKTd03 integration begins.

Irreversible actions taken:
  - Committed and pushed f93a60c to TinyPress main.
  - TinyPress v1 canister is feature-complete per ADR §8.
    No further canister methods planned before MKTd03 integration.

Do not revisit:
  - TinyPress v1 canister feature set — complete, closed.
  - Stage ordering — frontend (Stage 5) precedes MKTd03 integration.

## 2026-03-25 — SESSION LESSON: Assumption surfacing at stage transitions

What happened:
  - Stage 4 closed cleanly on the coding task, but project-shape assumptions
    (frontend, mainnet, demo posture) were not surfaced until the human raised
    them. C incorrectly inferred "no mainnet" and "no frontend needed" from
    "toy app," and overclaimed doc knowledge on what Stage 5 was.

The lesson:
  - Before any new stage begins, run an explicit assumption surfacing check
    covering: target audience and outcome posture; deployment target (local /
    mainnet); whether a frontend/UI is in scope; what "done" means for this
    phase; which artifacts are required at close; what is intentionally
    deferred; what assumptions are being made by analogy rather than by
    explicit instruction. "Toy app" does not mean "canister-only forever" or
    "not demo-worthy." Absence of a written rule is not the same as the
    opposite rule being settled.
  - When a phase ends, do not move straight into "what next." First run the
    assumption surfacing pass for the next phase, especially around audience,
    deployment posture, UI expectations, and demo intent.
  - "Toy dApp" at TAV means: deployable on mainnet, with a lightweight
    frontend, suitable for third-party demos. This is now a standing TAV
    principle. Never override it by analogy or inference.

Category: process

Apply next time:
  - At the start of every new project or phase, before any implementation
    prompt is drafted, ask explicitly:
      1. Outcome posture: internal test, partner review, public demo, beta,
         production?
      2. Deployment target: local only, mainnet-capable, or both?
      3. UI/frontend: in scope for this phase or deliberately deferred?
      4. Audience: developer, reviewer, investor, regulator, partner, end user?
      5. "Done" semantics: code merged / deployed / tested / reviewed /
         demoable / documented — which of these apply?
      6. Artifact requirements: which artifacts must exist at phase close?
      7. Demo story: is there a "money shot" this phase must support?
      8. Workflow constraints: CLI-first, GitHub-web-editor-first, mixed?
      9. Novelty check: what would a model wrongly assume by analogy to the
         previous project?
     10. Silence audit: what is the human likely assuming but has not yet
         written down?
  - Playbook formalisation of this checklist is a hard gate (Stage 6) before
    MKTd03 integration begins.
