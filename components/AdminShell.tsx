"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AdminLogout from '@/components/AdminLogout';
import { startLeadCustomerSync } from '@/lib/firestore/leadSync';
import { useUser } from '@/lib/userContext';
import { useTheme } from '@/lib/themeContext';
import { getRoleLabel, getRoleBadgeColor, canAccessModule } from '@/lib/permissions';
import { Sun, Moon, Menu, X } from 'lucide-react';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { role, displayName } = useUser();
  const { theme, toggleTheme } = useTheme();

  // Check authentication state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsub();
  }, []);

  // Start background lead sync on mount
  useEffect(() => {
    startLeadCustomerSync();
  }, []);

  const isActive = (href: string) => {
    if (href === '/admin') {
      // Only match exact /admin route for Dashboard
      return pathname === '/admin';
    }
    // For other routes, match exact or any subpath
    return pathname === href || pathname.startsWith(href + '/');
  };

  const navItems = [
    { 
      href: '/admin', 
      label: 'Dashboard',
      module: 'dashboard',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    },
    { 
      href: '/admin/leads', 
      label: 'Leads',
      module: 'leads',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    },
    
    { 
      href: '/admin/customers', 
      label: 'Customers',
      module: 'customers',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
    
    { 
      href: '/admin/book-service', 
      label: 'Book Service',
      module: 'services',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
    { 
      href: '/admin/services', 
      label: 'Services',
      module: 'services',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },

    { 
      href: '/admin/quotation', 
      label: 'Quotation',
      module: 'quotations',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },

    { 
      href: '/admin/invoice', 
      label: 'Invoice',
      module: 'invoices',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    { 
      href: '/admin/send-form', 
      label: 'Send Form',
      module: 'leads',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    },
    { 
      href: '/admin/users', 
      label: 'Users',
      module: 'users',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
  ];
  
  // Filter nav items based on user permissions
  const visibleNavItems = navItems.filter(item => canAccessModule(role, item.module));

  // Get current active item for mobile bottom nav
  const activeItem = visibleNavItems.find(item => isActive(item.href));
  
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold dark:text-white">CarMantra CRM</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 dark:text-white" />
              ) : (
                <Menu className="w-6 h-6 dark:text-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-[60px]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR - Desktop & Mobile Drawer */}
      <aside className={`
        fixed h-full z-50 transition-transform duration-300 ease-in-out
        w-64 bg-white dark:bg-gray-800 shadow-lg overflow-y-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:block mt-[60px] lg:mt-0
      `}>
        <div className="p-6">
          <div className="mb-2 hidden lg:block">
            <h2 className="text-2xl font-bold dark:text-white">CarMantra CRM</h2>
          </div>
          
          {/* Welcome Message */}
          {displayName && isLoggedIn && (
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back,</p>
                <p className="text-base font-semibold text-gray-800 dark:text-white">{displayName}</p>
              </div>
              
              {/* Theme Toggle - Desktop only */}
              <button
                onClick={toggleTheme}
                className="hidden lg:block p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          )}
          
          {/* Role Badge with Pulse */}
          {role && (
            <div className="mb-6 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(role)}`}>
                {getRoleLabel(role)}
              </span>
            </div>
          )}

          <nav className={`space-y-3 ${!isLoggedIn ? 'blur-sm pointer-events-none' : ''}`}>
            {visibleNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-2 rounded transition-colors ${
                  isActive(item.href)
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            ))}

            {isLoggedIn && (
              <div onClick={() => setIsMobileMenuOpen(false)}>
                <AdminLogout />
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 lg:ml-64 dark:bg-gray-900 dark:text-white transition-colors pt-[76px] lg:pt-10 pb-20 lg:pb-10 overflow-x-hidden">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-stretch gap-1 px-2 py-2 overflow-x-auto snap-x snap-mandatory">
          {visibleNavItems.slice(0, 6).map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center px-3 py-2 min-w-[80px] rounded-lg transition-colors snap-start whitespace-nowrap ${
                isActive(item.href)
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="w-6 h-6 flex-shrink-0">
                {item.icon}
              </div>
              <span className="text-[11px] mt-1 font-medium text-center">
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
