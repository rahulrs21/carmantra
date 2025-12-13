"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AdminLogout() {
  const router = useRouter();

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try { console.log('AdminLogout: handleLogout triggered'); } catch (_) {}
    // No default action to prevent here (not inside a form). Perform
    // a sign-out and navigate to the login page. Use an explicit
    // fallback to a full-page redirect if client navigation fails.
    try {
      await signOut(auth);
    } catch (err) {
      try { console.error('Sign out error', err); } catch (_) { /* swallow */ }
    }

    try {
      await router.push('/admin/login');
    } catch (err) {
      // router.push can fail in some edge cases; fall back to full reload
      try { window.location.assign('/admin/login'); } catch (_) { /* swallow */ }
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="mt-10 p-2 block w-full text-left rounded hover:bg-red-100 text-red-600"
    >
      Logout
    </button>
  );
}
