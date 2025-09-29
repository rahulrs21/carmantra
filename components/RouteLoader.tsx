"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Loading from "@/app/loading";

export function RouteLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show loader whenever route changes
    setLoading(true);

    // Small delay for smoothness
    const timeout = setTimeout(() => setLoading(false), 800);

    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <>
      {loading && <Loading />}
      {children}
    </>
  );
}
