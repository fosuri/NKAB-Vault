"use client";

import { useState, useTransition } from "react";
import { Copy, Trash2, Globe, Lock, BadgeDollarSign, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updatePostAccess } from "@/lib/actions/update-post-access";
import { deletePost } from "@/lib/actions/delete-post";
import { POST_ACCESS_OPTIONS } from "@/lib/config/post-access";

export function PostSideMenu({
  postId,
  initialAccess,
}: {
  postId: string;
  initialAccess: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [access, setAccess] = useState(initialAccess);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const postUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleChangeAccess = (newAccess: string) => {
    if (newAccess === access) return;
    setAccess(newAccess);
    startTransition(async () => {
      const result = await updatePostAccess(postId, newAccess);
      if (result.error) {
        toast.error(result.error);
        setAccess(access);
      } else {
        toast.success("Post access updated!");
      }
    });
  };

  const handleDeletePost = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    startTransition(async () => {
      const result = await deletePost(postId);
      if (result.error) {
        toast.error(result.error);
        setConfirmDelete(false);
      } else {
        toast.success("Post deleted");
        router.push("/");
      }
    });
  };

  const selectedAccess = POST_ACCESS_OPTIONS.find((a) => a.value === access) || POST_ACCESS_OPTIONS[0];

  return (
    <div className="flex w-full flex-col gap-6 lg:w-72 shrink-0 text-sm font-medium">
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grab a link</h3>
        <div className="flex rounded-md overflow-hidden ring-1 ring-border shadow-sm">
          <Input 
            className="rounded-none border-0 bg-background/50 focus-visible:ring-0 focus-visible:ring-offset-0" 
            value={postUrl} 
            readOnly 
          />
          <Button 
            className="rounded-none hover:bg-primary/80 text-background shadow-none px-5 rounded-r-md transition-colors" 
            onClick={handleCopyLink}
          >
            Copy
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Post settings</h3>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Access Type</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between bg-background/50 backdrop-blur" disabled={isPending}>
                <span className="flex items-center gap-2">
                  <selectedAccess.icon className="size-4" />
                  {selectedAccess.label}
                </span>
                <ChevronDown className="size-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {POST_ACCESS_OPTIONS.map((option) => (
                <DropdownMenuItem 
                  key={option.value}
                  onClick={() => handleChangeAccess(option.value)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <option.icon className="size-4" />
                    {option.label}
                  </span>
                  {access === option.value && <Check className="size-4 text-emerald-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Post tools</h3>
        <div className="flex flex-col">
          <button 
            className="flex items-center gap-3 py-2 text-muted-foreground hover:text-destructive transition-colors text-sm font-medium w-fit disabled:opacity-50"
            disabled={isPending}
            onClick={handleDeletePost}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 className="size-4" />
            {confirmDelete ? "Confirm delete" : "Delete post"}
          </button>
        </div>
      </div>
    </div>
  );
}
