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
