"use client";

import { AccountsProvider } from '@/lib/accountsContext';

export default function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountsProvider>
      {children}
    </AccountsProvider>
  );
}
