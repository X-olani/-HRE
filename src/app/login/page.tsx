"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginPage({
  searchParams
}: {
  searchParams: { next?: string };
}) {
  const [state, action] = useFormState<LoginState, FormData>(loginAction, {});
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-brand-blue" />
            <span className="h-3 w-3 rounded-full bg-brand-yellow" />
            <span className="h-3 w-3 rounded-full bg-ink" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-ink">CABC · HRE Monitor</h1>
          <p className="text-sm text-body/70">High-Risk Event Monitoring Tool</p>
        </div>

        <form action={action} className="card p-6 space-y-4">
          <input type="hidden" name="next" value={searchParams?.next || "/dashboard"} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <SubmitBtn />
        </form>

        <p className="mt-4 text-center text-xs text-body/50">
          Centre for Analytics and Behavioural Change
        </p>
      </div>
    </main>
  );
}
