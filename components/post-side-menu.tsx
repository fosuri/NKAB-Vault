"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, ChevronDown, Eye, EyeOff, KeyRound, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updatePostAccess } from "@/lib/actions/update-post-access";
import { deletePost } from "@/lib/actions/delete-post";
import { POST_ACCESS_OPTIONS } from "@/lib/config/post-access";

export function PostSideMenu({
  postId,
  initialAccess,
  initialPassword,
  isOwner = true,
}: {
  postId: string;
  initialAccess: string;
  initialPassword: string | null;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [savedAccess, setSavedAccess] = useState(initialAccess);
  const [savedPassword, setSavedPassword] = useState(initialPassword ?? "");

  const [draftAccess, setDraftAccess] = useState(initialAccess);
  const [addPassword, setAddPassword] = useState(Boolean(initialPassword));
  const [draftPassword, setDraftPassword] = useState(initialPassword ?? "");
  const [showPassword, setShowPassword] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const [postUrl, setPostUrl] = useState("");

  useEffect(() => {
    setPostUrl(`${window.location.origin}/post/${postId}`);
  }, [postId]);

  const isDirty =
    draftAccess !== savedAccess ||
    (draftAccess === "private" && (
      addPassword
        ? draftPassword.trim() !== savedPassword
        : savedPassword !== ""
    ));

  const handleAccessChange = (newAccess: string) => {
    setDraftAccess(newAccess);
    if (newAccess !== "private") {
      setAddPassword(false);
      setDraftPassword("");
    }
  };

  const handleSave = () => {
    const effectivePassword =
      draftAccess === "private" && addPassword && draftPassword.trim()
        ? draftPassword.trim()
        : null;

    startTransition(async () => {
      const result = await updatePostAccess(postId, draftAccess, effectivePassword);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Post settings saved!");
        setSavedAccess(draftAccess);
        setSavedPassword(effectivePassword ?? "");
      }
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
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

  const selectedAccess = POST_ACCESS_OPTIONS.find((a) => a.value === draftAccess) || POST_ACCESS_OPTIONS[0];

  return (
    <div className="flex w-full flex-col gap-6 lg:w-72 shrink-0 text-sm font-medium">
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grab a link</h3>
        <div className="flex rounded-md overflow-hidden ring-1 ring-border shadow-sm">
          <Input
            className="rounded-none border-0 bg-background/50 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
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

      {isOwner && (
        <>
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
                  onClick={() => handleAccessChange(option.value)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <option.icon className="size-4" />
                    {option.label}
                  </span>
                  {draftAccess === option.value && <Check className="size-4 text-emerald-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {draftAccess === "private" && (
          <Field className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                id="side-add-password"
                type="checkbox"
                checked={addPassword}
                onChange={(e) => {
                  setAddPassword(e.target.checked);
                  if (!e.target.checked) setDraftPassword("");
                }}
                className="size-4 rounded border-input accent-primary cursor-pointer w-auto h-auto min-w-0"
              />
              <FieldLabel
                htmlFor="side-add-password"
                className="text-sm cursor-pointer select-none flex items-center gap-1.5"
              >
                <KeyRound className="size-3.5 text-muted-foreground" />
                Password protect
              </FieldLabel>
            </div>

            {addPassword && (
              <div className="relative">
                <Input
                  id="side-post-password"
                  type={showPassword ? "text" : "password"}
                  value={draftPassword}
                  onChange={(e) => setDraftPassword(e.target.value)}
                  maxLength={100}
                  placeholder="Enter a password"
                  className="h-9 pr-10"
                  required={addPassword}
                />
                {draftPassword && (
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-0 bottom-0 my-auto h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                )}
              </div>
            )}
          </Field>
        )}

        <Button
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="w-full gap-2 hover:bg-primary/80"
          size="sm"
        >
          <Save className="size-4" />
          Save settings
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Post tools</h3>
        <div className="flex flex-col">
          <Button
            variant="ghost"
            className="flex px-0 items-center gap-3 py-2 text-muted-foreground hover:bg-transparent dark:hover:bg-transparent hover:text-destructive transition-colors text-sm font-medium w-fit disabled:opacity-50"
            disabled={isPending}
            onClick={handleDeletePost}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 className="size-4" />
            {confirmDelete ? "Confirm delete" : "Delete post"}
          </Button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
