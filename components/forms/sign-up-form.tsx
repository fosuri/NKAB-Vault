"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldError,
} from "@/components/ui/field"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import * as z from "zod"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Loader2, Check, X, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { signInWithGoogle, signUpWithEmail } from "@/lib/auth/auth-client"
import { checkEmailAvailable } from "@/lib/actions/check-signup"
import Link from "next/link"

const formSchema = z.object({
  email: z.email(),
  password: z.string()
    .min(8, "Must be at least 8 characters long")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[^a-zA-Z0-9]/, "Must contain a special character"),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

function generateRandomName() {
  return "user_" + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}


export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const emailAvailable = await checkEmailAvailable(data.email);

    if (!emailAvailable) {
      form.setError("email", {
        type: "server",
        message: "This email is already registered.",
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUpWithEmail({
      email: data.email,
      password: data.password,
      name: generateRandomName(),
    });

    if (error) {
      form.setError("email", {
        type: "server",
        message: error.message || "An error occurred. Please try again.",
      });
    } else {
      toast.success("Account created successfully");
      window.location.assign("/");
    }
    setIsLoading(false);
  }

  return (
    <div className={cn("flex flex-col gap-6 ", className)} {...props}>
      <Card className="px-2 py-6  shadow-[0_0_400px] shadow-card-foreground/10 ">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome</CardTitle>
          <CardDescription>
            Sign up with your Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <Button variant="outline" type="button" onClick={signInWithGoogle}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Sign up with Google
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      type="email"
                      placeholder="m@example.com"
                      className="text-sm"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => {
                  const password = field.value || "";
                  const hasStartedTyping = password.length > 0;
                  const hasMinLength = password.length >= 8;
                  const hasLower = /[a-z]/.test(password);
                  const hasUpper = /[A-Z]/.test(password);
                  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

                  const renderRequirement = (isValid: boolean, text: string) => {
                    const colorClass = !hasStartedTyping 
                      ? "text-muted-foreground" 
                      : isValid ? "text-green-500" : "text-destructive";
                    return (
                      <span className={cn("flex items-center gap-2", colorClass)}>
                        {isValid ? <Check className="size-3" /> : <X className="size-3" />}
                        {text}
                      </span>
                    )
                  }

                  return (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>

                    </div>
                    <div className="relative">
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder=""
                        className="text-sm"
                        required
                      />
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 mt-1 text-xs font-medium">
                      {renderRequirement(hasMinLength, "At least 8 characters")}
                      {renderRequirement(hasLower, "At least one lowercase letter")}
                      {renderRequirement(hasUpper, "At least one uppercase letter")}
                      {renderRequirement(hasSpecial, "At least one special character")}
                    </div>
                  </Field>
                )}}
              />

              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Confirm Password</FieldLabel>

                    </div>
                    <div className="relative">
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder=""
                        className="text-sm"
                        required
                      />
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                        >
                          {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      )}
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    <FieldDescription>
                      Must match the password above.
                    </FieldDescription>
                  </Field>
                )}
              />



              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Sign up"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account? <Link href="/sign-in">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking Sign Up, you agree to our <Link href="/terms" className="underline underline-offset-4 hover:text-primary">Terms of Service</Link>{" "}
        and <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">Privacy Policy</Link>.
      </FieldDescription>
    </div>
  )
}
