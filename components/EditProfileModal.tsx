"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { User } from "better-auth";
import { X } from "lucide-react";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User & { profileDescription?: string | null };
}

export function EditProfileModal({ open, onClose, user }: EditProfileModalProps) {
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [usernameError, setUsernameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.name || "");
      setDescription(user.profileDescription || "");
      setAvatar(user.image || "");
    }
  }, [user, open]);

  useEffect(() => {
    if (!username || username === user.name) {
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
  }, [username, user.name]);

  const handleSubmit = async () => {
    if (username !== user.name && usernameStatus !== "valid") {
      toast.error("Please choose a valid username");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, description, avatar })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Profile updated successfully!");
        onClose();
        window.location.reload();
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

  const isUsernameUnchanged = username === user.name;
  const isFormValid = isUsernameUnchanged || usernameStatus === "valid";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Edit Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">Update your profile information</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-username">Username</FieldLabel>
            <Input 
              id="edit-username"
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              disabled={isSubmitting}
            />
            <div className="text-sm h-5 mt-1">
              {!isUsernameUnchanged && usernameStatus === "loading" && (
                <span className="text-muted-foreground animate-pulse">Checking availability...</span>
              )}
              {!isUsernameUnchanged && usernameStatus === "valid" && (
                <span className="text-green-500">Username is available!</span>
              )}
              {!isUsernameUnchanged && usernameStatus === "invalid" && (
                <span className="text-red-500">{usernameError}</span>
              )}
            </div>
          </Field>

          {/* Description */}
          <Field>
            <FieldLabel htmlFor="edit-description">Bio</FieldLabel>
            <textarea 
              id="edit-description"
              placeholder="Tell us a little bit about yourself..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
          </Field>

          {/* Avatar URL */}
          <Field>
            <FieldLabel htmlFor="edit-avatar">Avatar URL</FieldLabel>
            <Input 
              id="edit-avatar"
              type="url"
              placeholder="https://example.com/avatar.jpg" 
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              disabled={isSubmitting}
            />
            {avatar && (
              <Image 
                src={avatar} 
                alt="Avatar preview" 
                width={64}
                height={64}
                className="mt-2 w-16 h-16 rounded-lg object-cover border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </Field>
        </FieldGroup>

        <div className="flex gap-3 mt-8">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
