DATE: 2026-03-24

CURRENT GOAL: TinyPress Stage 4 — expose get_comments_by_author as public query.
Storage and index already exist (COMMENTS_BY_AUTHOR, MemoryId 10). This is a
bounded single-method addition following the Stage 3 pattern.

GIT STATE
    MKTd03:                    main @ f55d63615ed6966882484dfaa1c012083bbddc2a
    TinyPress:                 main @ e4d8d67aa5b784d4dc3fbb68455b533867afa996
    TAV-Engineering-Standards: main @ d6c7d17 (full SHA not yet refreshed)

FILES OPEN (edited, not yet committed)
  None

DECISIONS MADE THIS SESSION
  - Stage 3 complete: comments map, COMMENTS_BY_POST, COMMENTS_BY_AUTHOR indexes
  - StoredComment/Comment split: reply_to_comment_id stored internally, absent
    from public API and DID
  - StoredCommentCodec used as candid serialisation helper (CandidType derive on
    codec only, not on StoredComment)
  - get_comments_by_author deferred to Stage 4 — storage ready, public query not yet exposed
  - dfx.json candid path fixed: src/tinypress/tinypress.did -> tinypress.did
  - Stage 3 secondary review (G) passed clean at e4d8d67

OPEN QUESTIONS (not yet resolved)
  - StoredCommentCodec derives CandidType unnecessarily — harmless, park for cleanup pass
  - cargo-audit not installed (WARN on deploy) — install when convenient
  - dfx.json candid metadata warning still present — dfx.json needs metadata block
  - claude.md should be renamed to CLAUDE.md (minor)
  - Review session for Playbook updates: .did-before-testing sequencing (§8.1
    extension); LazyEntry API lesson (verify iterator API against installed crate version)

KNOWN GOTCHAS FOR NEXT SESSION
  - Git repo (MKTd03) is in WSL at /home/stef_savanah/projects/MKTd03
  - Git repo (TinyPress) is in WSL at /home/stef_savanah/projects/TinyPress
  - Git repo (standards) is in WSL at /home/stef_savanah/projects/TAV-Engineering-Standards
  - Windows working folder: C:\Users\Stef\Dropbox\Van Haas\Bonded\Patents\Zombie Delete\MKTd03
  - WSL Dropbox path: "/mnt/c/Users/Stef/Dropbox/Van Haas/Bonded/Patents/Zombie Delete/MKTd03"
  - Always delete old file from Dropbox MKTd03 folder BEFORE downloading new version
  - Always verify with sed -n 'Np' to confirm new file landed before running cp
  - Always verify filename has no (1) or (2) suffix before running cp
  - Always use full SHA (git rev-parse HEAD) in this file — not short hash
  - Always verify branch after push: git log --oneline -3 origin/main
  - Kill daffydefs replica before starting MKTd03 sessions:
      pkill -9 -f '/home/stef_savanah/projects/daffydefs/.dfx/network/local'
      pkill -9 -f '/home/stef_savanah/.cache/dfinity/versions/0.24.3/pocket-ic'
      pkill -9 -f '/home/stef_savanah/.cache/dfinity/versions/0.24.3/replica'
      pkill -9 -f '/home/stef_savanah/.cache/dfinity/versions/0.24.3/ic-https-outcalls-adapter'
  - StableBTreeMap::range() yields LazyEntry in 0.7.2 — use entry.key().clone(), not tuple destructure
  - Interface file must be updated before acceptance testing — dfx produces misleading
    type errors (not logic errors) when .did is stale
  - delete_comment Forbidden test requires a second dfx identity that has a profile;
    use test-user identity (unencrypted, safe for non-interactive use)
  - stef-mvp identity is encrypted — will fail in non-interactive/bash contexts
  - Commit message exclamation marks trigger bash history expansion in WSL —
    use single quotes around commit message or avoid ! in messages
  - TinyPress memory IDs 0..10 all in use — Stage 4 additions start at MemoryId(11)
    if any new stable structures are needed (none expected for get_comments_by_author)

ACCEPTANCE GATES (Stage 4)
  [ ] Codex prompt drafted and reviewed
  [ ] get_comments_by_author implemented and DID updated in same commit
  [ ] cargo build passes clean
  [ ] dfx deploy succeeds
  [ ] get_comments_by_author returns correct comments for a known author
  [ ] get_comments_by_author returns empty vec for profile with no comments
  [ ] get_comments_by_author returns empty vec (not error) when profile_id absent
  [ ] All Stage 3 acceptance gates still pass (no regression)
  [ ] Secondary review (G) approved

SAFE RESTART PROMPT
  Fetch https://raw.githubusercontent.com/Together-Alone-Ventures/TinyPress/main/RESTART_PACK.md
  and confirm your understanding of the current state before we proceed.
  Context if needed: We are building MKTd03 — a zombie-delete / GDPR tombstoning
  protocol on ICP. The toy dApp is TinyPress, a Nuance-inspired single-canister
  publishing app. TinyPress must be zombie-delete naive (no tombstone awareness in v1).
  TinyPress repo: Together-Alone-Ventures/TinyPress on GitHub, main branch.
  MKTd03 repo: Together-Alone-Ventures/MKTd03 on GitHub, main branch.
