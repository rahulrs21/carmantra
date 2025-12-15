"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Loading from "@/app/loading";

export function RouteLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    // Skip initial mount
    if (first.current) {
      first.current = false;
      return;
    }

    // Only show the heavy full-screen loader if navigation takes longer
    // than `DELAY_MS`. This prevents flashing the loader on fast navs.
    const DELAY_MS = 180;
    let showTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => setLoading(true), DELAY_MS);

    // Safety: ensure loader hides eventually if something goes wrong
    const MAX_MS = 5000;
    const hideTimer = setTimeout(() => {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      setLoading(false);
    }, MAX_MS);

    return () => {
      if (showTimer) clearTimeout(showTimer);
      clearTimeout(hideTimer);
      setLoading(false);
    };
  }, [pathname]);

  return (
    <>
      {loading && <Loading />}
      {children}
    </>
  );
}
