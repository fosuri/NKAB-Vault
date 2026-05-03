import { Scale, ScrollText, BookOpen, ShieldCheck, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
      <div className="mb-12 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Scale className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Terms of Service</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Please read these terms carefully before using our platform.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="space-y-8">
        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-blue-500/10 p-2 text-blue-500">
              <ScrollText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">1. Agreement to Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing or using NKAB Vault, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-indigo-500/10 p-2 text-indigo-500">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">2. Use License</h2>
              <p className="text-muted-foreground mb-4">
                Permission is granted to temporarily download one copy of the materials (information or software) on NKAB Vault for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>Modify or copy the materials;</li>
                <li>Use the materials for any commercial purpose, or for any public display;</li>
                <li>Attempt to decompile or reverse engineer any software contained on the platform;</li>
                <li>Remove any copyright or other proprietary notations from the materials; or</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-emerald-500/10 p-2 text-emerald-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">3. User Content</h2>
              <p className="text-muted-foreground mb-4">
                Our platform allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content that you post to the platform, including its legality, reliability, and appropriateness.
              </p>
              <p className="text-muted-foreground">
                By posting content to the platform, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such content on and through the platform.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-amber-500/10 p-2 text-amber-500">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">4. Limitations</h2>
              <p className="text-muted-foreground mb-4">
                In no event shall NKAB Vault or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the platform, even if authorized representatives have been notified orally or in writing of the possibility of such damage.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-12 flex justify-center gap-4">
        <Link href="/sign-up">
          <Button variant="outline" size="lg">
            Return to Sign Up
          </Button>
        </Link>
        <Link href="/">
          <Button variant="default" size="lg">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
