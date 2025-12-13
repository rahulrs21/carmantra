"use client";

import AdminLogout from '@/components/AdminLogout';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* SIDEBAR */}
      <aside className="w-64 bg-white shadow-lg p-6 fixed h-full">
        <h2 className="text-2xl font-bold mb-6">CarMantra Admin</h2>

        <nav className="space-y-3">
          <a href="/admin" className="block p-2 rounded hover:bg-gray-200">
            Dashboard
          </a>

          <a href="/admin/leads" className="block p-2 rounded hover:bg-gray-200">
            Leads
          </a>

          <AdminLogout />
        </nav>
      </aside>

      <main className="ml-64 flex-1 p-10">{children}</main>
    </div>
  );
}
