import { AuthClient } from "@dfinity/auth-client";
import { useEffect, useState } from "react";

type SessionState = {
  isReady: boolean;
  isAuthenticated: boolean;
  principal: string | null;
  isBusy: boolean;
  error: string | null;
};

const identityProvider = import.meta.env.VITE_INTERNET_IDENTITY_CANISTER_ID
  ? import.meta.env.DEV
    ? `http://${import.meta.env.VITE_INTERNET_IDENTITY_CANISTER_ID}.localhost:4943/`
    : "https://identity.ic0.app"
  : import.meta.env.DEV
    ? null
    : "https://identity.ic0.app";

const appPanels = [
  {
    title: "Profile",
    body: "Set your handle, display name, and bio so your writing has a home."
  },
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

function formatPrincipal(value: string | null): string {
  if (!value) {
    return "Not connected";
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-5)}`;
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
        onSuccess: async () => {
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
