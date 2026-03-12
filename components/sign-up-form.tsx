"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function SignUpForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPasswordMismatch = useMemo(() => {
    if (!form.confirmPassword) {
      return false;
    }

    return form.password !== form.confirmPassword;
  }, [form.password, form.confirmPassword]);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (isPasswordMismatch) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { error: signUpError } = await signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message ?? "Could not create your account.");
      return;
    }

    router.push("/sign-in");
  }

  return (
    <section className="w-full rounded-xl border border-accent/50 bg-header-background p-6 text-text-primary">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sign up with your email and password.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            className="h-10 w-full rounded-md border border-accent/50 bg-background-primary px-3 text-sm outline-none ring-accent/30 focus:ring-2"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
            className="h-10 w-full rounded-md border border-accent/50 bg-background-primary px-3 text-sm outline-none ring-accent/30 focus:ring-2"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            className="h-10 w-full rounded-md border border-accent/50 bg-background-primary px-3 text-sm outline-none ring-accent/30 focus:ring-2"
            placeholder="At least 8 characters"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
            className="h-10 w-full rounded-md border border-accent/50 bg-background-primary px-3 text-sm outline-none ring-accent/30 focus:ring-2"
            placeholder="Repeat password"
          />
          {isPasswordMismatch && (
            <p className="text-sm text-red-400">Passwords do not match.</p>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={isSubmitting || isPasswordMismatch}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
