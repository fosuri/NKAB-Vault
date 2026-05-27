"use client";

import { useEffect } from "react";

export function ClearUnlockParam() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("unlock")) return;

    url.searchParams.delete("unlock");
    const search = url.searchParams.toString();
    const cleanUrl = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;

    window.history.replaceState(window.history.state, "", cleanUrl);
  }, []);

  return null;
}
