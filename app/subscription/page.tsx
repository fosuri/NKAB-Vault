import { PricingCard } from "@/components/pricing-card"
import { getSession } from "@/lib/auth/auth-server"
import { db } from "@/lib/db/db"
import { SUBSCRIPTION_STATUSES } from "@/lib/db/auth-schema";

export default async function PricingPage() {
  const session = await getSession();
  const userEmail = session?.user?.email;
  
  let isPro = false;
  if (session?.user?.id) {
    const activeSub = await db.query.subscriptions.findFirst({
      where: (subs, { eq, and, gt }) => and(
        eq(subs.userId, session.user.id),
        eq(subs.statusId, SUBSCRIPTION_STATUSES.ACTIVE),
        gt(subs.currentPeriodEnd, new Date())
      )
    });
    isPro = !!activeSub;
  }

  return (
    <div className="min-h-full flex-1 bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.8),transparent_35%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-16 dark:bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.35),transparent_30%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)] flex flex-col justify-center">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Choose your plan
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-stretch max-w-4xl mx-auto pt-4">
          <PricingCard
            title="Free"
            price="0€"
            description="Just the basics for uploading and sharing."
            features={[
              "Standard image sharing",
              "Up to 10MB per file"
            ]}
            buttonText={isPro ? "Back to Free" : "Current Plan"}
            buttonVariant={isPro ? "default" : "outline"}
            isCancel={isPro}
          />
          <PricingCard
            title="Pro"
            price="5€"
            description="More space and premium post visibility."
            features={[
              "Upload files up to 20MB",
              "Highlight your posts in the feed (or make them Pro-only)"
            ]}
            buttonText={isPro ? "Current Plan" : "Upgrade to Pro"}
            buttonVariant={isPro ? "outline" : "default"}
            isUpgrade={!isPro}
            userEmail={userEmail}
          />
        </div>
      </div>
    </div>
  )
}
