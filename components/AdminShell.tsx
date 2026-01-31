"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, Timestamp } from 'firebase/firestore';
import AdminLogout from '@/components/AdminLogout';
import { startLeadCustomerSync } from '@/lib/firestore/leadSync';
import { useUser } from '@/lib/userContext';
import { useTheme } from '@/lib/themeContext';
import { getRoleLabel, getRoleBadgeColor, canAccessModule } from '@/lib/permissions';
import { Sun, Moon, Menu, X } from 'lucide-react';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const { role, displayName, photoURL } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [brandName, setBrandName] = useState('CarMantra CRM');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const lastSeenLeadTsRef = useRef(0);
  const leadSeenInitialized = useRef(false);
  const latestLeadTimestamp = useRef(0);
  const [hasNewLead, setHasNewLead] = useState(false);

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

  // Show bottom nav on scroll up, hide on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current < 20) {
        setShowBottomNav(true);
      } else if (current > lastScrollY.current + 10) {
        setShowBottomNav(false);
      } else if (current < lastScrollY.current - 10) {
        setShowBottomNav(true);
      }
      lastScrollY.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen to branding settings
  useEffect(() => {
    const brandingRef = doc(db, 'settings', 'branding');
    const unsub = onSnapshot(brandingRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { name?: string; logoUrl?: string };
        setBrandName(data.name || 'CarMantra CRM');
        setBrandLogo(data.logoUrl || null);
      }
    });
    return () => unsub();
  }, []);

  // Watch for new leads and flag the nav item
  useEffect(() => {
    const stored = Number(typeof window !== 'undefined' ? localStorage.getItem('crmLeadLastSeen') || '0' : '0');
    if (stored) {
      lastSeenLeadTsRef.current = stored;
    }

    const leadsRef = query(collection(db, 'crm-leads'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(leadsRef, (snap) => {
      const latest = snap.docs[0];
      if (!latest) return;
      const data = latest.data() as any;
      const ts = data?.createdAt?.seconds
        ? data.createdAt.seconds
        : data?.createdAt?.toDate
          ? Math.floor(data.createdAt.toDate().getTime() / 1000)
          : 0;
      if (!ts) return;

      latestLeadTimestamp.current = ts;

      if (!leadSeenInitialized.current) {
        leadSeenInitialized.current = true;
        if (!lastSeenLeadTsRef.current) {
          lastSeenLeadTsRef.current = ts;
          localStorage.setItem('crmLeadLastSeen', String(ts));
        }
        return;
      }

      if (ts > lastSeenLeadTsRef.current) {
        setHasNewLead(true);
      }
    });

    return () => unsub();
  }, []);

  // Clear lead badge when viewing leads
  useEffect(() => {
    if (pathname.startsWith('/admin/leads')) {
      if (latestLeadTimestamp.current) {
        lastSeenLeadTsRef.current = latestLeadTimestamp.current;
        localStorage.setItem('crmLeadLastSeen', String(latestLeadTimestamp.current));
      }
      setHasNewLead(false);
    }
  }, [pathname]);

  async function handleLogout() {
    // Mark user as offline before signing out
    const currentUser = auth.currentUser;
    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isOnline: false,
        });
      } catch (error) {
        console.debug('Could not mark user as offline:', error);
      }
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error', error);
    }

    try {
      await router.push('/admin/login');
    } catch (err) {
      try { window.location.assign('/admin/login'); } catch (_) {/* noop */}
    }
  }

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
      href: '/admin/b2b-booking', 
      label: 'B2B Booking',
      module: 'b2b-booking',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.581m0 0H9.42m5.999 0H15m-3 0h3" /></svg>
    },


    

    { 
      href: '/admin/accounts', 
      label: 'Accounts',
      module: 'accounts',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    
    { 
      href: '/admin/tasks', 
      label: 'Tasks',
      module: 'tasks',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      // children: [
      //   { href: '/admin/tasks', label: 'Manage Tasks', module: 'tasks' },
      // ]
    },

     { 
      href: '/admin/employees', 
      label: 'Employees',
      module: 'employees',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      children: [
        { href: '/admin/employees', label: 'All Employees', module: 'employees' },
        { href: '/admin/employees/attendance', label: 'Attendance', module: 'attendance' },
        { href: '/admin/employees/leaves', label: 'Leaves', module: 'employee-leaves' },
        { href: '/admin/employees/salary', label: 'Salary', module: 'employee-salary' },
      ]
    },
    
   
    { 
      href: '/admin/users', 
      label: 'Users',
      module: 'users',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },



    { 
      href: '/admin/employee-tasks', 
      label: 'My Tasks',
      module: 'employee-tasks',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    },
   
    
    { 
      href: '/admin/my-salary', 
      label: 'Salary',
      module: 'salary',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    

    { 
      href: '/admin/services', 
      label: 'Services',
      module: 'services',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },

    // { 
    //   href: '/admin/products', 
    //   label: 'Products',
    //   module: 'products',
    //   icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m0 0v10l8 4m0-10l8 4" /></svg>,
    //   requiredRoles: ['admin', 'manager']
    // },

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
      module: 'send-form', // before it was - module: 'leads',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    },

    { 
      href: '/admin/my-leaves', 
      label: 'My Leaves',
      module: 'leaves',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
    },

    { 
      href: '/admin/account', 
      label: 'My Account',
      module: 'dashboard',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },


  ];
  
  // Filter nav items based on user permissions
  const visibleNavItems = navItems.filter(item => {
    // Check if item has requiredRoles and user role is not included
    if ((item as any).requiredRoles && !(item as any).requiredRoles.includes(role)) {
      return false;
    }
    // Allow Send Form for employees and admins
    if ((role === 'employee' || role === 'admin' || role === 'manager' || role === 'sales') && item.href === '/admin/send-form') {
      return true;
    }
    // Hide Leads and Customers from employees (but allow Send Form)
    if (role === 'employee' && item.href !== '/admin/send-form' && (item.module === 'leads' || item.module === 'customers' || item.module === 'quotations' || item.module === 'invoices' || item.module === 'tasks')) {
      return false;
    }
    // Hide My Leaves from Admin and Manager roles (they manage staff, not their own leaves)
    if ((role === 'admin' || role === 'manager') && item.href === '/admin/my-leaves') {
      return false;
    }
    // hide my salary from admin and manager
    if ((role === 'admin' || role === 'manager') && item.href === '/admin/my-salary') {
      return false;
    }

    return canAccessModule(role, item.module);
  }).map(item => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => canAccessModule(role, child.module))
      };
    }
    return item;
  });

  // Get current active item for mobile bottom nav
  const activeItem = visibleNavItems.find(item => isActive(item.href));
  
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Profile Photo Lightbox - Circular Shape */}
      {showPhotoLightbox && photoURL && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4"
          onClick={() => setShowPhotoLightbox(false)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Circular Image Container */}
            <div className="relative w-80 h-80 flex items-center justify-center">
              <img
                src={photoURL}
                alt={displayName || "Profile"}
                className="w-full h-full rounded-full object-cover shadow-2xl border-4 border-white dark:border-gray-800"
              />
            </div>
            {/* Close Button */}
            <button
              onClick={() => setShowPhotoLightbox(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="w-9 h-9 rounded" />
            ) : (
              <div className="w-9 h-9 rounded bg-orange-600 text-white flex items-center justify-center font-bold text-sm">
                {brandName?.[0]?.toUpperCase() || 'C'}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold dark:text-white truncate">{brandName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
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
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Open profile menu"
              >
                <UserAvatar displayName={displayName} photoURL={photoURL} small />
              </button>
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                  <a
                    href="/admin/account"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    My Account
                  </a>
                  {photoURL && (
                    <button
                      onClick={() => {
                        setShowPhotoLightbox(true);
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2"
                    >
                      View Photo
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      setIsProfileMenuOpen(false);
                      await handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
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
      {isProfileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          onClick={() => setIsProfileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR - Desktop & Mobile Drawer - Visible for all authenticated users */}
      <aside className={`
        fixed z-50 transition-transform duration-300 ease-in-out
        w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col overflow-hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:block mt-[60px] lg:mt-0 h-[calc(100vh-60px)] lg:h-screen top-0 lg:top-0
        ${isLoggedIn ? '' : 'hidden'}
      `}>
        <div className="flex-1 lg:flex-none lg:max-h-[calc(100vh-100px)] min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgb(209,213,219)_transparent] dark:[scrollbar-color:rgb(55,65,81)_transparent]">
          <div className="p-6">
            {/* Branding Section - Always visible for all authenticated users */}
            <div className="mb-4 flex flex-col items-start gap-2">
              {brandLogo ? (
                <img src={brandLogo} alt={brandName} className="w-14 h-14 rounded" />
              ) : (
                <div className="w-14 h-14 rounded bg-orange-600 text-white flex items-center justify-center font-bold text-xl">
                  {brandName?.[0]?.toUpperCase() || 'C'}
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <h2 className="text-2xl font-bold dark:text-white truncate">{brandName}</h2>
              </div>
            </div>
            
            {/* Welcome Message */}
            {displayName && isLoggedIn && (
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar displayName={displayName} photoURL={photoURL} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back,</p>
                    <p className="text-base font-semibold text-gray-800 dark:text-white truncate">{displayName}</p>
                  </div>
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

            <nav className={`space-y-2 lg:space-y-3 pb-6 lg:pb-4 ${!isLoggedIn ? 'blur-sm pointer-events-none' : ''}`}>
              {visibleNavItems.map((item: any) => (
                <div key={item.href}>
                  {item.children ? (
                    <div>
                      <button
                        onClick={() => setExpandedMenu(expandedMenu === item.href ? null : item.href)}
                        className={`w-full relative flex items-center gap-3 px-3 py-2.5 lg:p-2 rounded-lg lg:rounded transition-all duration-200 group ${
                          expandedMenu === item.href || item.children.some((child: any) => isActive(child.href))
                            ? 'bg-orange-600 text-white font-semibold shadow-md'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm'
                        }`}
                      >
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate text-sm lg:text-base text-left">{item.label}</span>
                        <svg className={`flex-shrink-0 w-4 h-4 transition-transform ${expandedMenu === item.href ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>
                      {expandedMenu === item.href && (
                        <div className="mt-2 ml-4 space-y-2 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                          {item.children.map((child: any) => (
                            <a
                              key={child.href}
                              href={child.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                                isActive(child.href)
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-current flex-shrink-0"></span>
                              <span className="flex-1 truncate">{child.label}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`relative flex items-center gap-3 px-3 py-2.5 lg:p-2 rounded-lg lg:rounded transition-all duration-200 group ${
                        isActive(item.href)
                          ? 'bg-orange-600 text-white font-semibold shadow-md'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm'
                      }`}
                    >
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate text-sm lg:text-base">{item.label}</span>
                      {item.href === '/admin/leads' && hasNewLead && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-label="New leads" />
                      )}
                    </a>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {isLoggedIn && (
          <div onClick={() => setIsMobileMenuOpen(false)} className="flex-shrink-0 p-4 lg:p-5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 overflow-hidden">
            <AdminLogout />
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 lg:ml-64 dark:bg-gray-900 dark:text-white transition-colors pt-[76px] lg:pt-10 pb-20 lg:pb-10 overflow-x-hidden">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg transform transition-transform duration-200 ${showBottomNav ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-stretch gap-1 px-2 py-2 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {visibleNavItems.slice(0, 6).map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center px-3 py-2 min-w-[80px] rounded-lg transition-colors snap-start whitespace-nowrap ${
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
              {item.href === '/admin/leads' && hasNewLead && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-label="New leads" />
              )}
            </a>
          ))}
        </div>
      </nav>

    </div>
  );
}

function UserAvatar({ displayName, photoURL, small = false }: { displayName: string | null; photoURL: string | null; small?: boolean }) {
  const initial = displayName?.[0]?.toUpperCase() || 'U';
  const size = small ? 'w-7 h-7' : 'w-10 h-10';
  if (photoURL) {
    return <img src={photoURL} alt={displayName || 'User'} className={`${size} rounded-full object-cover border`} />;
  }
  return (
    <div className={`${size} rounded-full bg-orange-600 text-white flex items-center justify-center font-semibold`}>
      {initial}
    </div>
  );
}
