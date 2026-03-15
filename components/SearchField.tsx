"use client";
import Link from "next/link";
import { useState } from "react";


export default function SearchField() {
  const [search, setSearch] = useState("");

  return (
    <form
      className="
    relative flex items-center px-2 h-10 border-b border-border

    before:absolute before:left-0 before:bottom-0
    before:h-1/2 before:w-px before:bg-border

    after:absolute after:right-0 after:bottom-0
    after:h-1/2 after:w-px after:bg-border
  "
    >
      <div>
        <Link href="/" className="text-foreground text-base px-4 py-2 block font-semibold fon">
          FEED
        </Link>
      </div>
      <span className="h-5 w-0.5 bg-accent"></span>
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="text-muted-foreground placeholder:text-muted-foreground text-base font-semibold bg-transparent outline-none inline-block px-4 py-2"
      />
    </form>
  )
}