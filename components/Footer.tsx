import Image from "next/image"
import Link from "next/link"

/**
 * Footer Component.
 * Displays project branding and links to the core contributors' GitHub profiles.
 */
export default function Footer() {

  return (
    <footer className="h-fit py-6 bg-sidebar border-t border-border flex flex-col items-center justify-center w-full gap-2">
      <h2 className="text-foreground text-lg font-bold tracking-wider">NKAB-Vault</h2>

      {/* Contributor Links */}
      <div className="flex items-center gap-2">
        <Link href="https://github.com/fosuri" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
          <p>fosuri</p>
          <span className="relative block size-4">
            <Image
              src="/Github/GitHub_Invertocat_Black.svg"
              alt="GitHub"
              fill
              className="dark:hidden"
            />
            <Image
              src="/Github/GitHub_Invertocat_White.svg"
              alt="GitHub"
              fill
              className="hidden dark:block"
            />
          </span>
        </Link>
        <p>&</p>
        <Link href="https://github.com/ArseniBogatorjov" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
          <p>arseni</p>
          <span className="relative block size-4">
            <Image
              src="/Github/GitHub_Invertocat_Black.svg"
              alt="GitHub"
              fill
              className="dark:hidden"
            />
            <Image
              src="/Github/GitHub_Invertocat_White.svg"
              alt="GitHub"
              fill
              className="hidden dark:block"
            />
          </span>
        </Link>
      </div>

      {/* Policy and Rules Links */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground my-1">
        <Link href="/terms" className="hover:text-foreground hover:underline transition-colors">
          Terms of Service
        </Link>
        <span className="text-muted-foreground/30">•</span>
        <Link href="/privacy" className="hover:text-foreground hover:underline transition-colors">
          Privacy Policy
        </Link>
        <span className="text-muted-foreground/30">•</span>
        <Link href="/rules" className="hover:text-foreground hover:underline transition-colors">
          Rules
        </Link>
      </div>

      {/* Copyright Notice */}
      <div>
        <p className="text-foreground text-sm">© 2026 NKAB-Vault. All rights reserved.</p>
      </div>
    </footer>
  )
}
