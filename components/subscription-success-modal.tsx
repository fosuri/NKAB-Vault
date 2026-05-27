"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { verifyCheckoutSession } from "@/lib/actions/stripe";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon, X } from "lucide-react";
import { toast } from "sonner";

function SubscriptionSuccessModalContent() {
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "error" | "success_cancel">("idle");
  const [customerEmail, setCustomerEmail] = useState("");

  // Function to remove query parameters from history without triggering full page refresh
  const cleanUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    url.searchParams.delete("session_id");
    url.searchParams.delete("canceled");
    url.searchParams.delete("canceled_success");
    window.history.replaceState({}, "", url.pathname + url.search);
  };
  useEffect(() => {
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");
    const canceledSuccess = searchParams.get("canceled_success");

    if (success === "true" && sessionId) {
      const storageKey = `nkab_vault_sub_${sessionId}`;
      
      // Security prevention: check if this session was already shown
      if (localStorage.getItem(storageKey)) {
        cleanUrl();
        return;
      }

      // Start the secure verification flow asynchronously to prevent synchronous render cascades
      Promise.resolve().then(() => {
        setIsOpen(true);
        setVerificationStatus("verifying");
      });

      verifyCheckoutSession(sessionId)
        .then((result) => {
          if (result.success) {
            // Mark as shown to prevent reuse
            localStorage.setItem(storageKey, "true");
            setCustomerEmail(result.customerEmail || "");
            setVerificationStatus("success");
            
            // Clean URL immediately after verification to keep address bar pristine
            cleanUrl();
            toast.success("Subscription upgraded successfully!");
          } else {
            console.error("Verification failed:", result.error);
            setVerificationStatus("error");
            cleanUrl();
          }
        })
        .catch((err) => {
          console.error("Verification exception:", err);
          setVerificationStatus("error");
          cleanUrl();
        });
    } else if (canceledSuccess === "true") {
      // Start the cancellation confirmation flow asynchronously to prevent synchronous render cascades
      Promise.resolve().then(() => {
        setIsOpen(true);
        setVerificationStatus("success_cancel");
      });
      cleanUrl();
    }
  }, [searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    // Hard refresh on main home path to ensure layouts (Header/Avatar) completely update and caches clear
    window.location.assign("/");
  };

  if (!isOpen) return null;

  const isVerifying = verificationStatus === "verifying";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isVerifying) {
          handleClose();
        }
      }}
    >
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border/50 bg-background p-6 shadow-lg relative">
        {/* Close Button (Disabled when verifying) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg transition-colors"
          disabled={isVerifying}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>

        {verificationStatus === "verifying" && (
          <div className="py-8 flex flex-col items-center text-center gap-4">
            <Loader2Icon className="h-12 w-12 text-primary animate-spin" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Verifying Payment</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                We are securely confirming your subscription upgrade with Stripe. Please wait.
              </p>
            </div>
          </div>
        )}

        {verificationStatus === "error" && (
          <div className="py-6 flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-destructive/10 p-3 border border-destructive/20">
              <XCircleIcon className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Verification Failed</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                This subscription session is invalid or has already been used. Please contact support if you believe this is an error.
              </p>
            </div>
            <Button variant="outline" onClick={handleClose} className="mt-4 font-semibold px-6 w-full">
              Close Window
            </Button>
          </div>
        )}

        {verificationStatus === "success" && (
          <div className="flex flex-col items-center text-center w-full">
            <div className="rounded-full bg-green-500/10 p-3 border border-green-500/20 mb-4">
              <CheckCircle2Icon className="h-10 w-10 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-foreground">Subscription Upgraded!</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mb-6">
              Welcome to Pro! You now have complete access to all exclusive Pro features.
            </p>

            {/* Benefit / Summary Card */}
            <div className="w-full bg-muted/40 dark:bg-muted/10 border border-border/40 rounded-xl p-4 mb-6 text-left space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Account</p>
                <p className="text-sm font-medium text-foreground truncate max-w-[240px]">{customerEmail}</p>
              </div>
              
              <div className="border-t border-border/40 my-2" />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unlocked Perks</p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                    Upload large files up to 20MB
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                    Highlight your posts in the feed
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                    Premium Pro status tier badge
                  </li>
                </ul>
              </div>
            </div>

            <Button 
              onClick={handleClose} 
              className="w-full font-semibold h-10 rounded-lg cursor-pointer"
            >
              Continue
            </Button>
          </div>
        )}

        {verificationStatus === "success_cancel" && (
          <div className="flex flex-col items-center text-center w-full">
            <div className="rounded-full bg-muted p-3 border border-border mb-4">
              <CheckCircle2Icon className="h-10 w-10 text-muted-foreground" />
            </div>

            <h2 className="text-2xl font-bold text-foreground">Subscription Cancelled</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mb-6">
              Your Pro subscription has been successfully cancelled. Your account has returned to the Free plan.
            </p>

            {/* Free Tier Features Card */}
            <div className="w-full bg-muted/40 dark:bg-muted/10 border border-border/40 rounded-xl p-4 mb-6 text-left space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Account Status</p>
                <p className="text-sm font-medium text-foreground">Free Tier</p>
              </div>
              
              <div className="border-t border-border/40 my-2" />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Free Features Available</p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                    Standard image sharing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                    Upload files up to 10MB
                  </li>
                </ul>
              </div>
            </div>

            <Button 
              onClick={handleClose} 
              className="w-full font-semibold h-10 rounded-lg cursor-pointer"
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SubscriptionSuccessModal() {
  return (
    <Suspense fallback={null}>
      <SubscriptionSuccessModalContent />
    </Suspense>
  );
}
