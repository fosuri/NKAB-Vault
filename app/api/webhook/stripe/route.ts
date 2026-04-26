import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { user, subscriptions } from "@/lib/db/auth-schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = await stripe.checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id);

        const customerId = session.customer as string;
        let targetUserId = session.client_reference_id;

        if (!targetUserId) {
          const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
          if (customer.email) {
            const existing = await db.query.user.findFirst({
              where: eq(user.email, customer.email),
            });
            if (existing) {
              targetUserId = existing.id;
            }
          }
        }

        if (!targetUserId) {
          throw new Error(`No user found for checkout session: ${session.id}`);
        }

        await db
          .update(user)
          .set({ customerId })
          .where(eq(user.id, targetUserId));

        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const item = sub.items.data[0];

          const subscriptionData = {
            id: sub.id,
            userId: targetUserId,
            stripePriceId: item.price.id,
            status: sub.status,
            currentPeriodEnd: new Date(item.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          };

          await db
            .insert(subscriptions)
            .values(subscriptionData)
            .onConflictDoUpdate({
              target: subscriptions.id,
              set: subscriptionData,
            });
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const existingUser = await db.query.user.findFirst({
          where: eq(user.customerId, subscription.customer as string),
        });

        if (!existingUser) {
          console.warn(`No user found for customerId: ${subscription.customer}`);
          break;
        }

        const item = subscription.items.data[0];

        const subscriptionData = {
          id: subscription.id,
          userId: existingUser.id,
          stripePriceId: item.price.id,
          status: subscription.status,
          currentPeriodEnd: new Date(item.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };

        await db
          .insert(subscriptions)
          .values(subscriptionData)
          .onConflictDoUpdate({
            target: subscriptions.id,
            set: subscriptionData,
          });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Stripe webhook error: ${message} | Event: ${event.type}`);
  }

  return NextResponse.json({});
}
