import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Globe, Lock, BadgeDollarSign } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DeletePostButton } from "@/components/delete-post-button";
import Image from "next/image";

type FeedPost = {
  id: string;
  userId: string;
  title: string;
  description: string;
  access: string;
  createdAt: Date;
  author: {
    name: string;
    email: string;
    image: string | null;
  } | null;
  media: Array<{
    id: string;
    secureUrl: string;
    resourceType: string;
    originalFilename: string | null;
  }>;
};

const ACCESS_META: Record<string, { label: string; Icon: React.ElementType; className: string }> = {
  public: { label: "Public", Icon: Globe, className: "text-emerald-600 dark:text-emerald-400" },
  private: { label: "Private", Icon: Lock, className: "text-amber-600 dark:text-amber-400" },
  paid: { label: "Paid", Icon: BadgeDollarSign, className: "text-violet-600 dark:text-violet-400" },
};

export function FeedPostCard({
  post,
  currentUserId,
}: {
  post: FeedPost;
  currentUserId?: string;
}) {
  const isOwner = Boolean(currentUserId && currentUserId === post.userId);
  const accessMeta = ACCESS_META[post.access] ?? ACCESS_META.public;
  const { Icon, label, className } = accessMeta;

  return (
    <Card className="overflow-hidden border-border/60 bg-card/85 shadow-[0_24px_90px_rgba(12,18,28,0.08)] backdrop-blur">
      <CardHeader className="gap-2 border-b border-border/50 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{post.author?.name ?? post.author?.email ?? "Unknown user"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
            <Icon className="size-3.5" />
            {label}
          </span>
        </div>
        <h2 className="text-sm leading-6 text-foreground/90">{post.title}</h2>
        <p className="text-sm leading-6 text-foreground/90">{post.description}</p>
      </CardHeader>

      <CardContent className="grid gap-4 pt-4">
        {post.media.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-border/40 bg-black/5">
            {item.resourceType === "video" ? (
              <video src={item.secureUrl} controls className="max-h-130 w-full bg-black" />
            ) : (
              <Image
                src={item.secureUrl}
                alt={item.originalFilename ?? post.description}
                className="max-h-155 w-full object-cover"
                width={520}
                height={520}
              />
            )}
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-4 pt-4">
        <Link
          href={`/post/${post.id}`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          View details &amp; comments
        </Link>
        {isOwner && <DeletePostButton postId={post.id} />}
      </CardFooter>
    </Card>
  );
}