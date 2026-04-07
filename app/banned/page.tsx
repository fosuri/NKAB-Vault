import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";

export default async function BannedPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  const moderationState = await getUserModerationState(session.user.id);

  if (!moderationState?.activeBan) {
    redirect("/");
  }

  const ban = moderationState.activeBan;

  return (
    <div className="min-h-full flex-1 bg-[radial-gradient(circle_at_top,rgba(254,226,226,0.65),transparent_40%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(254,242,242,1)_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,rgba(127,29,29,0.35),transparent_40%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-destructive/30 bg-background/90 p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-destructive">Account restricted</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">Your account is banned</h1>
        <p className="mt-4 text-sm text-muted-foreground">Reason</p>
        <p className="mt-1 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-foreground">
          {ban.reason}
        </p>

        <p className="mt-4 text-sm text-muted-foreground">Ban expires</p>
        <p className="mt-1 text-sm text-foreground">
          {ban.expiresAt ? ban.expiresAt.toLocaleString() : "Permanent ban"}
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Link href="/sign-in" className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
            Switch account
          </Link>
          <Link href="/" className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
