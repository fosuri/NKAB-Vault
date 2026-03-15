import Link from "next/link";
import SearchField from "./SearchField";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  return (
    <header className="flex items-center justify-between bg-background text-foreground px-4 py-0 h-16 border-b border-border">
      <Link href="/" className=" px-3 h-10 flex items-center gap-2">
        <div className="bg-amber-300 w-8 h-8 " >
          
        </div>
        <div className="bg-accent text-accent-foreground text-2xl font-bold px-3">
          NKAB Vault
        </div>
      </Link>
      <div>
        <SearchField />
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <Link href="/sign-in" className="text-foreground text-base">
          Sign In
        </Link>
        <Link href="/sign-up" className="text-foreground text-base">
          Sign Up
        </Link>
      </div>
    </header>
  );
}
