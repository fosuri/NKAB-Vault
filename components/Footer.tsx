import Image from "next/image"
import Link from "next/link"

export default function Footer() {

  return (
    <div className="h-fit py-6 bg-sidebar border-t border-border flex flex-col items-center justify-center w-full gap-2">
      <h2 className="text-foreground text-lg font-bold tracking-wider">NKAB-Vault</h2>
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
      <div>
        <p className="text-foreground text-sm">© 2026 NKAB-Vault. All rights reserved.</p>
      </div>
    </div>
  )
}