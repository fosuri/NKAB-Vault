import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Globe, Lock, BadgeDollarSign, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/auth-server";
import { getPostById } from "@/lib/posts";
import { CommentSection } from "@/components/comment-section";
import { DeletePostButton } from "@/components/delete-post-button";

const ACCESS_META: Record<string, { label: string; Icon: React.ElementType; className: string }> = {
  public: { label: "Public", Icon: Globe, className: "text-emerald-600 dark:text-emerald-400" },
  private: { label: "Private", Icon: Lock, className: "text-amber-600 dark:text-amber-400" },
  paid: { label: "Paid", Icon: BadgeDollarSign, className: "text-violet-600 dark:text-violet-400" },
};

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, post] = await Promise.all([getSession(), getPostById(id)]);

  if (!post) {
    notFound();
  }

  const currentUserId = session?.user?.id;
  const isOwner = currentUserId === post.userId;

  if (post.access !== "public" && !isOwner) {
    notFound();
  }

  const accessMeta = ACCESS_META[post.access] ?? ACCESS_META.public;
  const { Icon, label, className } = accessMeta;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.8),transparent_35%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.35),transparent_30%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to feed
          </Link>
          {isOwner && <DeletePostButton postId={post.id} redirectTo="/" />}
        </div>

        <Card className="overflow-hidden border-border/60 bg-card/85 shadow-[0_24px_90px_rgba(12,18,28,0.08)] backdrop-blur">
          <CardHeader className="gap-2 border-b border-border/50 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>
                  {post.author?.name ?? post.author?.email ?? "Unknown user"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
                <Icon className="size-3.5" />
                {label}
              </span>
            </div>
            <p className="text-sm leading-6 text-foreground/90">{post.description}</p>
          </CardHeader>

          <CardContent className="grid gap-4 pt-4">
            {post.media.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border/40 bg-black/5"
              >
                {item.resourceType === "video" ? (
                  <video
                    src={item.secureUrl}
                    controls
                    className="max-h-[600px] w-full bg-black"
                  />
                ) : (
                  <img
                    src={item.secureUrl}
                    alt={item.originalFilename ?? post.description}
                    className="max-h-[800px] w-full object-contain"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="rounded-[28px] border border-border/50 bg-background/80 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
          <CommentSection
            postId={post.id}
            initialComments={post.comments}
            currentUserId={currentUserId}
          />
        </section>
      </div>
    </div>
  );
}
