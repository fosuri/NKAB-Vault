"use client";

import React, { useState, useEffect } from "react";
import Stepper, { Step } from "@/components/Stepper";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

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

  // Auto-validate username with debounce
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
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-2xl font-bold tracking-tight">Choose a Username</h2>
              <p className="text-muted-foreground text-sm">
                Your username must be a single word using English letters only.
              </p>
              <div className="relative mt-4">
                <Input 
                  placeholder="Enter username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 text-lg text-center rounded-xl"
                  maxLength={20}
                />
                <div className="mt-2 text-sm h-5">
                  {usernameStatus === "loading" && <span className="text-muted-foreground animate-pulse">Checking availability...</span>}
                  {usernameStatus === "valid" && <span className="text-green-500">Username is available!</span>}
                  {usernameStatus === "invalid" && <span className="text-red-500">{usernameError}</span>}
                </div>
              </div>
            </div>
          </Step>

          <Step>
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-2xl font-bold tracking-tight">Profile Description</h2>
              <p className="text-muted-foreground text-sm">
                Write a short bio about yourself (optional).
              </p>
              <div className="mt-4">
                <textarea 
                  placeholder="Tell us a little bit about yourself..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full flex min-h-[120px] resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  maxLength={500}
                />
              </div>
            </div>
          </Step>

          <Step>
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-2xl font-bold tracking-tight">Profile Avatar</h2>
              <p className="text-muted-foreground text-sm">
                Enter an image URL for your avatar (optional).
              </p>
              <div className="mt-4 flex flex-col items-center gap-4">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Avatar preview" className="w-24 h-24 object-cover rounded-full border border-border" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border border-dashed border-border text-muted-foreground text-xs">
                    Preview
                  </div>
                )}
                <Input 
                  placeholder="https://example.com/avatar.png" 
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="h-12 rounded-xl"
                  type="url"
                />
              </div>
            </div>
          </Step>
        </Stepper>
    </div>
  );
}
