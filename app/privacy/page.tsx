"use client";

import { Lock, Eye, Server, Cookie } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * Privacy Policy Page.
 * A static informational page detailing how user data is handled, 
 * collected, and protected within the application.
 */
export default function PrivacyPolicyPage() {
  const router = useRouter();
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
      {/* Header Section */}
      <div className="mb-12 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Privacy Policy</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          How we collect, use, and protect your information.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Information Collection */}
        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-blue-500/10 p-2 text-blue-500">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">1. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                We only collect information about you if we have a reason to do so, for example, to provide our Services, to communicate with you, or to make our Services better.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>Information you provide to us directly (like email and username).</li>
                <li>Content you choose to upload and share on the platform.</li>
                <li>Basic analytics and usage data to improve user experience.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Usage Policy */}
        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-emerald-500/10 p-2 text-emerald-500">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">2. How We Use Information</h2>
              <p className="text-muted-foreground mb-4">
                We use the information we collect to operate our platform, maintain security, and personalize your experience. We do not sell your personal data to third parties.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>To create and maintain your account.</li>
                <li>To display content you've uploaded based on your access settings.</li>
                <li>To respond to your questions or requests.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Cookies */}
        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-indigo-500/10 p-2 text-indigo-500">
              <Cookie className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">3. Cookies and Tracking</h2>
              <p className="text-muted-foreground mb-4">
                We use strictly necessary cookies to keep you logged in and ensure our platform functions correctly. We may also use minimal analytics cookies to understand how our site is used.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Security */}
        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-amber-500/10 p-2 text-amber-500">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">4. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                While no online service is 100% secure, we work very hard to protect information about you against unauthorized access, use, alteration, or destruction, and take reasonable measures to do so.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Navigation Footer */}
      <div className="mt-12 flex justify-center gap-4">
        <Button variant="outline" size="lg" onClick={() => router.back()}>
          Go Back
        </Button>
        <Link href="/">
          <Button variant="default" size="lg">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

