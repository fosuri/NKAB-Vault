import Link from "next/link";
import { redirect } from "next/navigation";
import { CreatePostForm } from "@/components/forms/create-post-form";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/auth-server";

export default async function NewPostPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(243,244,246,0.95),transparent_40%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(55,65,81,0.35),transparent_35%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">NKAB Vault Studio</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Add a new post</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Back to feed</Link>
          </Button>
        </div>

        <CreatePostForm />
      </div>
    </div>
  );
}
