"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PermissionGate, ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAccounts } from '@/lib/accountsContext';

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  outstandingPayments: number;
  pendingSalaries: number;
}

interface ChartData {
  month: string;
  income: number;
  expenses: number;
}

export default function AccountsPage() {
  const router = useRouter();
  const {
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
  } = useAccounts();

  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    outstandingPayments: 0,
    pendingSalaries: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [activeRange]);

  async function fetchDashboardData() {
    if (!activeRange) return;
    
    try {
      const { start, end } = activeRange;

      // Fetch paid invoices (filter by date in code to avoid composite index)
      const paidInvoicesQuery = query(
        collection(db, 'invoices'),
        where('paymentStatus', '==', 'paid')
      );
      const invoicesSnap = await getDocs(paidInvoicesQuery);
      const totalIncome = invoicesSnap.docs
        .filter((doc) => {
          const createdAt = doc.data().createdAt;
          if (!createdAt) return false;
          const docDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
          return docDate >= start && docDate <= end;
        })
        .reduce((sum, doc) => sum + (doc.data().total || 0), 0);

      // Fetch expenses (filter by date in code to avoid composite index)
      const expensesQuery = query(collection(db, 'expenses'));
      const expensesSnap = await getDocs(expensesQuery);
      const totalExpenses = expensesSnap.docs
        .filter((doc) => {
          const docDate = doc.data().date;
          if (!docDate) return false;
          const date = docDate.toDate ? docDate.toDate() : new Date(docDate);
          return date >= start && date <= end;
        })
        .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      // Fetch outstanding payments
      const outstandingQuery = query(
        collection(db, 'invoices'),
        where('paymentStatus', 'in', ['unpaid', 'partial'])
      );
      const outstandingSnap = await getDocs(outstandingQuery);
      const outstandingPayments = outstandingSnap.docs.reduce((sum, doc) => {
        const total = doc.data().total || 0;
        const paid = doc.data().paymentStatus === 'partial' ? (doc.data().partialPaidAmount || 0) : 0;
        return sum + (total - paid);
      }, 0);

      setStats({
        totalIncome,
        totalExpenses,
        outstandingPayments,
        pendingSalaries: 0, // Will be calculated with salary data
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    }
  }

  const modules = [
    {
      id: 'payments',
      title: 'Payment History',
      description: 'Track all invoice payments and financial transactions',
      icon: '💳',
      color: 'blue',
      route: '/admin/accounts/payments',
    },
    {
      id: 'expenses',
      title: 'Expense Management',
      description: 'Record and manage business expenses',
      icon: '💰',
      color: 'green',
      route: '/admin/accounts/expenses',
    },
    {
      id: 'attendance',
      title: 'Staff Attendance',
      description: 'Track daily staff attendance and working hours',
      icon: '📋',
      color: 'purple',
      route: '/admin/accounts/attendance',
    },
    {
      id: 'salary',
      title: 'Salary Management',
      description: 'Manage staff salaries and generate salary slips',
      icon: '💵',
      color: 'orange',
      route: '/admin/accounts/salary',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Accounts Management</h1>
          <p className="text-gray-500 mt-1">Centralized financial tracking and reporting</p>
        </header>

        {/* Date Range Filter Section */}
        <section className="sticky top-0 z-10 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by Date Range</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Currently viewing: <span className="font-medium text-gray-700 dark:text-gray-300">{rangeLabel}</span></p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="inline-flex rounded-md shadow-sm bg-gray-100 dark:bg-gray-800 items-center flex-shrink-0">
                <button 
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors rounded-l-md ${rangeType==='30d' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                  onClick={() => { setRangeType('30d'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}
                >
                  Last 30d
                </button>
                <button 
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 ${rangeType==='yesterday' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                  onClick={() => { setRangeType('yesterday'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}
                >
                  Yesterday
                </button>
                <button 
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 ${rangeType==='today' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                  onClick={() => { setRangeType('today'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}
                >
                  Today
                </button>
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button 
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 rounded-r-md ${rangeType==='custom' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                      onClick={() => setIsPopoverOpen(true)}
                    >
                      Custom
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto">
                    <div className="flex flex-col gap-2">
                      <Calendar
                        mode="range"
                        selected={selectedRange}
                        onSelect={(r: any) => {
                          setSelectedRange(r);
                          if (r?.from && r?.to) {
                            setCustomRange({ from: r.from, to: r.to });
                            setRangeType('custom');
                          } else if (r instanceof Date) {
                            setCustomRange({ from: r, to: r });
                            setRangeType('custom');
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setSelectedRange(undefined); setCustomRange({ from: null, to: null }); setIsPopoverOpen(false); }}
                        >
                          Clear
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            if (!selectedRange) return setIsPopoverOpen(false);
                            let from: Date | null = null;
                            let to: Date | null = null;
                            if (selectedRange.from || selectedRange.to) {
                              from = selectedRange.from || selectedRange.to || null;
                              to = selectedRange.to || selectedRange.from || null;
                            } else if (selectedRange instanceof Date) {
                              from = selectedRange;
                              to = selectedRange;
                            }
                            if (from && to) {
                              setCustomRange({ from, to });
                              setRangeType('custom');
                            }
                            setIsPopoverOpen(false);
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Stats */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="text-sm text-gray-500 font-medium">Monthly Income</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">AED {stats.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400 mt-1">From paid invoices</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="text-sm text-gray-500 font-medium">Monthly Expenses</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">AED {stats.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400 mt-1">All expenses recorded</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
              <div className="text-sm text-gray-500 font-medium">Outstanding Payments</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">AED {stats.outstandingPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400 mt-1">Pending & partial</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="text-sm text-gray-500 font-medium">Net Profit</div>
              <div className={`text-2xl font-bold mt-2 ${stats.totalIncome - stats.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                AED {(stats.totalIncome - stats.totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-400 mt-1">Income - Expenses</div>
            </div>
          </div>
        )}

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module) => {
            const colors = getColorClasses(module.color);
            return (
              <PermissionGate key={module.id} module="accounts" action="view">
                <a
                  href={module.route}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${colors.bg} border-2 ${colors.border} rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all transform hover:scale-105 block`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-3xl mb-2">{module.icon}</div>
                      <h3 className={`text-lg font-semibold ${colors.text}`}>{module.title}</h3>
                      <p className="text-sm text-gray-600 mt-2">{module.description}</p>
                    </div>
                    <div className={`text-2xl ${colors.text} opacity-50`}>→</div>
                  </div>
                </a>
              </PermissionGate>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <PermissionGate module="accounts" action="create">
              <Button
                onClick={() => router.push('/admin/accounts/expenses')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                + Add Expense
              </Button>
            </PermissionGate>
            <PermissionGate module="accounts" action="create">
              <Button
                onClick={() => router.push('/admin/accounts/attendance')}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                + Mark Attendance
              </Button>
            </PermissionGate>
            <PermissionGate module="accounts" action="view">
              <Button
                onClick={() => router.push('/admin/accounts/salary')}
                variant="outline"
              >
                View Salary Details
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-medium">Total Invoices This Month</div>
              <div className="text-2xl font-bold text-blue-900 mt-2">{Math.random().toFixed(0)}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium">Paid Invoices</div>
              <div className="text-2xl font-bold text-green-900 mt-2">{Math.random().toFixed(0)}</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-sm text-orange-600 font-medium">Pending Invoices</div>
              <div className="text-2xl font-bold text-orange-900 mt-2">{Math.random().toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>
    </ModuleAccessComponent>
  );
}
