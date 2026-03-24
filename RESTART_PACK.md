DATE: 2026-03-25

CURRENT GOAL: TinyPress Stage 5 — lightweight frontend for mainnet demo deployment.
TinyPress canister (v1) is feature-complete. Stage 5 delivers a simple React frontend
sufficient for third-party demonstrations of the zombie-delete problem MKTd03 solves.

GIT STATE
    MKTd03:                    main @ f55d63615ed6966882484dfaa1c012083bbddc2a
    TinyPress:                 main @ f93a60c (full SHA: run git rev-parse HEAD to confirm)
    TAV-Engineering-Standards: main @ d6c7d17 (full SHA not yet refreshed)

FILES OPEN (edited, not yet committed)
  None

DECISIONS MADE THIS SESSION
  - Stage 4 complete: get_comments_by_author exposed as public query, DID updated
    in same commit, all acceptance gates passed, G secondary review approved (f93a60c)
  - TinyPress v1 canister is feature-complete — all ADR §8 build stages done
  - Stage 5 = TinyPress frontend (before MKTd03 integration, not after)
  - STANDING TAV PRINCIPLE: toy dApps are always deployable on mainnet with a
    lightweight frontend suitable for third-party demos; canister-only is never
    the finished state

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
  - stef-mvp identity is encrypted — will fail in non-interactive/bash contexts
  - Commit message exclamation marks trigger bash history expansion in WSL —
    use single quotes around commit message or avoid ! in messages
  - TinyPress memory IDs 0..10 all in use — any new stable structures start at MemoryId(11)

ACCEPTANCE GATES (Stage 5)
  [ ] Frontend stack decided (React + Vite assumed; confirm or adjust)
  [ ] Frontend ADR drafted and reviewed before any code written
  [ ] Profile create / view / delete working in UI
  [ ] Post create / view working in UI
  [ ] Comment create / view working in UI
  [ ] Orphaned records state visible after profile deletion (the demo money shot)
  [ ] Deployable to mainnet
  [ ] Suitable for third-party demo without CLI knowledge

SAFE RESTART PROMPT
  Fetch https://raw.githubusercontent.com/Together-Alone-Ventures/TinyPress/main/RESTART_PACK.md
  and confirm your understanding of the current state before we proceed.
  Context if needed: We are building MKTd03 — a zombie-delete / GDPR tombstoning
  protocol on ICP. The toy dApp is TinyPress, a Nuance-inspired single-canister
  publishing app. TinyPress canister v1 is feature-complete. Stage 5 is a lightweight
  frontend for mainnet demo deployment — this must be built before MKTd03 integration begins.
  TinyPress repo: Together-Alone-Ventures/TinyPress on GitHub, main branch.
  MKTd03 repo: Together-Alone-Ventures/MKTd03 on GitHub, main branch.
