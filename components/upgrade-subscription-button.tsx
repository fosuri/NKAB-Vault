"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/lib/actions/stripe";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

interface UpgradeSubscriptionButtonProps {
  buttonText: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

/**
 * Upgrade Subscription Button.
 * 
 * Triggers a server action to create a Stripe checkout session for the Pro plan
 * and redirects the user to the secure payment page.
 */
export function UpgradeSubscriptionButton({
  buttonText,
  buttonVariant = "default",
}: UpgradeSubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Initiates the Pro upgrade flow via Stripe.
   */
  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const result = await createCheckoutSession();
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        // Redirect to Stripe's hosted checkout page
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      className="w-full font-semibold" 
      variant={buttonVariant} 
      size="lg"
      onClick={handleUpgrade}
      disabled={isLoading}
    >
      {isLoading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
      {isLoading ? "Redirecting..." : buttonText}
    </Button>
  );
}
