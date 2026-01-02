"use client";

import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { updateDoc, doc } from 'firebase/firestore';

export default function AdminLogout() {
  const router = useRouter();

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try { console.log('AdminLogout: handleLogout triggered'); } catch (_) {}
    
    // Mark user as offline before signing out
    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isOnline: false,
        });
      } catch (err) {
        try { console.debug('Could not mark user as offline:', err); } catch (_) { /* swallow */ }
      }
    }
    
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
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 font-semibold text-sm"
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="flex-1 text-left">Logout</span>
    </button>
  );
}
