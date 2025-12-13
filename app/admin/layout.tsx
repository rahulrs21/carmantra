import ProtectedRoute from "./ProtectedRoute";
import AdminShell from '@/components/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
