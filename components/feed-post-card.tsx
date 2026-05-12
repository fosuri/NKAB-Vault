import Link from "next/link";
import { Eye, Globe, Lock, BadgeDollarSign } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeletePostButton } from "@/components/delete-post-button";
import { PostMediaPreview } from "@/components/post-media-preview";
import { getRelativeTime } from "@/utils/getRelativeTime";

type FeedPost = {
  id: string;
  userId: string;
  title: string;
  description: string;
  access: string;
  viewCount: number;
  createdAt: Date;
  author: {
    name: string;
    email: string;
    image: string | null;
    role?: string;
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
          <div className="flex min-w-0 items-center gap-2">
            <Avatar size="sm" className="relative z-20">
              {post.author?.image ? (
                <AvatarImage
                  src={post.author.image}
                  alt={post.author?.name ?? post.author?.email ?? "User avatar"}
                />
              ) : null}
              <AvatarFallback>
                {post.author?.name?.charAt(0) ?? post.author?.email?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="truncate">
              <Link
                href={isOwner ? "/profile" : `/@${post.author?.name}`}
                className="relative z-20 hover:underline"
              >
                {post.author?.name ?? post.author?.email ?? "Unknown user"}
              </Link>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
            <span>{getRelativeTime(new Date(post.createdAt))}</span>
          </div>
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
            fileCount={post.media.length}
          />
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {post.access !== "public" && (
              <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
                <Icon className="size-3.5" />
                {label}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Eye className="size-3" />
            {post.viewCount.toLocaleString()}
          </span>
        </div>
      </CardContent>

      {isOwner && showDeleteButton && (
        <CardFooter className="relative z-20 flex justify-end pb-4 pt-4">
          <DeletePostButton postId={post.id} />
        </CardFooter>
      )}
    </Card>
  );
}