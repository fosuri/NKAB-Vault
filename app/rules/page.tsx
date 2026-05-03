import { Shield, FileText, AlertTriangle, CheckCircle2, UserX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RulesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
      <div className="mb-12 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Site Rules</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          To maintain a safe and welcoming environment for everyone, we ask that you follow these guidelines.
        </p>
      </div>

      <div className="space-y-8">
        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-emerald-500/10 p-2 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">1. Be Respectful</h2>
              <p className="text-muted-foreground mb-4">
                Treat all members with respect. Harassment, hate speech, bullying, and abusive language are strictly prohibited. We celebrate diversity and encourage constructive conversations.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>No personal attacks or insults</li>
                <li>No discrimination based on race, gender, religion, or orientation</li>
                <li>Debate the idea, don't attack the person</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-blue-500/10 p-2 text-blue-500">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">2. Content Guidelines</h2>
              <p className="text-muted-foreground mb-4">
                Share high-quality, relevant content. Ensure you have the rights to the content you upload and respect intellectual property.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>No spam or excessive self-promotion</li>
                <li>No illegal content or piracy</li>
                <li>Tag NSFW content appropriately (if applicable)</li>
                <li>Credit original creators when sharing their work</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-amber-500/10 p-2 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">3. Privacy and Safety</h2>
              <p className="text-muted-foreground mb-4">
                Do not share personal, private information (doxxing) about yourself or others. Keep your account secure and report any suspicious activity.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>No sharing of addresses, phone numbers, or private emails</li>
                <li>No malicious links or phishing attempts</li>
                <li>Report behavior that violates these rules</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-full bg-destructive/10 p-2 text-destructive">
              <UserX className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2 text-destructive">Enforcement</h2>
              <p className="text-muted-foreground">
                Violations of these rules may result in content removal, temporary suspension, or permanent account banning at the discretion of our moderation team. We reserve the right to enforce these rules to protect our community.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-6">
          By using NKAB Vault, you agree to abide by these rules.
        </p>
        <Link href="/new-post">
          <Button variant="outline" size="lg">
            Return to Post Creation
          </Button>
        </Link>
      </div>
    </div>
  );
}
