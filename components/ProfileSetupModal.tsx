"use client";

import React, { useState, useEffect, useRef } from "react";
import Stepper, { Step } from "@/components/Stepper";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";

import { User } from "better-auth";
import { Button } from "@/components/ui/button";
import {
  ImageCrop,
  ImageCropContent,
  type ImageCropRef,
} from "@/components/kibo-ui/image-crop";
import { Textarea } from "@/components/ui/textarea";

export function ProfileSetupModal({ user }: { user: User & { setupCompleted?: boolean } }) {
  const [open, setOpen] = useState(false);


  useEffect(() => {
    if (user && user.setupCompleted === false) {
      setOpen(true);
    }
  }, [user]);

  const [currentStep, setCurrentStep] = useState(1);
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState(user?.image || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [hasRemovedAvatar, setHasRemovedAvatar] = useState(false);
  const cropRef = useRef<ImageCropRef>(null);

  useEffect(() => {
    if (user?.image && !avatar && !croppedImage && !hasRemovedAvatar) {
      setAvatar(user.image);
    }
  }, [user?.image, avatar, croppedImage, hasRemovedAvatar]);

  useEffect(() => {
    if (selectedFile) {
      setCroppedImage(null);
    }
  }, [selectedFile]);

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
      const res = await fetch("/api/user/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, description, avatar: finalAvatar })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Profile setup complete!");
        setOpen(false);
        window.location.assign("/profile");
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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-lg p-4">
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
                  className="text-sm"
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
                <Textarea 
                  id="description"
                  placeholder="Tell us a little bit about yourself..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                  maxLength={500}
                  showCount
                />
              </Field>
            </FieldGroup>
          </Step>

          <Step>
            <FieldGroup>
              <CardHeader className="text-center p-0 mb-2">
                <CardTitle className="text-xl">Profile Avatar</CardTitle>
                <CardDescription>
                  Upload an image for your avatar (optional).
                </CardDescription>
              </CardHeader>
              <div className="flex flex-col items-center gap-4">
                {selectedFile ? (
                  <div 
                    className="space-y-4 w-full flex flex-col items-center"
                  >
                    <ImageCrop
                      ref={cropRef}
                      aspect={1}
                      circularCrop
                      file={selectedFile}
                      maxImageSize={1024 * 1024 * 5}
                    >
                      <ImageCropContent className="max-w-md" />
                    </ImageCrop>
                    <Button
                      onClick={handleResetCrop}
                      size="sm"
                      variant="destructive"
                      className="mt-2"
                      type="button"
                    >
                      Remove Selected Image
                    </Button>
                  </div>
                ) : (
                  <>
                    {croppedImage || avatar ? (
                      <div className="relative">
                        <img 
                          src={croppedImage || avatar} 
                          alt="Avatar preview" 
                          className="w-32 h-32 shrink-0 object-cover rounded-full border border-border shadow-sm" 
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 shrink-0 rounded-full bg-muted flex items-center justify-center border border-border text-muted-foreground text-4xl font-medium shadow-sm uppercase">
                        {username ? username.charAt(0) : (user?.name?.charAt(0) || user?.email?.charAt(0) || "?")}
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 w-full">
                      {(croppedImage || avatar) && (
                        <Button 
                          onClick={() => { setAvatar(""); setCroppedImage(null); setHasRemovedAvatar(true); }} 
                          variant="destructive" 
                          className="w-full sm:flex-1"
                          type="button"
                          disabled={isSubmitting}
                        >
                          Remove Avatar
                        </Button>
                      )}
                      <Button asChild variant="outline" className="w-full sm:flex-1 relative cursor-pointer" disabled={isSubmitting}>
                        <label htmlFor="avatar-upload">
                          Choose New Avatar
                          <input 
                            id="avatar-upload"
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
            </FieldGroup>
          </Step>
        </Stepper>
    </div>
  );
}
