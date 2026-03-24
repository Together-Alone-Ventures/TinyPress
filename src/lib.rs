// TinyPress v1 implementation
//
// Together Alone Ventures · March 2026
// Spec: TinyPress ADR + Interface Spec v1.1
//
// HARD CONSTRAINTS (from ADR):
//   - Author identity derived from caller principal; never caller-supplied (ADR-03)
//   - handle is immutable after creation (spec §4.2)
//
// Memory layout (MemoryManager IDs — do not change without migration):
//   MemoryId(0) — profiles:            StableBTreeMap<u64, Profile>
//   MemoryId(1) — principal_index:     StableBTreeMap<StorablePrincipal, u64>
//   MemoryId(2) — profile_counter:     StableCell<u64>
//   MemoryId(3) — handle_index:        StableBTreeMap<String, u64>  (handle -> profile_id)
//   MemoryId(4) — posts:               StableBTreeMap<u64, Post>
//   MemoryId(5) — post_counter:        StableCell<u64>
//   MemoryId(6) — posts_by_author:     StableBTreeMap<PostAuthorKey, ()>
//   MemoryId(7) — comments:            StableBTreeMap<u64, StoredComment>
//   MemoryId(8) — comment_counter:     StableCell<u64>
//   MemoryId(9) — comments_by_post:    StableBTreeMap<CommentPostKey, ()>
//   MemoryId(10) — comments_by_author: StableBTreeMap<CommentAuthorKey, ()>
//
// ic-cdk 0.19.0 notes:
//   - ic_cdk::api::caller() is deprecated but still present; suppressed below
//   - ic-stable-structures 0.7.2: StableCell::init() returns StableCell directly (not Result)
//   - ic-stable-structures 0.7.2: StableCell::set() returns old value (not Result)
//   - ic-stable-structures 0.7.2: Storable requires both to_bytes AND into_bytes

#![allow(deprecated)]

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::{caller, time};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::Bound,
    DefaultMemoryImpl, StableBTreeMap, StableCell, Storable,
};
use std::borrow::Cow;
use std::cell::RefCell;

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------

const TINYPRESS_SCHEMA_VERSION: u32 = 1;

// ---------------------------------------------------------------------------
// Memory type alias
// ---------------------------------------------------------------------------

type Memory = VirtualMemory<DefaultMemoryImpl>;

// ---------------------------------------------------------------------------
// Stable memory initialisation
// ---------------------------------------------------------------------------

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // MemoryId(0): profiles map — primary record store
    static PROFILES: RefCell<StableBTreeMap<u64, Profile, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))),
        )
    );

    // MemoryId(1): principal -> profile_id index
    static PRINCIPAL_INDEX: RefCell<StableBTreeMap<StorablePrincipal, u64, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))),
        ));

    // MemoryId(2): monotonic profile ID counter (auto-increment, never reused — ADR-07)
    // StableCell::init() returns StableCell directly in 0.7.2 — no Result/expect
    static PROFILE_COUNTER: RefCell<StableCell<u64, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))),
            0u64,
        )
    );

    // MemoryId(3): handle -> profile_id index (O(1) uniqueness check; avoids full scan)
    static HANDLE_INDEX: RefCell<StableBTreeMap<String, u64, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))),
        ));

    // MemoryId(4): posts map — primary record store
    static POSTS: RefCell<StableBTreeMap<u64, Post, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4))),
        )
    );

    // MemoryId(5): monotonic post ID counter
    static POST_COUNTER: RefCell<StableCell<u64, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(5))),
            0u64,
        )
    );

    // MemoryId(6): secondary index author_profile_id + post_id -> ()
    static POSTS_BY_AUTHOR: RefCell<StableBTreeMap<PostAuthorKey, (), Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(6))),
        ));

    // MemoryId(7): comments map — primary record store
    static COMMENTS: RefCell<StableBTreeMap<u64, StoredComment, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(7))),
        )
    );

    // MemoryId(8): monotonic comment ID counter
    static COMMENT_COUNTER: RefCell<StableCell<u64, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(8))),
            0u64,
        )
    );

    // MemoryId(9): secondary index post_id + comment_id -> ()
    static COMMENTS_BY_POST: RefCell<StableBTreeMap<CommentPostKey, (), Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(9))),
        ));

    // MemoryId(10): secondary index author_profile_id + comment_id -> ()
    static COMMENTS_BY_AUTHOR: RefCell<StableBTreeMap<CommentAuthorKey, (), Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(10))),
        ));
}

// ---------------------------------------------------------------------------
// StorablePrincipal — Storable wrapper for ICP Principal
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorablePrincipal(Principal);

impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.as_slice().to_vec()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorablePrincipal(Principal::from_slice(bytes.as_ref()))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 29,
        is_fixed_size: false,
    };
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/// Profile record.
/// Field named `owner` not `principal` — `principal` is a reserved Candid keyword.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Profile {
    pub profile_id:   u64,
    pub owner:        Principal,
    pub handle:       String,
    pub display_name: String,
    pub bio:          String,
    pub created_at:   u64,
}

impl Storable for Profile {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(candid::encode_one(self).expect("Profile serialisation failed"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::encode_one(&self).expect("Profile serialisation failed")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(bytes.as_ref()).expect("Profile deserialisation failed")
    }

    const BOUND: Bound = Bound::Unbounded;
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Post {
    pub post_id:           u64,
    pub author_profile_id: u64,
    pub title:             String,
    pub body:              String,
    pub created_at:        u64,
    pub creator_handle:    String,
}

impl Storable for Post {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(candid::encode_one(self).expect("Post serialisation failed"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::encode_one(&self).expect("Post serialisation failed")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(bytes.as_ref()).expect("Post deserialisation failed")
    }

    const BOUND: Bound = Bound::Unbounded;
}

#[derive(Deserialize, Clone, Debug)]
pub struct StoredComment {
    pub comment_id:          u64,
    pub post_id:             u64,
    pub author_profile_id:   u64,
    pub content:             String,
    pub created_at:          u64,
    pub reply_to_comment_id: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct StoredCommentCodec {
    comment_id:          u64,
    post_id:             u64,
    author_profile_id:   u64,
    content:             String,
    created_at:          u64,
    reply_to_comment_id: Option<u64>,
}

impl Storable for StoredComment {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(
            candid::encode_one(StoredCommentCodec::from(self.clone()))
                .expect("Comment serialisation failed"),
        )
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::encode_one(StoredCommentCodec::from(self)).expect("Comment serialisation failed")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let comment: StoredCommentCodec =
            candid::decode_one(bytes.as_ref()).expect("Comment deserialisation failed");
        comment.into()
    }

    const BOUND: Bound = Bound::Unbounded;
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Comment {
    pub comment_id:        u64,
    pub post_id:           u64,
    pub author_profile_id: u64,
    pub content:           String,
    pub created_at:        u64,
}

impl From<StoredComment> for Comment {
    fn from(comment: StoredComment) -> Self {
        Self {
            comment_id: comment.comment_id,
            post_id: comment.post_id,
            author_profile_id: comment.author_profile_id,
            content: comment.content,
            created_at: comment.created_at,
        }
    }
}

impl From<StoredComment> for StoredCommentCodec {
    fn from(comment: StoredComment) -> Self {
        Self {
            comment_id: comment.comment_id,
            post_id: comment.post_id,
            author_profile_id: comment.author_profile_id,
            content: comment.content,
            created_at: comment.created_at,
            reply_to_comment_id: comment.reply_to_comment_id,
        }
    }
}

impl From<StoredCommentCodec> for StoredComment {
    fn from(comment: StoredCommentCodec) -> Self {
        Self {
            comment_id: comment.comment_id,
            post_id: comment.post_id,
            author_profile_id: comment.author_profile_id,
            content: comment.content,
            created_at: comment.created_at,
            reply_to_comment_id: comment.reply_to_comment_id,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct PostAuthorKey {
    pub author_profile_id: u64,
    pub post_id:           u64,
}

impl Storable for PostAuthorKey {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let mut bytes = Vec::with_capacity(16);
        bytes.extend_from_slice(&self.author_profile_id.to_be_bytes());
        bytes.extend_from_slice(&self.post_id.to_be_bytes());
        Cow::Owned(bytes)
    }

    fn into_bytes(self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(16);
        bytes.extend_from_slice(&self.author_profile_id.to_be_bytes());
        bytes.extend_from_slice(&self.post_id.to_be_bytes());
        bytes
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let bytes = bytes.as_ref();
        let author_profile_id = u64::from_be_bytes(
            bytes[0..8]
                .try_into()
                .expect("PostAuthorKey author_profile_id bytes must be 8 bytes"),
        );
        let post_id = u64::from_be_bytes(
            bytes[8..16]
                .try_into()
                .expect("PostAuthorKey post_id bytes must be 8 bytes"),
        );

        Self {
            author_profile_id,
            post_id,
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 16,
        is_fixed_size: true,
    };
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct CommentPostKey {
    pub post_id:    u64,
    pub comment_id: u64,
}

impl Storable for CommentPostKey {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let mut bytes = Vec::with_capacity(16);
        bytes.extend_from_slice(&self.post_id.to_be_bytes());
        bytes.extend_from_slice(&self.comment_id.to_be_bytes());
        Cow::Owned(bytes)
    }

    fn into_bytes(self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(16);
        bytes.extend_from_slice(&self.post_id.to_be_bytes());
        bytes.extend_from_slice(&self.comment_id.to_be_bytes());
        bytes
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let bytes = bytes.as_ref();
        let post_id = u64::from_be_bytes(
            bytes[0..8]
                .try_into()
                .expect("CommentPostKey post_id bytes must be 8 bytes"),
        );
        let comment_id = u64::from_be_bytes(
            bytes[8..16]
                .try_into()
                .expect("CommentPostKey comment_id bytes must be 8 bytes"),
        );

        Self {
            post_id,
            comment_id,
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 16,
        is_fixed_size: true,
    };
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct CommentAuthorKey {
    pub author_profile_id: u64,
    pub comment_id:        u64,
}

impl Storable for CommentAuthorKey {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let mut bytes = Vec::with_capacity(16);
        bytes.extend_from_slice(&self.author_profile_id.to_be_bytes());
        bytes.extend_from_slice(&self.comment_id.to_be_bytes());
        Cow::Owned(bytes)
    }

    fn into_bytes(self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(16);
        bytes.extend_from_slice(&self.author_profile_id.to_be_bytes());
        bytes.extend_from_slice(&self.comment_id.to_be_bytes());
        bytes
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let bytes = bytes.as_ref();
        let author_profile_id = u64::from_be_bytes(
            bytes[0..8]
                .try_into()
                .expect("CommentAuthorKey author_profile_id bytes must be 8 bytes"),
        );
        let comment_id = u64::from_be_bytes(
            bytes[8..16]
                .try_into()
                .expect("CommentAuthorKey comment_id bytes must be 8 bytes"),
        );

        Self {
            author_profile_id,
            comment_id,
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 16,
        is_fixed_size: true,
    };
}

/// Diagnostic status (ADR-09). Aggregate counts only — no per-record data.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TinypressStatus {
    pub schema_version: u32,
    pub profile_count:  u64,
    pub post_count:     u64,
    pub comment_count:  u64,
    pub status:         String,
}

/// Error type (spec §4.1). All variants explicit — no silent failures (Principle 5).
/// NotFound and Forbidden are distinct — conflating them leaks information.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TinyPressError {
    NotFound,
    Forbidden,
    AlreadyExists,
    ProfileNotFound,
    PostNotFound,
    InvalidInput(String),
    InternalError(String),
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn is_valid_required_text(s: &str) -> bool {
    !s.trim().is_empty()
}

fn next_profile_id() -> u64 {
    PROFILE_COUNTER.with(|c| {
        let mut cell = c.borrow_mut();
        let next = cell.get() + 1;
        let _ = cell.set(next);
        next
    })
}

fn next_post_id() -> u64 {
    POST_COUNTER.with(|c| {
        let mut cell = c.borrow_mut();
        let next = cell.get() + 1;
        let _ = cell.set(next);
        next
    })
}

fn next_comment_id() -> u64 {
    COMMENT_COUNTER.with(|c| {
        let mut cell = c.borrow_mut();
        let next = cell.get() + 1;
        let _ = cell.set(next);
        next
    })
}

// ---------------------------------------------------------------------------
// Stage 1 — Profile operations (spec §4.2)
// ---------------------------------------------------------------------------

#[ic_cdk::update]
fn create_profile(
    handle: String,
    display_name: String,
    bio: String,
) -> Result<u64, TinyPressError> {
    let caller = caller();

    if !is_valid_required_text(&handle) {
        return Err(TinyPressError::InvalidInput(
            "handle must be non-empty and non-whitespace-only".to_string(),
        ));
    }
    if !is_valid_required_text(&display_name) {
        return Err(TinyPressError::InvalidInput(
            "display_name must be non-empty and non-whitespace-only".to_string(),
        ));
    }

    if PRINCIPAL_INDEX.with(|idx| idx.borrow().contains_key(&StorablePrincipal(caller))) {
        return Err(TinyPressError::AlreadyExists);
    }

    if HANDLE_INDEX.with(|h| h.borrow().contains_key(&handle)) {
        return Err(TinyPressError::AlreadyExists);
    }

    let profile_id = next_profile_id();

    let profile = Profile {
        profile_id,
        owner: caller,
        handle: handle.clone(),
        display_name,
        bio,
        created_at: time(),
    };

    PROFILES.with(|p| p.borrow_mut().insert(profile_id, profile));
    PRINCIPAL_INDEX.with(|idx| idx.borrow_mut().insert(StorablePrincipal(caller), profile_id));
    HANDLE_INDEX.with(|h| h.borrow_mut().insert(handle, profile_id));

    Ok(profile_id)
}

#[ic_cdk::query]
fn get_profile(profile_id: u64) -> Result<Profile, TinyPressError> {
    PROFILES
        .with(|p| p.borrow().get(&profile_id))
        .ok_or(TinyPressError::NotFound)
}

#[ic_cdk::update]
fn update_profile(display_name: String, bio: String) -> Result<(), TinyPressError> {
    let caller = caller();

    let profile_id = PRINCIPAL_INDEX
        .with(|idx| idx.borrow().get(&StorablePrincipal(caller)))
        .ok_or(TinyPressError::ProfileNotFound)?;

    let mut profile = PROFILES
        .with(|p| p.borrow().get(&profile_id))
        .ok_or(TinyPressError::InternalError(
            "Principal index references missing profile".to_string(),
        ))?;

    profile.display_name = display_name;
    profile.bio = bio;

    PROFILES.with(|p| p.borrow_mut().insert(profile_id, profile));

    Ok(())
}

#[ic_cdk::update]
fn delete_profile(profile_id: u64) -> Result<(), TinyPressError> {
    let caller = caller();

    let profile = PROFILES
        .with(|p| p.borrow().get(&profile_id))
        .ok_or(TinyPressError::NotFound)?;

    if profile.owner != caller {
        return Err(TinyPressError::Forbidden);
    }

    PROFILES.with(|p| p.borrow_mut().remove(&profile_id));
    PRINCIPAL_INDEX.with(|idx| idx.borrow_mut().remove(&StorablePrincipal(caller)));
    HANDLE_INDEX.with(|h| h.borrow_mut().remove(&profile.handle));

    Ok(())
}

// ---------------------------------------------------------------------------
// Stage 2 — Post operations (spec §4.3).
// ---------------------------------------------------------------------------

#[ic_cdk::update]
fn create_post(title: String, body: String) -> Result<u64, TinyPressError> {
    if !is_valid_required_text(&title) {
        return Err(TinyPressError::InvalidInput(
            "title must be non-empty and non-whitespace-only".to_string(),
        ));
    }

    let caller = caller();

    let author_profile_id = PRINCIPAL_INDEX
        .with(|idx| idx.borrow().get(&StorablePrincipal(caller)))
        .ok_or(TinyPressError::ProfileNotFound)?;

    let creator_handle = PROFILES
        .with(|p| p.borrow().get(&author_profile_id))
        .ok_or(TinyPressError::InternalError(
            "Principal index references missing profile".to_string(),
        ))?
        .handle;

    let post_id = next_post_id();
    let post = Post {
        post_id,
        author_profile_id,
        title,
        body,
        created_at: time(),
        creator_handle,
    };

    POSTS.with(|p| p.borrow_mut().insert(post_id, post));
    POSTS_BY_AUTHOR.with(|index| {
        index.borrow_mut().insert(
            PostAuthorKey {
                author_profile_id,
                post_id,
            },
            (),
        )
    });

    Ok(post_id)
}

#[ic_cdk::query]
fn get_post(post_id: u64) -> Result<Post, TinyPressError> {
    POSTS
        .with(|p| p.borrow().get(&post_id))
        .ok_or(TinyPressError::NotFound)
}

#[ic_cdk::query]
fn get_posts_by_author(profile_id: u64) -> Vec<Post> {
    let start = PostAuthorKey {
        author_profile_id: profile_id,
        post_id: 0,
    };
    let end = PostAuthorKey {
        author_profile_id: profile_id,
        post_id: u64::MAX,
    };

    POSTS_BY_AUTHOR.with(|index| {
        index
            .borrow()
            .range(start..=end)
            .map(|entry| {
                let key = entry.key().clone();
                POSTS.with(|posts| {
                    posts.borrow().get(&key.post_id).unwrap_or_else(|| {
                        panic!(
                            "Invariant violation: POSTS_BY_AUTHOR references missing POSTS entry for post_id {} and author_profile_id {}",
                            key.post_id,
                            key.author_profile_id
                        )
                    })
                })
            })
            .collect()
    })
}

#[ic_cdk::update]
fn delete_post(post_id: u64) -> Result<(), TinyPressError> {
    let post = POSTS
        .with(|p| p.borrow().get(&post_id))
        .ok_or(TinyPressError::NotFound)?;

    let caller = caller();

    let caller_profile_id = PRINCIPAL_INDEX
        .with(|idx| idx.borrow().get(&StorablePrincipal(caller)))
        .ok_or(TinyPressError::ProfileNotFound)?;

    if caller_profile_id != post.author_profile_id {
        return Err(TinyPressError::Forbidden);
    }

    POSTS.with(|p| p.borrow_mut().remove(&post_id));
    POSTS_BY_AUTHOR.with(|index| {
        index.borrow_mut().remove(&PostAuthorKey {
            author_profile_id: post.author_profile_id,
            post_id,
        })
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// Stage 3 — Comment operations (spec §4.4).
// ---------------------------------------------------------------------------

#[ic_cdk::update]
fn create_comment(post_id: u64, content: String) -> Result<u64, TinyPressError> {
    if !is_valid_required_text(&content) {
        return Err(TinyPressError::InvalidInput(
            "content must be non-empty and non-whitespace-only".to_string(),
        ));
    }

    let caller = caller();

    let author_profile_id = PRINCIPAL_INDEX
        .with(|idx| idx.borrow().get(&StorablePrincipal(caller)))
        .ok_or(TinyPressError::ProfileNotFound)?;

    if !POSTS.with(|p| p.borrow().contains_key(&post_id)) {
        return Err(TinyPressError::PostNotFound);
    }

    let comment_id = next_comment_id();
    let comment = StoredComment {
        comment_id,
        post_id,
        author_profile_id,
        content,
        created_at: time(),
        reply_to_comment_id: None,
    };

    COMMENTS.with(|c| c.borrow_mut().insert(comment_id, comment));
    COMMENTS_BY_POST.with(|index| {
        index
            .borrow_mut()
            .insert(CommentPostKey { post_id, comment_id }, ())
    });
    COMMENTS_BY_AUTHOR.with(|index| {
        index.borrow_mut().insert(
            CommentAuthorKey {
                author_profile_id,
                comment_id,
            },
            (),
        )
    });

    Ok(comment_id)
}

#[ic_cdk::query]
fn get_comments_by_post(post_id: u64) -> Result<Vec<Comment>, TinyPressError> {
    if !POSTS.with(|p| p.borrow().contains_key(&post_id)) {
        return Err(TinyPressError::PostNotFound);
    }

    let start = CommentPostKey {
        post_id,
        comment_id: 0,
    };
    let end = CommentPostKey {
        post_id,
        comment_id: u64::MAX,
    };

    let comments = COMMENTS_BY_POST.with(|index| {
        index
            .borrow()
            .range(start..=end)
            .map(|entry| {
                let key = entry.key().clone();
                COMMENTS.with(|comments| {
                    comments.borrow().get(&key.comment_id).unwrap_or_else(|| {
                        panic!(
                            "Invariant violation: COMMENTS_BY_POST references missing COMMENTS entry for comment_id {} and post_id {}",
                            key.comment_id,
                            key.post_id
                        )
                    })
                })
            })
            .map(Comment::from)
            .collect()
    });

    Ok(comments)
}

#[ic_cdk::update]
fn delete_comment(comment_id: u64) -> Result<(), TinyPressError> {
    let comment = COMMENTS
        .with(|c| c.borrow().get(&comment_id))
        .ok_or(TinyPressError::NotFound)?;

    let caller = caller();

    let caller_profile_id = PRINCIPAL_INDEX
        .with(|idx| idx.borrow().get(&StorablePrincipal(caller)))
        .ok_or(TinyPressError::ProfileNotFound)?;

    if caller_profile_id != comment.author_profile_id {
        return Err(TinyPressError::Forbidden);
    }

    COMMENTS.with(|c| c.borrow_mut().remove(&comment_id));
    COMMENTS_BY_POST.with(|index| {
        index.borrow_mut().remove(&CommentPostKey {
            post_id: comment.post_id,
            comment_id,
        })
    });
    COMMENTS_BY_AUTHOR.with(|index| {
        index.borrow_mut().remove(&CommentAuthorKey {
            author_profile_id: comment.author_profile_id,
            comment_id,
        })
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// Diagnostic query (ADR-09)
// ---------------------------------------------------------------------------

#[ic_cdk::query]
fn tinypress_status() -> TinypressStatus {
    TinypressStatus {
        schema_version: TINYPRESS_SCHEMA_VERSION,
        profile_count:  PROFILES.with(|p| p.borrow().len()),
        post_count:     POSTS.with(|p| p.borrow().len()),
        comment_count:  COMMENTS.with(|c| c.borrow().len()),
        status:         "ok".to_string(),
    }
}
