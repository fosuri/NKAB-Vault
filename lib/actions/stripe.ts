"use server";

import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { revalidatePath } from "next/cache";

/**
 * External Payment and Subscription Lifecycle Actions.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Orchestrates the termination of an active PRO subscription in Stripe.
 */
export async function cancelSubscription() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    return { error: "Not authenticated" };
  }

  // 1. Identify user and Stripe Customer ID
  const currentUser = await db.query.user.findFirst({
    where: eq(user.email, session.user.email),
  });

  if (!currentUser?.customerId) {
    return { error: "No active subscription found" };
  }

  try {
    // 2. Fetch subscription ID from Stripe customer context
    const subscriptions = await stripe.subscriptions.list({
      customer: currentUser.customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      // 3. Execute immediate cancellation in Stripe
      await stripe.subscriptions.cancel(subscriptions.data[0].id);

      revalidatePath("/subscription");
      return { success: true };
    } else {
      return { error: "No active subscription found in Stripe" };
    }
  } catch (error: unknown) {
    console.error(error);
    return { error: "Failed to cancel subscription" };
  }
}

/**
 * Initiates a secure checkout flow for premium subscription tiers.
 */
export async function createCheckoutSession() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    return { error: "Not authenticated" };
  }

  // 1. Identity Linkage: Relate payment to local account
  const currentUser = await db.query.user.findFirst({
    where: eq(user.email, session.user.email),
  });

  if (!currentUser) return { error: "User not found" };

  try {
    // 2. Create Stripe Checkout session for PRO tier
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: currentUser.email,
      client_reference_id: currentUser.id, // Reference for webhook callbacks
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/subscription?canceled=true`,
    });

    if (!stripeSession.url) return { error: "Failed to create checkout session" };

    return { url: stripeSession.url };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Payment gateway error" };
  }
}

/**
 * Securely verifies a Stripe Checkout Session ID.
 * Ensures the session exists, is completed/paid, and belongs to the active authenticated user.
 */
export async function verifyCheckoutSession(sessionId: string) {
  if (!sessionId || typeof sessionId !== "string") {
    return { error: "Invalid session ID" };
  }

  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  try {
    // 1. Fetch the checkout session details directly from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    // 2. Validate user identity matches the Stripe session references
    const isReferenceMatch = stripeSession.client_reference_id === session.user.id;
    const isEmailMatch = stripeSession.customer_email === session.user.email || 
                          stripeSession.customer_details?.email === session.user.email;

    if (!isReferenceMatch && !isEmailMatch) {
      return { error: "Session validation failed: account mismatch" };
    }

    // 3. Verify payment is completed/paid
    const isPaid = stripeSession.payment_status === "paid";
    const isComplete = stripeSession.status === "complete";

    if (!isPaid && !isComplete) {
      return { error: "Payment not completed" };
    }

    return {
      success: true,
      customerEmail: stripeSession.customer_details?.email || stripeSession.customer_email || session.user.email,
      planName: "Pro Tier",
    };
  } catch (error: unknown) {
    console.error("Error verifying checkout session:", error);
    return { error: "Payment verification error" };
  }
}
