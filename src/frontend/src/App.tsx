import { AuthClient } from "@dfinity/auth-client";
import { useEffect, useState, type FormEvent } from "react";
import { createTinypressActor } from "./lib/tinypress";
import type {
  Comment,
  Post,
  Profile,
  TinyPressError
} from "./declarations/tinypress/tinypress.did";

type SessionState = {
  isReady: boolean;
  isAuthenticated: boolean;
  principal: string | null;
  isBusy: boolean;
  error: string | null;
};

const identityProvider = import.meta.env.VITE_INTERNET_IDENTITY_CANISTER_ID
  ? import.meta.env.VITE_DFX_NETWORK === "local"
    ? `http://${import.meta.env.VITE_INTERNET_IDENTITY_CANISTER_ID}.localhost:4943/?raw=true`
    : "https://identity.ic0.app"
  : import.meta.env.VITE_DFX_NETWORK === "local"
    ? null
    : "https://identity.ic0.app";

// Pass 2A workaround: the current API exposes get_profile(profile_id) but not a
// caller-based profile lookup, so this browser remembers the created profile_id
// per signed-in principal until a later API shape replaces it.
const profileStorageKeyPrefix = "tinypress.profile_id";

type ProfileState = {
  status: "signed_out" | "idle" | "loading" | "ready";
  profile: Profile | null;
  storedProfileId: string | null;
  message: string | null;
};

type ProfileFormState = {
  handle: string;
  displayName: string;
  bio: string;
};

const emptyProfileForm: ProfileFormState = {
  handle: "",
  displayName: "",
  bio: ""
};

type PostFormState = {
  title: string;
  body: string;
};

type PostListState = {
  status: "idle" | "loading" | "ready";
  posts: Post[];
  message: string | null;
};

type CommentFormState = {
  content: string;
};

type CommentListState = {
  status: "idle" | "loading" | "ready";
  comments: Comment[];
  message: string | null;
};

const emptyPostForm: PostFormState = {
  title: "",
  body: ""
};

const emptyCommentForm: CommentFormState = {
  content: ""
};

function formatPrincipal(value: string | null): string {
  if (!value) {
    return "Not connected";
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-5)}`;
}

function formatDate(value: bigint): string {
  return new Date(Number(value) / 1_000_000).toLocaleString();
}

function formatNat64(value: bigint): string {
  return value.toString();
}

function getProfileStorageKey(principal: string): string {
  return `${profileStorageKeyPrefix}.${principal}`;
}

function readStoredProfileId(principal: string): string | null {
  return window.localStorage.getItem(getProfileStorageKey(principal));
}

function writeStoredProfileId(principal: string, profileId: bigint): void {
  window.localStorage.setItem(getProfileStorageKey(principal), profileId.toString());
}

function clearStoredProfileId(principal: string): void {
  window.localStorage.removeItem(getProfileStorageKey(principal));
}

function isRecoverableProfileLookupError(error: TinyPressError): boolean {
  return "NotFound" in error || "ProfileNotFound" in error || "Forbidden" in error;
}

function formatTinyPressError(error: TinyPressError): string {
  if ("InvalidInput" in error) {
    return error.InvalidInput;
  }

  if ("InternalError" in error) {
    return error.InternalError;
  }

  if ("AlreadyExists" in error) {
    return "This account already has a profile.";
  }

  if ("ProfileNotFound" in error || "NotFound" in error) {
    return "We couldn't find that profile.";
  }

  if ("Forbidden" in error) {
    return "This action isn't available for the current account.";
  }

  if ("PostNotFound" in error) {
    return "The requested record isn't available.";
  }

  return "Something went wrong. Please try again.";
}

export default function App() {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [session, setSession] = useState<SessionState>({
    isReady: false,
    isAuthenticated: false,
    principal: null,
    isBusy: true,
    error: null
  });
  const [profileState, setProfileState] = useState<ProfileState>({
    status: "signed_out",
    profile: null,
    storedProfileId: null,
    message: null
  });
  const [deletedProfileId, setDeletedProfileId] = useState<bigint | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [profileBusy, setProfileBusy] = useState(false);
  const [postForm, setPostForm] = useState<PostFormState>(emptyPostForm);
  const [postState, setPostState] = useState<PostListState>({
    status: "idle",
    posts: [],
    message: null
  });
  const [postBusy, setPostBusy] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<bigint | null>(null);
  const [commentForm, setCommentForm] = useState<CommentFormState>(emptyCommentForm);
  const [commentState, setCommentState] = useState<CommentListState>({
    status: "idle",
    comments: [],
    message: null
  });
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const client = await AuthClient.create();
        const isAuthenticated = await client.isAuthenticated();
        const principal = isAuthenticated
          ? client.getIdentity().getPrincipal().toText()
          : null;

        if (!isMounted) {
          return;
        }

        setAuthClient(client);
        setSession({
          isReady: true,
          isAuthenticated,
          principal,
          isBusy: false,
          error: null
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSession({
          isReady: true,
          isAuthenticated: false,
          principal: null,
          isBusy: false,
          error: error instanceof Error ? error.message : "Unable to load session."
        });
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!authClient || !session.isAuthenticated || !session.principal) {
        setDeletedProfileId(null);
        setProfileState({
          status: "signed_out",
          profile: null,
          storedProfileId: null,
          message: null
        });
        setProfileForm(emptyProfileForm);
        return;
      }

      const storedProfileId = readStoredProfileId(session.principal);

      if (!storedProfileId) {
        setProfileState({
          status: "idle",
          profile: null,
          storedProfileId: null,
          message: null
        });
        setProfileForm(emptyProfileForm);
        return;
      }

      setProfileState({
        status: "loading",
        profile: null,
        storedProfileId,
        message: null
      });

      try {
        const actor = await createTinypressActor(authClient.getIdentity());
        const result = await actor.get_profile(BigInt(storedProfileId));

        if (!isMounted) {
          return;
        }

        if ("Ok" in result) {
          setProfileState({
            status: "ready",
            profile: result.Ok,
            storedProfileId,
            message: null
          });
          return;
        }

        if (isRecoverableProfileLookupError(result.Err)) {
          clearStoredProfileId(session.principal);
          setProfileState({
            status: "idle",
            profile: null,
            storedProfileId: null,
            message: null
          });
          return;
        }

        setProfileState({
          status: "idle",
          profile: null,
          storedProfileId,
          message: formatTinyPressError(result.Err)
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setProfileState({
          status: "idle",
          profile: null,
          storedProfileId,
          message: error instanceof Error ? error.message : "Unable to load profile."
        });
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [authClient, session.isAuthenticated, session.principal]);

  useEffect(() => {
    let isMounted = true;
    const postOwnerProfileId = profileState.profile?.profile_id ?? deletedProfileId;

    async function loadPosts() {
      if (!authClient || !session.isAuthenticated || postOwnerProfileId === null) {
        setPostState({
          status: "idle",
          posts: [],
          message: null
        });
        setSelectedPostId(null);
        setCommentState({
          status: "idle",
          comments: [],
          message: null
        });
        return;
      }

      setPostState((current) => ({
        ...current,
        status: "loading",
        message: null
      }));

      try {
        const actor = await createTinypressActor(authClient.getIdentity());
        const posts = await actor.get_posts_by_author(postOwnerProfileId);

        if (!isMounted) {
          return;
        }

        setPostState({
          status: "ready",
          posts,
          message: null
        });

        setSelectedPostId((current) => {
          if (current && posts.some((post) => post.post_id === current)) {
            return current;
          }

          return posts[0]?.post_id ?? null;
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPostState({
          status: "ready",
          posts: [],
          message: error instanceof Error ? error.message : "Unable to load posts."
        });
        setSelectedPostId(null);
      }
    }

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, [authClient, deletedProfileId, profileState.profile, session.isAuthenticated]);

  useEffect(() => {
    let isMounted = true;

    async function loadComments() {
      if (!authClient || !session.isAuthenticated || selectedPostId === null) {
        setCommentState({
          status: "idle",
          comments: [],
          message: null
        });
        return;
      }

      setCommentState((current) => ({
        ...current,
        status: "loading",
        message: null
      }));

      try {
        const actor = await createTinypressActor(authClient.getIdentity());
        const result = await actor.get_comments_by_post(selectedPostId);

        if (!isMounted) {
          return;
        }

        if ("Err" in result) {
          setCommentState({
            status: "ready",
            comments: [],
            message: formatTinyPressError(result.Err)
          });
          return;
        }

        setCommentState({
          status: "ready",
          comments: result.Ok,
          message: null
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCommentState({
          status: "ready",
          comments: [],
          message: error instanceof Error ? error.message : "Unable to load comments."
        });
      }
    }

    void loadComments();

    return () => {
      isMounted = false;
    };
  }, [authClient, selectedPostId, session.isAuthenticated]);

  async function handleSignIn() {
    if (!authClient) {
      return;
    }

    if (!identityProvider) {
      setSession((current) => ({
        ...current,
        error: "Internet Identity is not configured for this environment."
      }));
      return;
    }

    setSession((current) => ({
      ...current,
      isBusy: true,
      error: null
    }));

    await new Promise<void>((resolve) => {
      authClient.login({
        identityProvider,
        onSuccess: () => {
          const principal = authClient.getIdentity().getPrincipal().toText();
          setSession({
            isReady: true,
            isAuthenticated: true,
            principal,
            isBusy: false,
            error: null
          });
          resolve();
        },
        onError: (error) => {
          setSession((current) => ({
            ...current,
            isBusy: false,
            error: typeof error === "string" ? error : "Sign in was interrupted."
          }));
          resolve();
        }
      });
    });
  }

  async function handleSignOut() {
    if (!authClient) {
      return;
    }

    setSession((current) => ({
      ...current,
      isBusy: true,
      error: null
    }));

    await authClient.logout();

    setSession({
      isReady: true,
      isAuthenticated: false,
      principal: null,
      isBusy: false,
      error: null
    });
  }

  function handleProfileFieldChange(field: keyof ProfileFormState, value: string) {
    setProfileForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authClient || !session.principal) {
      return;
    }

    setProfileBusy(true);
    setProfileState((current) => ({
      ...current,
      message: null
    }));

    try {
      const actor = await createTinypressActor(authClient.getIdentity());
      const result = await actor.create_profile(
        profileForm.handle.trim(),
        profileForm.displayName.trim(),
        profileForm.bio.trim(),
      );

      if ("Err" in result) {
        setProfileState((current) => ({
          ...current,
          message: formatTinyPressError(result.Err)
        }));
        return;
      }

      writeStoredProfileId(session.principal, result.Ok);
      const profileResult = await actor.get_profile(result.Ok);

      if ("Err" in profileResult) {
        setProfileState({
          status: "idle",
          profile: null,
          storedProfileId: result.Ok.toString(),
          message: formatTinyPressError(profileResult.Err)
        });
        return;
      }

      setProfileState({
        status: "ready",
        profile: profileResult.Ok,
        storedProfileId: result.Ok.toString(),
        message: null
      });
      setDeletedProfileId(null);
      setProfileForm(emptyProfileForm);
    } catch (error) {
      setProfileState((current) => ({
        ...current,
        message: error instanceof Error ? error.message : "Unable to save your profile."
      }));
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleDeleteProfile() {
    if (!authClient || !session.principal || !profileState.profile) {
      return;
    }

    const removedProfileId = profileState.profile.profile_id;
    setProfileBusy(true);
    setProfileState((current) => ({
      ...current,
      message: null
    }));

    try {
      const actor = await createTinypressActor(authClient.getIdentity());
      const result = await actor.delete_profile(profileState.profile.profile_id);

      if ("Err" in result) {
        setProfileState((current) => ({
          ...current,
          message: formatTinyPressError(result.Err)
        }));
        return;
      }

      clearStoredProfileId(session.principal);
      setDeletedProfileId(removedProfileId);
      setProfileState({
        status: "idle",
        profile: null,
        storedProfileId: null,
        message: null
      });
      setProfileForm(emptyProfileForm);
    } catch (error) {
      setProfileState((current) => ({
        ...current,
        message: error instanceof Error ? error.message : "Unable to remove your profile."
      }));
    } finally {
      setProfileBusy(false);
    }
  }

  function handlePostFieldChange(field: keyof PostFormState, value: string) {
    setPostForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authClient || !profileState.profile) {
      return;
    }

    setPostBusy(true);
    setPostState((current) => ({
      ...current,
      message: null
    }));

    try {
      const actor = await createTinypressActor(authClient.getIdentity());
      const result = await actor.create_post(postForm.title.trim(), postForm.body.trim());

      if ("Err" in result) {
        setPostState((current) => ({
          ...current,
          message: formatTinyPressError(result.Err)
        }));
        return;
      }

      const posts = await actor.get_posts_by_author(profileState.profile.profile_id);
      setPostState({
        status: "ready",
        posts,
        message: null
      });
      setSelectedPostId(result.Ok);
      setPostForm(emptyPostForm);
    } catch (error) {
      setPostState((current) => ({
        ...current,
        message: error instanceof Error ? error.message : "Unable to publish your post."
      }));
    } finally {
      setPostBusy(false);
    }
  }

  function handleCommentFieldChange(value: string) {
    setCommentForm({
      content: value
    });
  }

  async function handleCreateComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authClient || selectedPostId === null) {
      return;
    }

    setCommentBusy(true);
    setCommentState((current) => ({
      ...current,
      message: null
    }));

    try {
      const actor = await createTinypressActor(authClient.getIdentity());
      const result = await actor.create_comment(selectedPostId, commentForm.content.trim());

      if ("Err" in result) {
        setCommentState((current) => ({
          ...current,
          message: formatTinyPressError(result.Err)
        }));
        return;
      }

      const comments = await actor.get_comments_by_post(selectedPostId);

      if ("Err" in comments) {
        setCommentState({
          status: "ready",
          comments: [],
          message: formatTinyPressError(comments.Err)
        });
        return;
      }

      setCommentState({
        status: "ready",
        comments: comments.Ok,
        message: null
      });
      setCommentForm(emptyCommentForm);
    } catch (error) {
      setCommentState((current) => ({
        ...current,
        message: error instanceof Error ? error.message : "Unable to publish your comment."
      }));
    } finally {
      setCommentBusy(false);
    }
  }

  const selectedPost = postState.posts.find((post) => post.post_id === selectedPostId) ?? null;
  const visibleProfileId = profileState.profile?.profile_id ?? deletedProfileId;
  const showingOrphanedPosts = profileState.profile === null && deletedProfileId !== null;

  return (
    <div className="shell">
      <div className="shell__glow shell__glow--left" />
      <div className="shell__glow shell__glow--right" />

      <main className="app">
        <section className="hero">
          <p className="hero__eyebrow">TinyPress</p>
          <div className="hero__copy">
            <h1>Write, publish, and keep the conversation moving.</h1>
            <p>
              A lightweight publishing app for short posts, personal profiles,
              and thoughtful replies.
            </p>
          </div>

          <div className="auth-card">
            <div>
              <p className="auth-card__label">Session</p>
              <h2>{session.isAuthenticated ? "Signed in" : "Guest mode"}</h2>
            </div>

            <dl className="auth-card__details">
              <div>
                <dt>Principal</dt>
                <dd>{session.isReady ? formatPrincipal(session.principal) : "Loading"}</dd>
              </div>
              <div>
                <dt>Identity</dt>
                <dd>{session.isAuthenticated ? "Internet Identity" : "Connect to continue"}</dd>
              </div>
            </dl>

            {session.error ? <p className="auth-card__error">{session.error}</p> : null}

            <div className="auth-card__actions">
              <button
                type="button"
                className="button button--primary"
                onClick={handleSignIn}
                disabled={session.isBusy || session.isAuthenticated}
              >
                Sign in
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={handleSignOut}
                disabled={session.isBusy || !session.isAuthenticated}
              >
                Sign out
              </button>
            </div>
          </div>
        </section>

        <section className="panel-grid" aria-label="Publishing workspace">
          <article className="panel panel--profile">
            <p className="panel__kicker">Profile</p>
            <h2>Your profile</h2>

            {!session.isAuthenticated ? (
              <p>Sign in to set up your handle and profile details.</p>
            ) : profileState.status === "loading" ? (
              <p>Loading your profile…</p>
            ) : profileState.profile ? (
              <div className="profile-summary">
                <dl className="profile-summary__details">
                  <div>
                    <dt>Handle</dt>
                    <dd>@{profileState.profile.handle}</dd>
                  </div>
                  <div>
                    <dt>Name</dt>
                    <dd>{profileState.profile.display_name}</dd>
                  </div>
                  <div>
                    <dt>Bio</dt>
                    <dd>{profileState.profile.bio || "No bio added yet."}</dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd>{formatDate(profileState.profile.created_at)}</dd>
                  </div>
                </dl>

                <div className="profile-summary__actions">
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={handleDeleteProfile}
                    disabled={profileBusy}
                  >
                    Delete profile
                  </button>
                </div>
              </div>
            ) : (
              <form className="profile-form" onSubmit={handleCreateProfile}>
                <label className="field">
                  <span>Handle</span>
                  <input
                    type="text"
                    value={profileForm.handle}
                    onChange={(event) => handleProfileFieldChange("handle", event.target.value)}
                    placeholder="tinypresswriter"
                    maxLength={32}
                    required
                  />
                </label>

                <label className="field">
                  <span>Display name</span>
                  <input
                    type="text"
                    value={profileForm.displayName}
                    onChange={(event) =>
                      handleProfileFieldChange("displayName", event.target.value)
                    }
                    placeholder="Tiny Press"
                    maxLength={64}
                    required
                  />
                </label>

                <label className="field">
                  <span>Bio</span>
                  <textarea
                    value={profileForm.bio}
                    onChange={(event) => handleProfileFieldChange("bio", event.target.value)}
                    placeholder="Write a short introduction."
                    rows={4}
                    maxLength={280}
                  />
                </label>

                <button
                  type="submit"
                  className="button button--primary"
                  disabled={profileBusy}
                >
                  Save profile
                </button>
              </form>
            )}

            {profileState.message ? (
              <p className="auth-card__error">{profileState.message}</p>
            ) : null}
          </article>

          <article className="panel">
            <p className="panel__kicker">Write</p>
            <h2>New post</h2>

            {!session.isAuthenticated ? (
              <p>Sign in to publish from your profile.</p>
            ) : !profileState.profile ? (
              <p>Create a profile before publishing a post.</p>
            ) : (
              <form className="profile-form" onSubmit={handleCreatePost}>
                <label className="field">
                  <span>Title</span>
                  <input
                    type="text"
                    value={postForm.title}
                    onChange={(event) => handlePostFieldChange("title", event.target.value)}
                    placeholder="A note from TinyPress"
                    maxLength={120}
                    required
                  />
                </label>

                <label className="field">
                  <span>Body</span>
                  <textarea
                    value={postForm.body}
                    onChange={(event) => handlePostFieldChange("body", event.target.value)}
                    placeholder="Write your post."
                    rows={6}
                  />
                </label>

                <button
                  type="submit"
                  className="button button--primary"
                  disabled={postBusy}
                >
                  Publish post
                </button>
              </form>
            )}

            {postState.message ? <p className="auth-card__error">{postState.message}</p> : null}
          </article>

          <article className="panel">
            <p className="panel__kicker">Feed</p>
            <h2>{showingOrphanedPosts ? "Published posts" : "Your posts"}</h2>

            {visibleProfileId === null ? (
              <p>Create a profile to start publishing.</p>
            ) : postState.status === "loading" ? (
              <p>Loading posts…</p>
            ) : postState.posts.length === 0 ? (
              <p>No posts yet.</p>
            ) : (
              <div className="profile-summary">
                {showingOrphanedPosts ? (
                  <p className="panel__hint">
                    Posts from profile #{formatNat64(visibleProfileId)} remain visible.
                  </p>
                ) : null}

                <div className="profile-summary__actions">
                  {postState.posts.map((post) => (
                    <button
                      key={post.post_id.toString()}
                      type="button"
                      className="button button--secondary"
                      onClick={() => setSelectedPostId(post.post_id)}
                    >
                      {post.title}
                    </button>
                  ))}
                </div>

                {selectedPost ? (
                  <dl className="profile-summary__details">
                    <div>
                      <dt>Title</dt>
                      <dd>{selectedPost.title}</dd>
                    </div>
                    <div>
                      <dt>Author</dt>
                      <dd>@{selectedPost.creator_handle}</dd>
                    </div>
                    <div>
                      <dt>Published</dt>
                      <dd>{formatDate(selectedPost.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Body</dt>
                      <dd>{selectedPost.body}</dd>
                    </div>
                  </dl>
                ) : null}
              </div>
            )}

            {postState.message ? <p className="auth-card__error">{postState.message}</p> : null}
          </article>

          <article className="panel">
            <p className="panel__kicker">Comments</p>
            <h2>Conversation</h2>

            {!selectedPost ? (
              <p>Select a post to read and add comments.</p>
            ) : (
              <div className="profile-summary">
                <dl className="profile-summary__details">
                  <div>
                    <dt>Post</dt>
                    <dd>{selectedPost.title}</dd>
                  </div>
                </dl>

                {commentState.status === "loading" ? (
                  <p>Loading comments…</p>
                ) : commentState.comments.length === 0 ? (
                  <p>No comments yet.</p>
                ) : (
                  <dl className="profile-summary__details">
                    {commentState.comments.map((comment) => (
                      <div key={comment.comment_id.toString()}>
                        <dt>Comment #{formatNat64(comment.comment_id)}</dt>
                        <dd>{comment.content}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {profileState.profile ? (
                  <form className="profile-form" onSubmit={handleCreateComment}>
                    <label className="field">
                      <span>Add a comment</span>
                      <textarea
                        value={commentForm.content}
                        onChange={(event) => handleCommentFieldChange(event.target.value)}
                        placeholder="Join the conversation."
                        rows={4}
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      className="button button--primary"
                      disabled={commentBusy}
                    >
                      Post comment
                    </button>
                  </form>
                ) : session.isAuthenticated ? (
                  <p>Create a profile to add a comment.</p>
                ) : null}
              </div>
            )}

            {commentState.message ? (
              <p className="auth-card__error">{commentState.message}</p>
            ) : null}
          </article>
        </section>
      </main>
    </div>
  );
}
