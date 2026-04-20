import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link";

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  paymentLink?: string;
  userEmail?: string;
}

export function PricingCard({ 
  title, 
  price, 
  description, 
  features, 
  buttonText = "Select plan", 
  buttonVariant = "default",
  paymentLink,
  userEmail,
}: PricingCardProps) {
  const finalHref = paymentLink 
    ? (userEmail ? `${paymentLink}?prefilled_email=${encodeURIComponent(userEmail)}` : paymentLink)
    : "#";

  return (
    <div className={`relative flex flex-col h-full transition-all`}>
      <Card className={`flex flex-col flex-1 bg-background/50 backdrop-blur hover:shadow-md border-border/60`}>
        <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 pb-6 text-center justify-start">
        <div className="mb-4 mt-2 flex items-baseline justify-center text-4xl font-extrabold text-foreground">
          {price}
          {price !== "0€" && <span className="ml-1 text-lg font-normal text-muted-foreground">/mo</span>}
        </div>
        <ul className="space-y-4 text-sm text-left text-muted-foreground mt-4">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-primary shrink-0"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="leading-tight">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
        <CardFooter>
          {paymentLink ? (
            <Button asChild className="w-full font-semibold" variant={buttonVariant} size="lg">
              <Link href={finalHref}>
                {buttonText}
              </Link>
            </Button>
          ) : (
            <Button className="w-full font-semibold" variant={buttonVariant} size="lg">{buttonText}</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
