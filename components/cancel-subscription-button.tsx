"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelSubscription } from "@/lib/actions/stripe";
import { toast } from "sonner";

interface CancelSubscriptionButtonProps {
  buttonText: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

/**
 * Cancel Subscription Button.
 * Provides a UI and confirmation workflow for users to end their Pro subscription.
 * Integration: Stripe (via cancelSubscription server action).
 */
export function CancelSubscriptionButton({
  buttonText,
  buttonVariant = "default",
}: CancelSubscriptionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Cancel Handler:
   * Triggers the Stripe cancellation logic and provides toast feedback.
   */
  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const result = await cancelSubscription();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subscription cancelled successfully.");
        setIsOpen(false);
        // Redirect to subscription dashboard with unsubscription success parameters
        window.location.assign("/subscription?canceled_success=true");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger Button: Configurable text and variant */}
      <DialogTrigger asChild>
        <Button className="w-full font-semibold" variant={buttonVariant} size="lg">
          {buttonText}
        </Button>
      </DialogTrigger>
      
      {/* Confirmation Dialog Overlay */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your Pro subscription? You will lose access to Pro features immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading ? "Canceling..." : "Yes, cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

