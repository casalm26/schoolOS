import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      void router.replace("/teacher");
    }
  }, [user, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    try {
      if (mode === "login") {
        await login({ email, password });
        void router.replace("/teacher");
      } else {
        const name = String(formData.get("name") ?? "").trim();
        await api.registerAdmin({ name, email, password });
        await login({ email, password });
        void router.replace("/admin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to authenticate");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-slate-900/70 p-8 shadow-xl">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">SchoolOS Access</h1>
          <p className="text-sm text-slate-400">
            {mode === "login"
              ? "Sign in with the credentials provided by your administrator."
              : "Set up the first administrator account."}
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="space-y-2">
              <label className="block text-sm text-slate-300">Full name</label>
              <input
                name="name"
                required
                placeholder="Ada Lovelace"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="********"
              className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {isLoading ? "Submitting…" : mode === "login" ? "Sign in" : "Create admin"}
          </button>
        </form>
        <div className="text-center text-sm text-slate-400">
          {mode === "login" ? (
            <button
              className="text-emerald-300 underline-offset-2 hover:underline"
              onClick={() => setMode("register")}
              type="button"
            >
              First time here? Register the first admin
            </button>
          ) : (
            <button
              className="text-emerald-300 underline-offset-2 hover:underline"
              onClick={() => setMode("login")}
              type="button"
            >
              Already have access? Sign in
            </button>
          )}
        </div>
        <div className="text-center text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}
