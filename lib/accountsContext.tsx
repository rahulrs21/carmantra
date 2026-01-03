import React, { createContext, useContext, useState, useMemo } from 'react';

export type RangeType = '30d' | 'yesterday' | 'today' | 'thisMonth' | 'lastMonth' | 'allTime' | 'custom';

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface ActiveRange {
  start: Date;
  end: Date;
  isDaily: boolean;
}

interface AccountsContextType {
  rangeType: RangeType;
  setRangeType: (type: RangeType) => void;
  customRange: DateRange;
  setCustomRange: (range: DateRange) => void;
  selectedRange: any;
  setSelectedRange: (range: any) => void;
  isPopoverOpen: boolean;
  setIsPopoverOpen: (open: boolean) => void;
  activeRange: ActiveRange | null;
  rangeLabel: string;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const [rangeType, setRangeType] = useState<RangeType>('30d');
  const [customRange, setCustomRange] = useState<DateRange>({ from: null, to: null });
  const [selectedRange, setSelectedRange] = useState<any>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function endOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  function formatDateOnly(date: Date | null | undefined) {
    if (!date) return '-';
    const d = date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const activeRange = useMemo(() => {
    const now = new Date();
    if (rangeType === '30d') {
      const end = endOfDay(now);
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      return { start, end, isDaily: true };
    }
    if (rangeType === 'today') {
      const start = startOfDay(now);
      const end = endOfDay(now);
      return { start, end, isDaily: false };
    }
    if (rangeType === 'yesterday') {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const start = startOfDay(y);
      const end = endOfDay(y);
      return { start, end, isDaily: false };
    }
    if (rangeType === 'thisMonth') {
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { start, end, isDaily: true };
    }
    if (rangeType === 'lastMonth') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      const start = startOfDay(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1));
      const end = endOfDay(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0));
      return { start, end, isDaily: true };
    }
    if (rangeType === 'allTime') {
      const start = startOfDay(new Date(2000, 0, 1));
      const end = endOfDay(now);
      return { start, end, isDaily: true };
    }
    if (rangeType === 'custom') {
      const { from, to } = customRange;
      if (!from || !to) return null;
      const start = startOfDay(from);
      const end = endOfDay(to);
      const diff = Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000));
      return { start, end, isDaily: diff > 0 };
    }
    return null;
  }, [rangeType, customRange]);

  const rangeLabel = useMemo(() => {
    if (rangeType === '30d') return 'Last 30 days';
    if (rangeType === 'today') return 'Today';
    if (rangeType === 'yesterday') return 'Yesterday';
    if (rangeType === 'thisMonth') return 'This Month';
    if (rangeType === 'lastMonth') return 'Last Month';
    if (rangeType === 'allTime') return 'All Time';
    if (rangeType === 'custom' && customRange.from && customRange.to) return `${formatDateOnly(customRange.from)} — ${formatDateOnly(customRange.to)}`;
    return 'Custom range';
  }, [rangeType, customRange]);

  return (
    <AccountsContext.Provider
      value={{
        rangeType,
        setRangeType,
        customRange,
        setCustomRange,
        selectedRange,
        setSelectedRange,
        isPopoverOpen,
        setIsPopoverOpen,
        activeRange,
        rangeLabel,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountsProvider');
  }
  return context;
}
