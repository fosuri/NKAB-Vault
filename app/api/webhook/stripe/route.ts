import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/auth-schema";

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
        const session = await stripe.checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id, { expand: ["line_items"] });

        const customerId = session.customer as string;
        const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
        const priceId = session.line_items?.data[0]?.price?.id;

        if (!customer.email) {
          throw new Error("No customer email found");
        }

        const existing = await db.query.user.findFirst({
          where: eq(user.email, customer.email),
        });

        if (!existing) {
          throw new Error(`No user found for email: ${customer.email}`);
        }

        await db.update(user).set({ customerId, priceId, isPro: true }).where(eq(user.email, customer.email));

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = await stripe.subscriptions.retrieve((event.data.object as Stripe.Subscription).id);

        const existing = await db.query.user.findFirst({
          where: eq(user.customerId, subscription.customer as string),
        });

        if (!existing) {
          throw new Error(`No user found for customerId: ${subscription.customer}`);
        }

        await db
          .update(user)
          .set({ isPro: false })
          .where(eq(user.customerId, subscription.customer as string));

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
