import { Github } from "lucide-react"
import Link from "next/link"

export default function Footer() {

  return (
    <div className="h-fit py-6 bg-sidebar border-t border-border flex flex-col items-center justify-center w-full gap-2">
      <h2 className="text-foreground text-lg font-bold tracking-wider">NKAB-Vault</h2>
      <div className="flex items-center gap-2">
        <Link href="https://github.com/fosuri" className="flex items-center gap-2 hover:underline">
          <p>fosuri</p>
          <Github className="size-4" />
        </Link>
        <p>&</p>
        <Link href="https://github.com/ArseniBogatorjov" className="flex items-center gap-2 hover:underline">
          <p>arseni</p>
          <Github className="size-4" />
        </Link>
      </div>
      <div>
        <p className="text-foreground text-sm">© 2026 NKAB-Vault. All rights reserved.</p>
      </div>
    </div>
  )
}