"use server";

import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { revalidatePath } from "next/cache";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function cancelSubscription() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    return { error: "Not authenticated" };
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.email, session.user.email),
  });

  if (!currentUser?.customerId) {
    return { error: "No active subscription found" };
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: currentUser.customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      await stripe.subscriptions.cancel(subscriptions.data[0].id);
      
      await db
        .update(user)
        .set({ isPro: false })
        .where(eq(user.id, currentUser.id));

      revalidatePath("/subscription");
      
      return { success: true };
    } else {
      return { error: "No active subscription found in Stripe" };
    }
  } catch (error: unknown) {
    console.error("Error canceling subscription:", error);
    return { error: error instanceof Error ? error.message : "Failed to cancel subscription" };
  }
}

export async function createCheckoutSession() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    return { error: "Not authenticated" };
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.email, session.user.email),
  });

  if (!currentUser) {
    return { error: "User not found" };
  }

  try {
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: currentUser.email,
      client_reference_id: currentUser.id,
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/subscription?canceled=true`,
    });

    if (!stripeSession.url) {
      return { error: "Failed to create checkout session" };
    }

    return { url: stripeSession.url };
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error);
    return { error: error instanceof Error ? error.message : "Failed to create checkout session" };
  }
}
