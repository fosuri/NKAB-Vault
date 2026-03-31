"use client";

import React, { useState, useEffect } from "react";
import Stepper, { Step } from "@/components/Stepper";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";

import { User } from "better-auth";

export function ProfileSetupModal({ user }: { user: User & { setupCompleted?: boolean } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user && user.setupCompleted === false) {
      setOpen(true);
    }
  }, [user]);

  const [currentStep, setCurrentStep] = useState(1);
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [usernameError, setUsernameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!username) {
       setUsernameStatus("idle");
       return;
    }
    const timer = setTimeout(async () => {
      setUsernameStatus("loading");
      setUsernameError("");
      try {
        const res = await fetch(`/api/user/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (res.ok && data.available) {
           setUsernameStatus("valid");
        } else {
           setUsernameStatus("invalid");
           setUsernameError(data.error || "Username unavailable");
        }
      } catch {
        setUsernameStatus("invalid");
        setUsernameError("Error checking username");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleComplete = async () => {
    if (usernameStatus !== "valid") {
       toast.error("Please choose a valid username before continuing");
       return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, description, avatar })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Profile setup complete!");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || "Something went wrong.");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
        <Stepper 
          initialStep={1}
          onStepChange={(step) => setCurrentStep(step)}
          onFinalStepCompleted={handleComplete}
          nextButtonProps={{
            disabled: (currentStep === 1 && usernameStatus !== "valid") || isSubmitting
          }}
          nextButtonText={isSubmitting ? "Saving..." : "Continue"}
        >
          <Step>
            <FieldGroup>
              <CardHeader className="text-center p-0 mb-2">
                <CardTitle className="text-xl">Choose a Username</CardTitle>
                <CardDescription>
                  Your username must be a single word using English letters only.
                </CardDescription>
              </CardHeader>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input 
                  id="username"
                  placeholder="Enter username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                />
                <div className="text-sm h-5">
                  {usernameStatus === "loading" && <span className="text-muted-foreground animate-pulse">Checking availability...</span>}
                  {usernameStatus === "valid" && <span className="text-green-500">Username is available!</span>}
                  {usernameStatus === "invalid" && <span className="text-red-500">{usernameError}</span>}
                </div>
              </Field>
            </FieldGroup>
          </Step>

          <Step>
            <FieldGroup>
              <CardHeader className="text-center p-0 mb-2">
                <CardTitle className="text-xl">Profile Description</CardTitle>
                <CardDescription>
                  Write a short bio about yourself (optional).
                </CardDescription>
              </CardHeader>
              <Field>
                <FieldLabel htmlFor="description">Bio</FieldLabel>
                <textarea 
                  id="description"
                  placeholder="Tell us a little bit about yourself..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                  maxLength={500}
                />
              </Field>
            </FieldGroup>
          </Step>

          <Step>
            <FieldGroup>
              <CardHeader className="text-center p-0 mb-2">
                <CardTitle className="text-xl">Profile Avatar</CardTitle>
                <CardDescription>
                  Enter an image URL for your avatar (optional).
                </CardDescription>
              </CardHeader>
              <div className="flex flex-col items-center gap-4">
                {avatar ? (
                  <img src={avatar} alt="Avatar preview" className="w-32 h-32 shrink-0 object-cover rounded-full border border-border shadow-sm" />
                ) : (
                  <div className="w-32 h-32 shrink-0 rounded-full bg-muted flex items-center justify-center border border-dashed border-border text-muted-foreground text-xs font-medium">
                    Preview
                  </div>
                )}
                <Field className="w-full">
                  <FieldLabel htmlFor="avatar">Avatar URL</FieldLabel>
                  <Input 
                    id="avatar"
                    placeholder="https://example.com/avatar.png" 
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    type="url"
                  />
                </Field>
              </div>
            </FieldGroup>
          </Step>
        </Stepper>
    </div>
  );
}
