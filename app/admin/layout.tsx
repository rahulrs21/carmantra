"use client";

import ProtectedRoute from "./ProtectedRoute";
import AdminShell from '@/components/AdminShell';
import { UserProvider } from '@/lib/userContext';
import { ThemeProvider } from '@/lib/themeContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <UserProvider>
        <ProtectedRoute>
          <AdminShell>{children}</AdminShell>
        </ProtectedRoute>
      </UserProvider>
    </ThemeProvider>
  );
}
