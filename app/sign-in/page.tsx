// "use client"

import { SignInForm } from "@/components/sign-in-form"
import { GalleryVerticalEndIcon } from "lucide-react"
import { getSession } from "@/lib/auth/auth-server";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/profile");
  }
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          NKAB Vault
        </a>
        <SignInForm />
      </div>
    </div>
  )
}
