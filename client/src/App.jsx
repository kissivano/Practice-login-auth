import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL;

function cls(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function App() {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const isAuthed = useMemo(() => Boolean(token), [token]);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [me, setMe] = useState(null);

  function toast(type, text) {
    setNotice({ type, text });
  }

  function clearMsgSoon() {
    setTimeout(() => setNotice(null), 4000);
  }

  async function callJSON(path, { method = "GET", body, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    return { ok: res.ok, status: res.status, data };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setNotice(null);
    setLoading(true);

    try {
      if (!email || !password) {
        toast("err", "Email and password are required.");
        return;
      }

      if (tab === "register") {
        const r = await callJSON("/api/register", {
          method: "POST",
          body: { email, password },
        });

        if (!r.ok) {
          toast("err", r.data?.error || `Register error (${r.status})`);
          return;
        }

        toast("ok", "Registration successful. Please log in now.");
        clearMsgSoon();
        setTab("login");
        return;
      }

      if (tab === "login") {
        const r = await callJSON("/api/login", {
          method: "POST",
          body: { email, password },
        });

        if (!r.ok) {
          toast("err", r.data?.error || `Login error (${r.status})`);
          return;
        }

        if (r.data?.token) {
          localStorage.setItem("token", r.data.token);
          setToken(r.data.token);
          toast("ok", "Login successful!");
          clearMsgSoon();
        } else {
          toast("err", "No token was received from the server.");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchMe() {
    setNotice(null);
    setLoading(true);

    try {
      const r = await callJSON("/api/me", { auth: true });

      if (!r.ok) {
        toast("err", r.data?.error || ` /me error. (${r.status})`);
        return;
      }

      setMe(r.data?.user || null);
      toast("ok", "Token OK, /me successful.");
      clearMsgSoon();
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setMe(null);
    toast("ok", "Logged out.");
    clearMsgSoon();
  }

  useEffect(() => {
    if (token) fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Practice Auth
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                React + Node + Supabase + JWT
              </p>
            </div>

            {isAuthed ? (
              <button
                onClick={logout}
                className="rounded-xl bg-rose-600/90 px-4 py-2 text-sm font-semibold hover:bg-rose-600 transition"
              >
                Logout
              </button>
            ) : (
              <span className="text-xs text-slate-500 mt-2">Not logged in</span>
            )}
          </div>

          {/* Tabs */}
          {!isAuthed && (
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-800/60 p-1">
              <button
                onClick={() => setTab("login")}
                className={cls(
                  "rounded-xl py-2 text-sm font-semibold transition",
                  tab === "login"
                    ? "bg-slate-950"
                    : "text-slate-300 hover:text-white",
                )}
              >
                Login
              </button>
              <button
                onClick={() => setTab("register")}
                className={cls(
                  "rounded-xl py-2 text-sm font-semibold transition",
                  tab === "register"
                    ? "bg-slate-950"
                    : "text-slate-300 hover:text-white",
                )}
              >
                Register
              </button>
            </div>
          )}

          {/* Notice */}
          {notice && (
            <div
              className={cls(
                "mt-4 rounded-2xl border px-4 py-3 text-sm",
                notice.type === "ok"
                  ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-200"
                  : "border-rose-600/40 bg-rose-600/10 text-rose-200",
              )}
            >
              {notice.text}
            </div>
          )}

          {/* Form */}
          {!isAuthed && (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400">Email</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="demo@test.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Password</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    tab === "register" ? "new-password" : "current-password"
                  }
                />
              </div>

              <button
                disabled={loading}
                className={cls(
                  "w-full rounded-2xl py-3 font-semibold transition",
                  loading
                    ? "bg-slate-700 cursor-not-allowed"
                    : tab === "login"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-indigo-600 hover:bg-indigo-500",
                )}
              >
                {loading
                  ? "Loading..."
                  : tab === "login"
                    ? "Login"
                    : "Create account"}
              </button>

              <p className="text-xs text-slate-500">
                Tip: After registration, switch to Login and sign in using the
                same email/password.
              </p>
            </form>
          )}

          {/* Authed area */}
          {isAuthed && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-xs text-slate-400 mb-2">
                  Token (small verison.)
                </div>
                <div className="text-xs break-all text-slate-200">
                  {token.slice(0, 28)}...{token.slice(-18)}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={fetchMe}
                  disabled={loading}
                  className={cls(
                    "flex-1 rounded-2xl py-3 font-semibold transition",
                    loading
                      ? "bg-slate-700 cursor-not-allowed"
                      : "bg-slate-800 hover:bg-slate-700",
                  )}
                >
                  {loading ? "..." : "Get /me"}
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    setToken("");
                    setMe(null);
                    toast("ok", "Token deleted.");
                    clearMsgSoon();
                  }}
                  className="flex-1 rounded-2xl py-3 font-semibold bg-slate-800 hover:bg-slate-700 transition"
                >
                  Clear token
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-xs text-slate-400 mb-2">/me payload</div>
                <pre className="text-xs whitespace-pre-wrap break-words text-slate-200">
                  {me
                    ? JSON.stringify(me, null, 2)
                    : "No data yet (Click Get /me)"}
                </pre>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          Backend: render.com • Frontend: vercel.com
        </p>
      </div>
    </div>
  );
}
