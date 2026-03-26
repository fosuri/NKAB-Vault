import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeedPost = {
  id: string;
  description: string;
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

export function FeedPostCard({ post }: { post: FeedPost }) {
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
        </div>
        <p className="text-sm leading-6 text-foreground/90">{post.description}</p>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4">
        {post.media.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-border/40 bg-black/5">
            {item.resourceType === "video" ? (
              <video src={item.secureUrl} controls className="max-h-[520px] w-full bg-black" />
            ) : (
              <img
                src={item.secureUrl}
                alt={item.originalFilename ?? post.description}
                className="max-h-[620px] w-full object-cover"
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}