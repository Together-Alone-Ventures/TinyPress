# CLAUDE.md — MKTd03 Project Context

> This file provides persistent context for Claude Code and GitHub Actions.
> It covers stable project facts, architecture decisions, TAV conventions, and scope boundaries.
> Session-specific state (current goal, git HEAD, open questions) lives in RESTART_PACK.md — read that too.

---

## What This Project Is

**MKTd03** is a GDPR deletion proof protocol for the Internet Computer Protocol (ICP), targeting
enterprise applications that store multiple customers' records in shared canister state using
structures like `StableBTreeMap`. It uses Merkle tree-based cryptographic deletion proofs and
composite receipts to demonstrate configured deletion transitions of declared records.

**Scope boundary (critical):** MKTd03 proves the configured deletion/tombstoning transition of
declared records. It does NOT claim to be a complete GDPR compliance solution. This distinction
must be preserved in all code comments, docs, and copy.

**Related products:**
- MKTd02 — Leaf mode (canister-per-user model) — separate product
- MKTd01 / ZKPd01 — off-chain PII storage territory — separate product
- EVMd01 — generic EVM deletion product — separate product

---

## The Toy dApp: TinyPress

TinyPress is the MKTd03 test dApp, analogous to DaffyDefs for MKTd02. It emulates a
Nuance-inspired single-canister shared publishing structure.

### Data topology — three separate StableBTreeMaps

| Store | Key fields | Notes |
|---|---|---|
| `profiles` | profile_id, principal, handle, display_name, bio | PII root. Hard-delete on erasure request in v1. |
| `posts` | post_id, author_profile_id, title, body, created_at, creator_handle (copied) | `creator_handle` is structured residue — PII copied outside the root. |
| `comments` | comment_id, post_id, author_profile_id, content, reply_to_comment_id (optional, unused v1) | Separate records. NOT embedded in post struct. |

### Settled architectural decisions — do not revisit

- **Comments are a standalone StableBTreeMap** keyed by `comment_id`. Not a `Vec<Comment>`
  embedded inside the post struct. Any suggestion to embed comments should be rejected.
- **TinyPress must be zombie-delete naive in v1.** Zero knowledge of MKTd03 tombstoning
  mechanics. No tombstone fields, no receipt logic, no awareness of what will come. It models
  the pre-integration state of a real dApp. Profile deletion in v1 is a simple hard-delete.
- **MKTd03 does not perform semantic PII discovery** in free text. Out of scope by design.
- **MKTd03 does not claim to delete third-party content** (other users' posts containing a
  subject's username). Outside generic scope; legal handling is application- and
  jurisdiction-specific.

### PII scope map

| PII location | Type | MKTd03 scope |
|---|---|---|
| Profile record | Direct PII root | In scope — generic |
| `post.creator_handle` (copied field) | Structured residue | In scope if adapter declares it |
| `comment.author_profile_id` | Structured residue | In scope if adapter declares it |
| `post.body` @mentions (free text) | Semantic residue | Out of scope — not generic |
| Other users' comments on same post | Third-party PII | Outside generic MKTd03 scope |

### Known TinyPress simplifications vs real Nuance

- Nuance duplicates more than one copied handle into PostBucket. Real structured-residue breadth
  is wider than `creator_handle` alone.
- Nuance comments have reply-to edges, vote/upvote relations, and post-to-comment indexes.
  TinyPress exercises only the flat comment case. `reply_to_comment_id` is reserved in the
  schema but unused in v1.
- Nuance is multi-canister (PostCore + PostBucket). TinyPress is single-canister. Multi-canister
  index consistency issues will not surface at integration time.

---

## Domain Vocabulary

Use these terms consistently. Do not invent synonyms.

| Term | Meaning |
|---|---|
| **canister** | ICP smart contract / compute unit |
| **StableBTreeMap** | ICP stable memory ordered map — the primary shared state structure |
| **tombstone** | A deletion marker replacing a record's PII fields; proves the transition happened |
| **composite receipt** | A cryptographic receipt covering deletion of multiple related records |
| **structured residue** | PII copied from the root record into other records (e.g. `creator_handle`) |
| **semantic residue** | PII embedded in free text — outside MKTd03 generic scope |
| **Tree mode** | MKTd03 architecture: multiple users' records in one shared canister |
| **Leaf mode** | MKTd02 architecture: one canister per user — separate product |
| **zombie-delete naive** | A dApp with no awareness of MKTd03 tombstoning mechanics — the pre-integration state |
| **adapter** | The bespoke per-deployment component that maps application records into MKTd03 scope |
| **ICRC3** | ICP transaction log standard — relevant to event log secondary PII surfaces |
| **VetKeys** | ICP threshold key management — relevant to encrypted PII territory |
| **Chain Fusion** | ICP cross-chain orchestration capability |
| **SNS** | ICP Service Nervous System — DAO governance for ICP dApps |

---

## TAV Engineering Standards

All work must comply with TAV Design Principles (v3) and TAV Vibe Coding Playbook (v4).
Both documents live in the TAV-Engineering-Standards repo.

### The eleven design principles (summary)

1. **Composability first** — minimal explicit interfaces; no reaching inside other components
2. **Simplicity before cleverness** — prefer the simplest design that works; resist accidental complexity
3. **Specification before implementation** — interface contract and ADR before any code
4. **Diagnostics and telemetry by design** — every stateful component exposes health/status queries from v0.1
5. **Fail loud, never fail silent** — no plausible-looking wrong values; explicit errors always
6. **Incremental integration** — one unverified boundary at a time; compatibility checkpoint at each
7. **Observability over convenience** — state queryable at every lifecycle step
8. **Idempotence and re-runnability** — sensitive flows are either safe to re-run or explicitly documented as not
9. **Stable identifiers and explicit versioning** — stable IDs, explicit version in every response, documented compat policy
10. **Security by design** — threat model, auth model, and misuse cases before implementation
11. **Privacy by design** — personal-data boundaries and deletion surfaces before implementation

### Coding conventions

- Write the interface definition file (`.did` or equivalent) **before** writing implementation code
- Define explicit failure semantics — not just success shapes
- Every cryptographic formula needs golden test vectors before integration testing begins
- One logical change per commit
- Do not update docs until code, tests, and pinned dependencies are stable

### Review ladder

1. Primary model self-review (structured checklist)
2. Secondary reviewer (G) targeted adversarial review
3. Human operator diff review
4. Build / test / proof

Protocol or interface changes always require rungs 1–4. Secondary review (G) is mandatory
before any release and after any protocol or interface change.

---

## What G Reviews

G (secondary reviewer / ChatGPT) provides adversarial review after each major version.
G's role is to find what the primary model normalised: protocol drift, interface leakage,
backward-compat breakage, over-strong documentation claims, legal copy that overclaims.

When briefing G, always use the secondary reviewer brief template from the Playbook §6.2.

---

## Legal Copy Rules

- Legal and marketing copy is **PROVISIONAL** until a formal legal pass is completed
- Never use the phrase "proves erasure" — use "proves the configured deletion/tombstoning transition"
- Never claim MKTd03 is a complete GDPR solution
- Never imply automatic multi-canister coverage — integration is per-canister
- The unlinking/pseudonymisation argument is supportive context, not a legal conclusion
- The CNIL (France) position on pseudonymisation is materially stricter than EDPB baseline —
  do not treat EDPB baseline as the ceiling for French deployments

---

## Enterprise Target Context

Top-5 prospects: **Nuance, Yuku AI Web3 Platform, DSCVR, B3Note, Distrikt**

Key pitch constraints:
- Nuance, DSCVR, and Distrikt are SNS/DAO-governed — no clear legal entity to sell to;
  architecture fit is high but sales conversion is harder than the technical fit suggests
- B3Note's anonymous model may reduce GDPR applicability — verify before pitching compliance angle
- Never pitch automatic multi-canister coverage — MKTd03 requires separate integration per canister
- Physical data remanence on ICP replicas is a known pitch liability — frame proactively

---

## Pitfalls — Do Not Repeat These

- Do not confuse MKTd03 (Tree mode, shared canister) with MKTd02 (Leaf mode, canister-per-user)
- Do not conflate architecture fit with sales convertibility in prospect analysis
- OpenChat is MKTd02 territory, not MKTd03
- Chain Fusion does not provide generic deletion semantics — most non-ICP chains are immutable;
  the tombstone/state-transition model does not apply to them by default
- Do not embed comments inside post structs — separate map only (settled decision, §above)
- Do not describe `profile_id` or `author_profile_id` as "non-PII" — pseudonymous identifiers
  may still constitute personal data if re-linkage is reasonably possible (GDPR Recital 26)

---

## Session State

Current session state is always in **RESTART_PACK.md** (repo root). Read it at session start.
Durable architectural decisions are in **MILESTONE_LOG.md** (repo root).

When a session closes:
- RESTART_PACK.md is overwritten with current state
- MILESTONE_LOG.md gets a new MILESTONE or SESSION LESSON entry appended (append-only)
- Both files are committed before the session ends
