DATE: 2026-03-25

CURRENT GOAL: TinyPress Stage 5 pass 2B — wire posts and comments into
the frontend demo flow. Stage 5 pass 2A is complete and working:
sign in, create profile, view profile, and delete profile all work
end-to-end in the browser. Stage 6 (playbook + TAV Design Principles
update) still follows Stage 5 and remains a hard gate before MKTd03
integration begins.

GIT STATE
    MKTd03:                    main @ f55d63615ed6966882484dfaa1c012083bbddc2a
    TinyPress:                 main @ 8104dcf7c98267bf7ca5cef3d58e707f60773cd9
    TAV-Engineering-Standards: main @ d6c7d17 (full SHA not yet refreshed)

FILES OPEN (edited, not yet committed)
  - RESTART_PACK.md
  - MILESTONE_LOG.md

DECISIONS MADE THIS SESSION
  - Stage 4 complete: get_comments_by_author exposed as public query, DID updated
    in same commit, all acceptance gates passed, G secondary review approved (f93a60c)
  - TinyPress v1 canister is feature-complete — all ADR §8 build stages done
  - Stage 5 = TinyPress frontend (before MKTd03 integration, not after)
  - STANDING TAV PRINCIPLE: toy dApps are always deployable on mainnet with a
    lightweight frontend suitable for third-party demos; canister-only is never
    the finished state
  - Stage 5 pass 1 complete: frontend scaffold committed, local Internet
    Identity support added, local deploy succeeds, and frontend sign-in works
  - Stage 5 pass 2A complete: generated declarations committed, profile
    create / view / delete wired, and browser flow verified end-to-end
  - Canonical local recovery loop is now understood: after any
    dfx start --clean, redeploy canisters, regenerate declarations, rewrite
    src/frontend/.env, rebuild, and redeploy tinypress_frontend
  - Local Internet Identity works with the README-pinned dev release
    release-2025-04-04-v3 and requires the provider URL form
    http://<internet_identity_canister_id>.localhost:4943/?raw=true
  - dfx deploy does not accept multiple canister names in one command for
    this setup; deploy internet_identity and tinypress separately
  - Next task is Stage 5 pass 2B: post create, post list/view, comment
    create, comment list by post, and preserving visibility of surviving
    posts/comments after profile deletion

OPEN QUESTIONS (not yet resolved)
  - StoredCommentCodec derives CandidType unnecessarily — harmless, park for cleanup pass
  - cargo-audit not installed (WARN on deploy) — install when convenient
  - dfx.json candid metadata warning still present — dfx.json needs metadata block
  - claude.md should be renamed to CLAUDE.md (minor)
  - Playbook updates still pending: .did-before-testing sequencing (§8.1 extension);
    LazyEntry API lesson (verify iterator API against installed crate version)
  - get_comments_by_post is incorrectly marked #[ic_cdk::update] — not fixed in
    Stage 4 (out of scope); park for cleanup pass

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
  - Frontend declarations under src/frontend/src/declarations/tinypress must be
    regenerated with dfx generate tinypress whenever tinypress.did changes
  - Canonical local recovery loop after any dfx start --clean:
      dfx start --clean --background
      dfx deploy internet_identity
      dfx deploy tinypress
      dfx generate tinypress
      rewrite src/frontend/.env with VITE_DFX_NETWORK=local plus fresh
      VITE_INTERNET_IDENTITY_CANISTER_ID and VITE_TINYPRESS_CANISTER_ID
      npm --prefix src/frontend run build
      dfx deploy tinypress_frontend
  - Local Internet Identity uses the README-pinned dev release
    release-2025-04-04-v3 in dfx.json
  - Local Internet Identity provider URL must use the subdomain form with
    ?raw=true:
    http://<internet_identity_canister_id>.localhost:4943/?raw=true
  - dfx deploy does not accept multiple canister names in one command for
    this setup
  - stef-mvp identity is encrypted — will fail in non-interactive/bash contexts
  - Commit message exclamation marks trigger bash history expansion in WSL —
    use single quotes around commit message or avoid ! in messages
  - TinyPress memory IDs 0..10 all in use — any new stable structures start at MemoryId(11)

ACCEPTANCE GATES (Stage 5)
  [x] Assumption surfacing check completed before any implementation prompt
  [x] Frontend stack decided and ADR drafted before any code written
  [x] Stage 5 pass 1 complete: frontend scaffold + local Internet Identity support
  [x] Stage 5 pass 2A complete: profile create / view / delete working in UI
  [ ] Stage 5 pass 2B complete: post create / view working in UI
  [ ] Stage 5 pass 2B complete: comment create / view working in UI
  [ ] Stage 5 pass 2B complete: orphaned records state visible after profile deletion
  [ ] Deployable to mainnet
  [ ] Suitable for third-party demo without CLI knowledge
  [ ] RESTART_PACK and MILESTONE_LOG updated in GitHub before session closes
  [ ] Stage 6 (playbook update) explicitly queued — do not proceed to MKTd03
      integration until Stage 6 is complete

SAFE RESTART PROMPT
  Fetch https://raw.githubusercontent.com/Together-Alone-Ventures/TinyPress/main/RESTART_PACK.md
  and confirm your understanding of the current state before we proceed.
  Context if needed: We are building MKTd03 — a zombie-delete / GDPR tombstoning
  protocol on ICP. The toy dApp is TinyPress, a Nuance-inspired single-canister
  publishing app. TinyPress canister v1 is feature-complete. Stage 5 pass 2A
  is complete: local Internet Identity works, the local recovery loop is
  understood, and the frontend now supports sign in plus profile create /
  view / delete end-to-end. Next task is Stage 5 pass 2B: post create,
  post list/view, comment create, comment list by post, and preserving
  visibility of surviving posts/comments after profile deletion.
  TinyPress repo: Together-Alone-Ventures/TinyPress on GitHub, main branch.
  MKTd03 repo: Together-Alone-Ventures/MKTd03 on GitHub, main branch.
