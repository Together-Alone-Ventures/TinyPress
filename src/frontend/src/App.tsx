import { AuthClient } from "@dfinity/auth-client";
import { useEffect, useState, type FormEvent } from "react";
import { createTinypressActor } from "./lib/tinypress";
import type { Profile, TinyPressError } from "./declarations/tinypress/tinypress.did";

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

const appPanels = [
  {
    title: "Write",
    body: "Draft a post with a clear title and publish it to your page."
  },
  {
    title: "Feed",
    body: "Browse recent writing and open a post to read the full piece."
  },
  {
    title: "Comments",
    body: "Join the conversation with short responses on each post."
  }
] as const;

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
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [profileBusy, setProfileBusy] = useState(false);

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

          {appPanels.map((panel) => (
            <article key={panel.title} className="panel">
              <p className="panel__kicker">{panel.title}</p>
              <h2>{panel.title}</h2>
              <p>{panel.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
