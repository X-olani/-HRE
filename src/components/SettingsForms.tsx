"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  generateTokenAction,
  revokeTokenAction,
  changePasswordAction,
  type SettingsState
} from "@/app/(app)/settings/actions";

function Submit({ label, cls = "btn-ghost" }: { label: string; cls?: string }) {
  const { pending } = useFormStatus();
  return <button className={cls} type="submit">{pending ? "…" : label}</button>;
}

export function TokenPanel({ hasToken, appUrl }: { hasToken: boolean; appUrl: string }) {
  const [genState, gen] = useFormState<SettingsState, FormData>(generateTokenAction as any, {});
  const [revState, rev] = useFormState<SettingsState, FormData>(revokeTokenAction as any, {});
  return (
    <div className="space-y-3">
      <p className="text-sm text-body/70">
        The one-click capture browser extension uses a personal token to log content as you.
        Generate a token, then paste it (with the app URL below) into the extension’s options.
      </p>
      <div className="text-sm">
        Status:{" "}
        {hasToken ? (
          <span className="badge bg-green-100 text-green-800">Token active</span>
        ) : (
          <span className="badge bg-gray-100 text-gray-600">No token</span>
        )}
      </div>

      {genState.token && (
        <div className="rounded-lg border border-brand-yellow bg-brand-yellow/10 p-3">
          <div className="text-xs font-medium text-ink">Your new token (copy now):</div>
          <code className="mt-1 block break-all rounded bg-white p-2 text-xs">{genState.token}</code>
          <div className="mt-1 text-xs text-body/70">App URL for the extension: <code>{appUrl}</code></div>
        </div>
      )}
      {genState.ok && !genState.token && <p className="text-sm text-green-700">{genState.ok}</p>}
      {revState.ok && <p className="text-sm text-green-700">{revState.ok}</p>}

      <div className="flex gap-2">
        <form action={gen}><Submit label={hasToken ? "Regenerate token" : "Generate token"} cls="btn-primary" /></form>
        {hasToken && <form action={rev}><Submit label="Revoke" /></form>}
      </div>
    </div>
  );
}

export function PasswordPanel() {
  const [s, a] = useFormState<SettingsState, FormData>(changePasswordAction, {});
  return (
    <form action={a} className="space-y-3">
      <div><label className="label">Current password</label><input name="current" type="password" className="input" required /></div>
      <div><label className="label">New password</label><input name="next" type="password" className="input" required /></div>
      {s.error && <p className="text-sm text-danger">{s.error}</p>}
      {s.ok && <p className="text-sm text-green-700">{s.ok}</p>}
      <Submit label="Change password" />
    </form>
  );
}
