import { PricingCard } from "@/components/pricing-card"

export default function PricingPage() {
  return (
    <div className="min-h-full flex-1 bg-[radial-gradient(circle_at_top,rgba(226,232,240,0.8),transparent_35%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)] px-4 py-16 dark:bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.35),transparent_30%),linear-gradient(180deg,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)] flex flex-col justify-center">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-16 text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Choose your plan
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 lg:gap-8 items-stretch max-w-5xl mx-auto pt-4">
          <PricingCard
            title="Free"
            price="0€"
            description="Just the basics for uploading and sharing."
            features={[
              "Standard image sharing",
              "Up to 10MB per file"
            ]}
            buttonText="Current Plan"
            buttonVariant="outline"
          />
          <PricingCard
            title="Pro"
            price="5€"
            description="More space and premium post visibility."
            features={[
              "Upload files up to 20MB",
              "Highlight your posts in the feed (or make them Pro-only)"
            ]}
            buttonText="Upgrade to Pro"
            popular={true}
          />
          <PricingCard
            title="Pro Supporter"
            price="10€"
            description="Same as Pro, but you buy me a coffee!"
            features={[
              "Same as Pro",
              "Extra support for the project"
            ]}
            buttonText="Become a Supporter"
            buttonVariant="secondary"
          />
        </div>
      </div>
    </div>
  )
}
