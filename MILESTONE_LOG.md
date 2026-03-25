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

## 2026-03-25 — MILESTONE: TinyPress Stage 5 pass 1 complete

Decisions made:
  - Stage 5 is split into at least two passes:
    pass 1 = frontend scaffold + local Internet Identity support;
    pass 2 = real TinyPress frontend wiring.
  - Local Internet Identity support belongs in TinyPress repo config for
    development, using a pinned Internet Identity release and local-only
    deployment flow.
  - No TinyPress backend canister calls were added in pass 1. The frontend
    remains an auth shell plus ordinary app-facing panels only.

Irreversible actions taken:
  - Committed 98bc643 to TinyPress main for the Stage 5 frontend scaffold.
  - Committed 4381f65 to TinyPress main for local Internet Identity support.
  - TinyPress now has:
    React + Vite frontend under src/frontend,
    frontend asset canister config in dfx.json,
    local Internet Identity support for development,
    successful local sign-in flow.

Do not revisit:
  - Stage 5 pass ordering — pass 1 before real frontend wiring.
  - Local Internet Identity support as a prerequisite for frontend auth testing.
  - Pass 1 scope boundary — no real TinyPress canister calls yet.

Next task:
  - Stage 5 pass 2 — frontend wiring for real TinyPress flows:
    profile create / view / delete,
    post create / view,
    comment create / view,
    and the surviving-records demo flow after profile deletion.

## 2026-03-25 — MILESTONE: TinyPress Stage 5 pass 2A complete

Decisions made:
  - Pass 2A is limited to the minimum frontend-side canister integration
    needed for profile flows only.
  - Generated declarations are committed under
    src/frontend/src/declarations/tinypress and remain derived from
    tinypress.did via dfx generate.
  - Local Internet Identity uses the README-pinned dev release
    release-2025-04-04-v3 for this repo's local setup.
  - The local Internet Identity provider URL must use the subdomain form
    with ?raw=true.
  - After any dfx start --clean, local canister IDs drift and
    src/frontend/.env must be rewritten before rebuilding the frontend.
  - dfx deploy does not accept multiple canister names in one command for
    this setup; internet_identity and tinypress are deployed separately.

Irreversible actions taken:
  - Committed 8104dcf to TinyPress main for Stage 5 pass 2A:
    profile wiring, local Internet Identity fix, and asset certification.
  - TinyPress now has a working browser flow for:
    sign in,
    create profile,
    view profile,
    delete profile.

Do not revisit:
  - Pass 2A scope boundary — profile only, no posts/comments yet.
  - Local recovery loop — deploy canisters, dfx generate, rewrite .env,
    rebuild, redeploy frontend.
  - README-pinned Internet Identity release for local use in this repo.

Next task:
  - Stage 5 pass 2B:
    post create,
    post list/view,
    comment create,
    comment list by post,
    preserve visibility of surviving posts/comments after profile deletion.

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

    ## 2026-03-25 — Stage 5 pass 2B completed

Completed TinyPress Stage 5 pass 2B in the frontend.

The browser UI now supports:
- post create via `create_post(title, body)`
- post list/view by author via `get_posts_by_author(profile_id)`
- comment create for the selected post via `create_comment(post_id, content)`
- comment list by post via `get_comments_by_post(post_id)`

The previous static placeholder Write / Feed / Comments panels in `src/frontend/src/App.tsx`
were replaced with live frontend wiring using the generated TinyPress actor types.

The orphaned-record demo path is now visible in the UI:
after `delete_profile` succeeds, the frontend stores the deleted `profile_id` in component state,
re-fetches surviving posts via `get_posts_by_author(deletedProfileId)`, and preserves comments for
the selected post. The profile panel resets to idle/create-profile state and does not pretend the
deleted profile still exists.

Pass 2B defects found and fixed during implementation:
- removed `required` from the post body textarea so title-only posts are allowed, matching ADR/spec
- cleared `deletedProfileId` on signed-out/no-session reset so stale orphaned posts do not reappear
  after sign-out/sign-back-in flows
- tightened comment composer gating so the form is shown only when an active TinyPress profile exists;
  after profile deletion, existing comments remain visible but commenting is disabled with explanatory text

Verification status:
- `npm --prefix src/frontend run build` passed after final changes
- code/build audit confirmed App.tsx-only frontend change set and no Rust / Candid drift
- browser behaviour was manually observed as working, but not independently reproduced by tool audit

Current limitations / notes:
- orphaned-post visibility after profile deletion is session-local because the deleted profile id is
  stored in component state
- comments remain visible after profile deletion for the currently selected post because the selected
  post id remains in component state
- feed scope remains author-scoped only, which is sufficient for Stage 5 pass 2B
- Stage 6 remains the hard gate before any MKTd03 integration work begins
