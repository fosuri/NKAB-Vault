"use client";

import { Button } from "@/components/ui/button";
import { authClient, signOut } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";


export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const loading = isPending;


  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Profile Page</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : user ? (
        <div className="mb-6 text-center">
          <p className="text-lg mb-2"><strong>Name:</strong> {user.name || "N/A"}</p>
          <p className="text-lg mb-2"><strong>Email:</strong> {user.email || "N/A"}</p>
        </div>
      ) : (
        <p className="mb-6 text-red-500">No user data available</p>
      )}

      <Button onClick={() => signOut(router)}>Sign Out</Button>
    </div>
  )
}