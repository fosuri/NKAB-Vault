import Link from "next/link";
import { Button } from "./ui/button";
import SearchField from "./SearchField";
import Image from "next/image";

export default function Header() {
  return (
    <header className="flex items-center justify-between bg-header-background px-4 py-0 h-16 border border-accent">
      <Link href="/" className=" px-3 h-10 flex items-center gap-2">
        <div className="bg-amber-300 w-8 h-8 " >
          
        </div>
        <div className="bg-accent text-text-primary text-2xl font-bold px-3">
          NKAB Vault
        </div>
      </Link>
      <div>
        <SearchField />
      </div>
      <div>
        <Link href="/sign-in" className="text-text-primary">
          Sign In
        </Link>
      </div>
    </header>
  );
}
