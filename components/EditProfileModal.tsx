"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  ImageCrop,
  ImageCropContent,
  type ImageCropRef,
} from "@/components/kibo-ui/image-crop";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { User } from "better-auth";
import { X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User & { profileDescription?: string | null };
}

export function EditProfileModal({ open, onClose, user }: EditProfileModalProps) {
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const cropRef = useRef<ImageCropRef>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCroppedImage(null);
    }
  };

  const handleResetCrop = () => {
    setSelectedFile(null);
    setCroppedImage(null);
  };
  
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
    let finalAvatar = avatar;

    if (selectedFile && cropRef.current) {
      try {
        const cropped = await cropRef.current.applyCrop();
        if (cropped) {
          finalAvatar = cropped;
        }
      } catch (err) {
        console.error("Crop applied error:", err);
      }
    } else {
      finalAvatar = croppedImage || avatar;
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, description, avatar: finalAvatar })
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
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border/50 bg-background p-6 shadow-lg">
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

          <Field>
            <FieldLabel htmlFor="edit-description">Bio</FieldLabel>
            <Textarea 
              id="edit-description"
              placeholder="Tell us a little bit about yourself..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              maxLength={500}
              showCount
            />
          </Field>

          <Field>
            <FieldLabel>Profile Avatar</FieldLabel>
            <div className="flex flex-col items-center gap-4 mt-2">
              {selectedFile ? (
                <div className="space-y-4 w-full flex flex-col items-center">
                  <ImageCrop
                    ref={cropRef}
                    aspect={1}
                    circularCrop
                    file={selectedFile}
                    maxImageSize={1024 * 1024 * 5}
                  >
                    <ImageCropContent className="max-w-md w-full" />
                  </ImageCrop>
                  <Button
                    onClick={handleResetCrop}
                    size="sm"
                    variant="destructive"
                    className="mt-2"
                    type="button"
                    disabled={isSubmitting}
                  >
                    Remove Selected Image
                  </Button>
                </div>
              ) : (
                <>
                  {croppedImage || avatar ? (
                    <img 
                      src={croppedImage || avatar} 
                      alt="Avatar preview" 
                      className="w-24 h-24 shrink-0 object-cover rounded-full border border-border shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 shrink-0 rounded-full bg-muted flex items-center justify-center border border-border text-foreground text-3xl font-medium shadow-sm uppercase">
                      {username ? username.charAt(0) : "U"}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 w-full">
                    {(croppedImage || avatar) && (
                      <Button 
                        onClick={() => { setAvatar(""); setCroppedImage(null); }} 
                        variant="destructive" 
                        className="w-full sm:flex-1"
                        type="button"
                        disabled={isSubmitting}
                      >
                        Remove Avatar
                      </Button>
                    )}
                    <Button asChild variant="outline" className="w-full sm:flex-1 relative cursor-pointer" disabled={isSubmitting}>
                      <label>
                        Choose New Avatar
                        <input 
                          accept="image/*"
                          onChange={handleFileChange}
                          type="file"
                          className="hidden"
                          disabled={isSubmitting}
                        />
                      </label>
                    </Button>
                  </div>
                </>
              )}
            </div>
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
