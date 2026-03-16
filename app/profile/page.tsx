"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  return (
    <div>
      Profile Page
      <Button onClick={() => signOut(router)}>
        Sign out
      </Button>
    </div>
  )
}