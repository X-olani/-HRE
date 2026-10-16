import { requireSession } from "@/lib/guard";
import { getUserById } from "@/lib/repo";
import { ROLE_LABELS } from "@/lib/types";
import { TokenPanel, PasswordPanel } from "@/components/SettingsForms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await requireSession();
  const u = getUserById(s.userId)!;
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-ink">Settings</h1>

      <section className="card p-5">
        <h2 className="mb-2 text-sm font-semibold text-ink">Account</h2>
        <div className="text-sm text-body/80">{u.name} · {u.email} · {ROLE_LABELS[u.role]}</div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Capture extension token</h2>
        <TokenPanel hasToken={!!u.apiTokenHash} appUrl={appUrl} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Change password</h2>
        <PasswordPanel />
      </section>
    </div>
  );
}
