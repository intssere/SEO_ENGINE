import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AppRole = "viewer" | "operator" | "admin";

type AuthSessionResponse = {
  version: string;
  enforcementEnabled: boolean;
  configured: boolean;
  authenticated: boolean;
  user: null | {
    email: string;
    displayName: string | null;
    role: AppRole;
    expiresAt?: string;
  };
};

type AuthContextValue = {
  enforcementEnabled: boolean;
  authenticated: boolean;
  user: AuthSessionResponse["user"];
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
let secureFetchInstalled = false;
let originalFetch: typeof window.fetch | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(";")) {
    const item = part.trim();
    if (item.startsWith(prefix)) return decodeURIComponent(item.slice(prefix.length));
  }
  return null;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (typeof input === "string") return new URL(input, window.location.origin);
    if (input instanceof URL) return input;
    return new URL(input.url, window.location.origin);
  } catch {
    return null;
  }
}

export function installSecureFetch(): void {
  if (secureFetchInstalled || typeof window === "undefined") return;
  secureFetchInstalled = true;
  originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const headers = new Headers(
      init.headers ?? (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined),
    );
    const sameOriginApi = Boolean(url && url.origin === window.location.origin && url.pathname.startsWith("/api/"));
    if (sameOriginApi && ["POST", "PUT", "PATCH", "DELETE"].includes(method) && !headers.has("x-csrf-token")) {
      const csrf = readCookie("seo_engine_csrf");
      if (csrf) headers.set("x-csrf-token", csrf);
    }
    const response = await originalFetch!(input, {
      ...init,
      method,
      headers,
      credentials: sameOriginApi ? (init.credentials ?? "same-origin") : init.credentials,
    });
    if (sameOriginApi && response.status === 401) {
      window.dispatchEvent(new CustomEvent("seo-engine-auth-required"));
    }
    if (sameOriginApi && response.status === 403) {
      window.dispatchEvent(new CustomEvent("seo-engine-auth-forbidden"));
    }
    return response;
  };
}

async function fetchSession(): Promise<AuthSessionResponse> {
  const response = await fetch("/api/auth/session", { headers: { accept: "application/json" }, credentials: "same-origin" });
  if (!response.ok) throw new Error(`auth_session_http_${response.status}`);
  return response.json() as Promise<AuthSessionResponse>;
}

function LoginScreen({ error }: { error: string | null }) {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  const loginHref = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo.startsWith("/login") ? "/" : returnTo)}`;
  return (
    <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center px-6">
      <section className="w-full max-w-md rounded-2xl border border-[#23344f] bg-[#0c1728] p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="brandMark">S</span>
          <div>
            <h1 className="text-xl font-semibold">SEO ENGINE</h1>
            <p className="text-sm text-[#8fa4c2]">Secure Operations Console</p>
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-2">Sign in</h2>
        <p className="text-sm text-[#9eb0ca] mb-6">Access is restricted to approved team accounts. Public registration is disabled.</p>
        {error ? <div className="mb-5 rounded-lg border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">Sign-in failed. Please verify you are using an approved account and try again.</div> : null}
        <a className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-3 font-medium text-[#0a1423] hover:bg-[#edf2f7]" href={loginHref}>
          Sign in with Google
        </a>
      </section>
    </main>
  );
}

function ConfigurationScreen() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center px-6">
      <section className="w-full max-w-lg rounded-2xl border border-amber-800/70 bg-[#0c1728] p-8">
        <h1 className="text-xl font-semibold mb-3">Authentication configuration required</h1>
        <p className="text-sm text-[#c5d0df]">Authentication enforcement is enabled, but the server configuration is incomplete. The console is fail-closed until the required identity settings are configured.</p>
      </section>
    </main>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(() => new URLSearchParams(window.location.search).get("error"));

  const refresh = useCallback(async () => {
    try {
      const next = await fetchSession();
      setSession(next);
      if (next.authenticated && error) {
        const url = new URL(window.location.href);
        url.searchParams.delete("error");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        setError(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void refresh();
    const onRequired = () => void refresh();
    window.addEventListener("seo-engine-auth-required", onRequired);
    return () => window.removeEventListener("seo-engine-auth-required", onRequired);
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    await refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    enforcementEnabled: Boolean(session?.enforcementEnabled),
    authenticated: Boolean(session?.authenticated),
    user: session?.user ?? null,
    refresh,
    logout,
  }), [session, refresh, logout]);

  if (loading) {
    return <main className="min-h-screen bg-[#07111f] text-[#a7b7ce] flex items-center justify-center">Checking secure session…</main>;
  }

  if (session?.enforcementEnabled && !session.configured) return <ConfigurationScreen />;
  if (session?.enforcementEnabled && !session.authenticated) return <LoginScreen error={error} />;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      enforcementEnabled: false,
      authenticated: false,
      user: null,
      refresh: async () => undefined,
      logout: async () => undefined,
    };
  }
  return context;
}
