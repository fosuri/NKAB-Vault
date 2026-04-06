import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Globe, Lock, BadgeDollarSign } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DeletePostButton } from "@/components/delete-post-button";
import { PostMediaPreview } from "@/components/post-media-preview";

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
  showDeleteButton = true,
}: {
  post: FeedPost;
  currentUserId?: string;
  showDeleteButton?: boolean;
}) {
  const isOwner = Boolean(currentUserId && currentUserId === post.userId);
  const accessMeta = ACCESS_META[post.access] ?? ACCESS_META.public;
  const { Icon, label, className } = accessMeta;
  
  const firstMedia = post.media?.[0];

  return (
    <Card className="group relative flex h-fit flex-col overflow-hidden border-border/60 bg-card/85 shadow-[0_24px_90px_rgba(12,18,28,0.08)] backdrop-blur transition-colors hover:bg-card/90">
      <Link href={`/post/${post.id}`} className="absolute inset-0 z-10" aria-label="View post" />
      
      <CardHeader className="gap-2 border-b border-border/50 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>
              <Link
                href={isOwner ? "/profile" : `/profile/${post.author?.name}`}
                className="relative z-20 hover:underline"
              >
                {post.author?.name ?? post.author?.email ?? "Unknown user"}
              </Link>
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
        <h2 className="text-lg font-bold leading-6 text-foreground/90 truncate">{post.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground truncate">{post.description}</p>
      </CardHeader>

      <CardContent className="mt-auto grid gap-4 pt-0">
        {firstMedia && (
          <PostMediaPreview
            src={firstMedia.secureUrl}
            alt={firstMedia.originalFilename ?? post.description}
            isVideo={firstMedia.resourceType === "video"}
          />
        )}
        {post.media && post.media.length > 1 && (
          <p className="text-center text-xs font-medium text-muted-foreground">
            {post.media.length} files attached
          </p>
        )}
      </CardContent>

      {isOwner && showDeleteButton && (
        <CardFooter className="relative z-20 flex justify-end pb-4 pt-0">
          <DeletePostButton postId={post.id} />
        </CardFooter>
      )}
    </Card>
  );
}