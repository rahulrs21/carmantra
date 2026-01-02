"use client";

import ProtectedRoute from "./ProtectedRoute";
import AdminShell from '@/components/AdminShell';
import { UserProvider } from '@/lib/userContext';
import { ThemeProvider } from '@/lib/themeContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  // Track user online status
  useOnlineStatus();

  return (
    <ProtectedRoute>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <UserProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </UserProvider>
    </ThemeProvider>
  );
}
