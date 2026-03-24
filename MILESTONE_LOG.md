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
