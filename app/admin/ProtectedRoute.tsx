"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { safeConsoleError } from '@/lib/safeConsole';
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getUserRole } from '@/lib/getUserRole';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/admin/login");
        setLoading(false);
        return;
      }

      try {
        // Read user document to verify role.
        const role = await getUserRole(user.uid);
        const validRoles = ['admin', 'manager', 'sales', 'support', 'viewer'];
        if (!role || !validRoles.includes(role)) {
          // No valid role
          router.push("/admin/login");
          setLoading(false);
          return;
        }
      } catch (err) {
        safeConsoleError("ProtectedRoute error: ", err);
        // If Firestore returned a permission-denied, redirect to login with
        // a query param so the UI can show a helpful message.
        const code = (err as any)?.code;
        if (code === 'permission-denied') {
          router.push('/admin/login?error=permission_denied');
        } else {
          router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return <div className="p-10">Loading...</div>;
  }

  return <>{children}</>;
}
