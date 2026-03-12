
import { getSession } from "@/lib/auth/auth-server";
import { redirect } from "next/navigation";
import SignUpForm from "@/components/sign-up-form";


export default async function SignUpPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-md items-center justify-center px-4">
      <SignUpForm />
    </main>
  );
}