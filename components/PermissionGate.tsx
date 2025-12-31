"use client";

import { ReactNode } from 'react';
import { useUser } from '@/lib/userContext';
import { hasPermission } from '@/lib/permissions';

export const ModuleAccess = {
  DASHBOARD: 'dashboard',
  LEADS: 'leads',
  CUSTOMERS: 'customers',
  SERVICES: 'services',
  INVOICES: 'invoices',
  QUOTATIONS: 'quotations',
  B2B_BOOKING: 'b2b-booking',
  USERS: 'users',
  ACCOUNTS: 'accounts',
} as const;

interface PermissionGateProps {
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete';
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ module, action, children, fallback = null }: PermissionGateProps) {
  const { role } = useUser();
  
  if (!hasPermission(role, module, action)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

interface ModuleAccessComponentProps {
  module: string;
  children: ReactNode;
}

export function ModuleAccessComponent({ module, children }: ModuleAccessComponentProps) {
  const { role } = useUser();
  
  if (!hasPermission(role, module, 'view')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 dark:text-white">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this module. Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
