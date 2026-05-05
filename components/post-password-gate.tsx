"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { verifyPostPassword } from "@/lib/actions/verify-post-password";

interface PostPasswordGateProps {
  postId: string;
  onUnlocked: () => void;
}

export function PostPasswordGate({ postId, onUnlocked }: PostPasswordGateProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await verifyPostPassword(postId, password);
      if (result.valid) {
        onUnlocked();
      } else {
        setError(result.error ?? "Incorrect password");
        setPassword("");
      }
    });
  };

  return (
    <div className="flex flex-1 w-full min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/80 p-8 shadow-[0_24px_90px_rgba(12,18,28,0.12)] backdrop-blur">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-border bg-muted">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Password protected</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This post is private and password‑protected. Enter the password to view it.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field className="flex flex-col gap-2">
            <FieldLabel htmlFor="gate-password" className="flex items-center gap-1.5 text-sm font-medium">
              <KeyRound className="size-3.5 text-muted-foreground" />
              Password
            </FieldLabel>
            <div className="relative">
              <Input
                id="gate-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter post password"
                required
                autoFocus
                className="pr-10"
              />
              {password && (
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
            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </Field>

          <Button
            type="submit"
            className="w-full hover:bg-primary/80"
            disabled={isPending || !password.trim()}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Unlock post"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
