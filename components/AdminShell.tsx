"use client";

import { usePathname } from 'next/navigation';
import AdminLogout from '@/components/AdminLogout';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      // Only match exact /admin route for Dashboard
      return pathname === '/admin';
    }
    // For other routes, match exact or any subpath
    return pathname === href || pathname.startsWith(href + '/');
  };

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/leads', label: 'Leads' },
    { href: '/admin/invoice', label: 'Invoice' },
    { href: '/admin/quotation', label: 'Quotation' },
    { href: '/admin/send-form', label: 'Send Form' },
    { href: '/admin/book-service', label: 'Book Service' },
    { href: '/admin/services', label: 'Services' },
  ];
  return (
    <div className="flex min-h-screen bg-gray-100"> 

      {/* SIDEBAR */}
      <aside className="w-64 bg-white shadow-lg p-6 fixed h-full">
        <h2 className="text-2xl font-bold mb-6">CarMantra Admin</h2>

        <nav className="space-y-3">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`block p-2 rounded transition-colors ${
                isActive(item.href)
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'hover:bg-gray-200'
              }`}
            >
              {item.label}
            </a>
          ))}

          <AdminLogout />
        </nav>
      </aside>

      <main className="ml-64 flex-1 p-10">{children}</main>
    </div>
  );
}
