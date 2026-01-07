"use client";

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, addDoc, deleteDoc, doc, onSnapshot, Timestamp, getDocs, where, updateDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PermissionGate, ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';
import { formatDateTime } from '@/lib/utils';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  quantity: number;
  date: { seconds: number };
  vendor?: string;
  receiptUrl?: string;
  jobCardNo?: string;
  serviceBookingId?: string;
  companyId?: string;
  companyName?: string;
}

interface SalaryRecord {
  id: string;
  month: string;
  employeeId: string;
  baseSalary: number;
  allowances: { [key: string]: number };
  deductions: { [key: string]: number };
  netSalary: number;
  status: string;
  employeeName?: string;
}

const EXPENSE_CATEGORIES = [
  'Spare Parts',
  'Tools & Equipment',
  'Rent & Utilities',
  'Staff Salary',
  'Marketing & Advertising',
  'Insurance',
  'Maintenance',
  'Office Supplies',
  'Transportation',
  'Other',
];

export default function ExpenseManagementPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [rangeType, setRangeType] = useState<'30d' | 'yesterday' | 'today' | 'thisMonth' | 'lastMonth' | 'allTime' | 'custom'>('30d');
  const [customRange, setCustomRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to: Date } | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryRecord | null>(null);
  const [isEditSalaryModalOpen, setIsEditSalaryModalOpen] = useState(false);
  const [salaryExpenses, setSalaryExpenses] = useState<SalaryRecord[]>([]);
  const [salaryFormData, setSalaryFormData] = useState({
    baseSalary: '',
    allowances: { DA: '', HRA: '', Other: '' },
    deductions: { IncomeTax: '', PF: '', Other: '' },
    status: 'pending' as const,
  });
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    quantity: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const q = query(collection(db, 'expenses'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Expense[];
      setExpenses(data.sort((a, b) => b.date.seconds - a.date.seconds));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch salary expenses - reactive to date filter
  useEffect(() => {
    const fetchSalaryExpenses = async () => {
      try {
        const salaryQuery = query(collection(db, 'salaryRecords'));
        const salarySnapshot = await getDocs(salaryQuery);
        
        // Determine the month/year range based on date filter
        let monthsToFetch: string[] = [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        if (rangeType === 'today') {
          const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
          monthsToFetch = [monthStr];
        } else if (rangeType === 'yesterday') {
          const monthStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}`;
          monthsToFetch = [monthStr];
        } else if (rangeType === 'thisMonth') {
          const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
          monthsToFetch = [monthStr];
        } else if (rangeType === 'lastMonth') {
          const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
          const monthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
          monthsToFetch = [monthStr];
        } else if (rangeType === 'allTime') {
          // Fetch all months - no filtering
          const allMonths = salarySnapshot.docs.map((doc) => doc.data().month);
          monthsToFetch = Array.from(new Set(allMonths));
        } else if (rangeType === '30d') {
          // Get all months in the range
          let currentDate = new Date(thirtyDaysAgo);
          while (currentDate <= today) {
            const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthsToFetch.includes(monthStr)) {
              monthsToFetch.push(monthStr);
            }
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        } else if (rangeType === 'custom' && customRange.from && customRange.to) {
          let currentDate = new Date(customRange.from);
          const endDate = new Date(customRange.to);
          while (currentDate <= endDate) {
            const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthsToFetch.includes(monthStr)) {
              monthsToFetch.push(monthStr);
            }
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        } else {
          // Default to current month
          const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          monthsToFetch = [monthStr];
        }

        const salaries = salarySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as SalaryRecord))
          .filter((salary) => monthsToFetch.includes(salary.month));

        // Fetch employee names - use document ID directly
        const salariesWithNames = await Promise.all(
          salaries.map(async (salary) => {
            try {
              const empDoc = await getDoc(doc(db, 'employees', salary.employeeId));
              const empName = empDoc.exists() ? empDoc.data().name : 'Unknown';
              return {
                ...salary,
                employeeName: empName,
              } as SalaryRecord;
            } catch (err) {
              console.error('Error fetching employee:', err);
              return {
                ...salary,
                employeeName: 'Unknown',
              } as SalaryRecord;
            }
          })
        );

        setSalaryExpenses(salariesWithNames);
      } catch (error) {
        console.error('Error fetching salary expenses:', error);
      }
    };

    fetchSalaryExpenses();
  }, [rangeType, customRange]);

  const filtered = useMemo(() => {
    let result = expenses;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) => e.description.toLowerCase().includes(query) || e.category.toLowerCase().includes(query));
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter);
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (rangeType === 'today') {
      result = result.filter((e) => {
        const eDate = new Date(e.date.seconds * 1000);
        const eDateOnly = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
        return eDateOnly.getTime() === today.getTime();
      }); 
    } else if (rangeType === 'yesterday') {
      result = result.filter((e) => {
        const eDate = new Date(e.date.seconds * 1000);
        const eDateOnly = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
        return eDateOnly.getTime() === yesterday.getTime();
      });
    } else if (rangeType === 'thisMonth') {
      result = result.filter((e) => {
        const eDate = new Date(e.date.seconds * 1000);
        return eDate.getMonth() === today.getMonth() && eDate.getFullYear() === today.getFullYear();
      });
    } else if (rangeType === 'lastMonth') {
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
      result = result.filter((e) => {
        const eDate = new Date(e.date.seconds * 1000);
        return eDate.getMonth() === lastMonthDate.getMonth() && eDate.getFullYear() === lastMonthDate.getFullYear();
      });
    } else if (rangeType === 'allTime') {
      // No filtering - show all expenses
      result = result;
    } else if (rangeType === '30d') {
      result = result.filter((e) => {
        const eDate = new Date(e.date.seconds * 1000);
        return eDate >= thirtyDaysAgo && eDate <= today;
      });
    } else if (rangeType === 'custom' && customRange.from && customRange.to) {
      result = result.filter((e) => {
        const eDate = new Date(e.date.seconds * 1000);
        const fromDate = new Date(customRange.from!);
        const toDate = new Date(customRange.to!);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        return eDate >= fromDate && eDate <= toDate;
      });
    }

    return result;
  }, [expenses, searchQuery, categoryFilter, rangeType, customRange]);

  const currentMonth = new Date();
  const monthlyExpenses = expenses.filter((e) => {
    const eDate = new Date(e.date.seconds * 1000);
    return eDate.getMonth() === currentMonth.getMonth() && eDate.getFullYear() === currentMonth.getFullYear();
  });
  const totalMonthlyExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Filter to only show PAID salary expenses
  const paidSalaries = salaryExpenses.filter((s) => s.status === 'paid');
  
  // Get current month paid salaries
  const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthPaidSalaries = paidSalaries.filter((s) => s.month === currentMonthStr);
  const totalMonthlyPaidSalaries = currentMonthPaidSalaries.reduce((sum, s) => sum + s.netSalary, 0);
  
  // Combined total for current month (excluding salaries)
  const totalMonthly = totalMonthlyExpenses;
  
  // Calculate total filtered salary expenses (only paid) - NOT INCLUDED IN TOTALS
  const totalFilteredSalary = paidSalaries.reduce((sum, s) => sum + s.netSalary, 0);
  
  // Total All Time (from filtered expenses only - EXCLUDING salaries)
  const totalAll = filtered.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.description || !formData.amount || !formData.quantity) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await addDoc(collection(db, 'expenses'), {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        quantity: parseFloat(formData.quantity),
        vendor: formData.vendor || '',
        date: Timestamp.fromDate(new Date(formData.date)),
        createdAt: Timestamp.now(),
      });

      setFormData({
        category: '',
        description: '',
        amount: '',
        quantity: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: (expense.amount || 0).toString(),
      quantity: (expense.quantity || 0).toString(),
      vendor: expense.vendor || '',
      date: new Date(expense.date.seconds * 1000).toISOString().split('T')[0],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    try {
      await updateDoc(doc(db, 'expenses', editingExpense.id), {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        quantity: parseFloat(formData.quantity),
        vendor: formData.vendor || '',
        date: Timestamp.fromDate(new Date(formData.date)),
        updatedAt: Timestamp.now(),
      });

      setFormData({
        category: '',
        description: '',
        amount: '',
        quantity: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
      });
      setIsEditModalOpen(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Failed to update expense');
    }
  };

  const handleDelete = async (id: string, description: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this expense?\n\nDescription: ${description}\n\nThis action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  const handleEditSalary = (salary: SalaryRecord) => {
    setEditingSalary(salary);
    setSalaryFormData({
      baseSalary: salary.baseSalary.toString(),
      allowances: {
        DA: (salary.allowances?.DA || 0).toString(),
        HRA: (salary.allowances?.HRA || 0).toString(),
        Other: (salary.allowances?.Other || 0).toString(),
      },
      deductions: {
        IncomeTax: (salary.deductions?.IncomeTax || 0).toString(),
        PF: (salary.deductions?.PF || 0).toString(),
        Other: (salary.deductions?.Other || 0).toString(),
      },
      status: salary.status as any,
    });
    setIsEditSalaryModalOpen(true);
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalary) return;

    try {
      const baseSalary = parseFloat(salaryFormData.baseSalary);
      const allowances = {
        DA: parseFloat(salaryFormData.allowances.DA) || 0,
        HRA: parseFloat(salaryFormData.allowances.HRA) || 0,
        Other: parseFloat(salaryFormData.allowances.Other) || 0,
      };
      const deductions = {
        IncomeTax: parseFloat(salaryFormData.deductions.IncomeTax) || 0,
        PF: parseFloat(salaryFormData.deductions.PF) || 0,
        Other: parseFloat(salaryFormData.deductions.Other) || 0,
      };

      const totalAllowances = Object.values(allowances).reduce((a: number, b: number) => a + b, 0);
      const totalDeductions = Object.values(deductions).reduce((a: number, b: number) => a + b, 0);
      const netSalary = baseSalary + totalAllowances - totalDeductions;

      await updateDoc(doc(db, 'salaryRecords', editingSalary.id), {
        baseSalary,
        allowances,
        deductions,
        netSalary,
        status: salaryFormData.status,
        updatedAt: Timestamp.now(),
      });

      setSalaryFormData({
        baseSalary: '',
        allowances: { DA: '', HRA: '', Other: '' },
        deductions: { IncomeTax: '', PF: '', Other: '' },
        status: 'pending',
      });
      setIsEditSalaryModalOpen(false);
      setEditingSalary(null);
    } catch (error) {
      console.error('Error updating salary:', error);
      alert('Failed to update salary');
    }
  };

  return (
    <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Expense Management</h1>
            <p className="text-sm text-gray-500 mt-1">Track and manage business expenses</p>
          </div>
          <PermissionGate module="accounts" action="create">
            <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
              {showForm ? '✕ Cancel' : '+ Add Expense'}
            </Button>
          </PermissionGate>
        </div>


        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Input
              placeholder="Search description or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm h-10 dark:bg-gray-800"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Date Filter - Responsive */}
            <div className="w-full"></div>
          </div>

          {/* Date Filter Buttons - Wraps on mobile */}
          <div className="overflow-x-auto -mx-4 px-4 lg:overflow-visible lg:mx-0 lg:px-0">
            <div className="inline-flex lg:flex rounded-md shadow-sm bg-gray-100 dark:bg-gray-800 items-center w-full lg:w-auto flex-shrink-0">
              <button
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap transition-colors rounded-l-md flex-1 lg:flex-none ${rangeType === '30d' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => { setRangeType('30d'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}
              >
                Last 30d
              </button>
              <button
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 flex-1 lg:flex-none ${rangeType === 'yesterday' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => { setRangeType('yesterday'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}
              >
                Yesterday
              </button>
              <button
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 flex-1 lg:flex-none ${rangeType === 'today' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => { setRangeType('today'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}
              >
                Today
              </button>
              <button
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 flex-1 lg:flex-none ${rangeType === 'thisMonth' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => { setRangeType('thisMonth'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}
              >
                This Month
              </button>
              <button
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 flex-1 lg:flex-none ${rangeType === 'lastMonth' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => { setRangeType('lastMonth'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}
              >
                Last Month
              </button>
              <button
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 flex-1 lg:flex-none ${rangeType === 'allTime' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => { setRangeType('allTime'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}
              >
                All Time
              </button>
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 rounded-r-md flex-1 lg:flex-none ${rangeType === 'custom' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
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

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="border rounded px-3 py-2 h-10 dark:bg-gray-800"
                >
                  <option value="">Select Category</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                

                <Input
                  type="number"
                  placeholder="Quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="h-10"
                />

                <Input
                  type="number"
                  placeholder="Amount (AED)"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="h-10"
                />

                <Input
                  type="text"
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-1 h-10"
                />

                <Input
                  type="text"
                  placeholder="Vendor/Supplier (Optional)"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="h-10"
                />

                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-10"
                />
              </div>

              <Button type="submit" className="w-full">
                Save Expense
              </Button>
            </form>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200 animate-accordion-down">
            <div className="text-sm text-red-600 font-medium">Total (Expenses Only)</div>
            <div className="text-2xl font-bold text-red-900 mt-1">AED {totalAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-red-600 mt-1">{filtered.length} expenses</div>
          </div>

          {/* <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">This Month</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">AED {totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-blue-600 mt-1">{monthlyExpenses.length} expenses + {currentMonthPaidSalaries.length} paid salaries</div>
          </div> */}
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Categories Used</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">{new Set(filtered.map((e) => e.category)).size}</div>
            <div className="text-xs text-purple-600 mt-1">distinct categories</div>
          </div>
        </div>

        

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No expenses found</div>
          ) : (
            <div className={filtered.length > 10 ? 'overflow-x-auto max-h-96' : 'overflow-x-auto'}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Job Card</th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Category</th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Description</th>
                    <th className="hidden sm:table-cell text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Vendor</th>
                    <th className="text-right px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Qty</th>
                    <th className="text-right px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-center px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{new Date(expense.date.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900">
                        {expense.companyName && expense.companyId ? (
                          <a
                            href={`/admin/b2b-booking/companies/${expense.companyId}/services/${expense.serviceBookingId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-100 text-green-800 hover:bg-green-200 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer inline-block"
                            title="Open B2B service detail in new tab"
                          >
                            {expense.companyName}
                          </a>
                        ) : expense.companyName ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                            {expense.companyName}
                          </span>
                        ) : expense.serviceBookingId ? (
                          <a
                            href={`/admin/book-service/${expense.serviceBookingId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer inline-block"
                            title="Open booking service in new tab"
                          >
                            {expense.jobCardNo || '-'}
                          </a>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-semibold">{expense.jobCardNo || '-'}</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">{expense.category.substring(0, 10)}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 max-w-xs truncate">{expense.description}</td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{expense.vendor || '-'}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-right text-gray-600">{expense.quantity}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-right text-gray-900">AED {(expense.amount)}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm space-x-1 flex justify-center">
                        <PermissionGate module="accounts" action="edit">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-md hover:underline mr-3 "
                          >
                            Edit
                          </button>
                        </PermissionGate>
                        <PermissionGate module="accounts" action="delete">
                          <button
                            onClick={() => handleDelete(expense.id, expense.description)}
                            className="text-red-600 hover:text-red-800 font-medium text-md hover:underline "
                          >
                            Delete
                          </button>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COMMENTED OUT - Employee Salary Expenses - NOT included in totals
        {paidSalaries.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center sm:justify-start gap-4  ">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-purple-900">Employee Salary Expenses (Paid Only)</h2>
                <p className="text-xs sm:text-sm text-purple-700 mt-1">Total Monthly Staff Payroll - Paid Salaries</p>
              </div>
              <div className='p-2 bg-purple-200 rounded-md text-center '>
                <div className="text-2xl font-bold text-purple-900 mt-2">
                  AED {totalFilteredSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-purple-700 mt-1">{paidSalaries.length} paid salary records</div>
              </div>
            </div>
            <div className={paidSalaries.length > 10 ? 'overflow-x-auto max-h-96' : 'overflow-x-auto'}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Employee</th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Month</th>
                    <th className="text-right px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Base</th>
                    <th className="hidden sm:table-cell text-right px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Allowances</th>
                    <th className="hidden sm:table-cell text-right px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Deductions</th>
                    <th className="text-right px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Net</th>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paidSalaries.map((salary) => {
                    const totalAllowances = salary.allowances ? (Object.values(salary.allowances) as number[]).reduce((a: number, b: number) => a + b, 0) : 0;
                    const totalDeductions = salary.deductions ? (Object.values(salary.deductions) as number[]).reduce((a: number, b: number) => a + b, 0) : 0;
                    // Format month from "2025-01" to "January 2025"
                    const [year, month] = salary.month.split('-');
                    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
                    return (
                      <tr key={salary.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900 max-w-xs truncate">{salary.employeeName}</td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{monthName}</td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-right text-gray-600">{(salary.baseSalary )}</td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-xs sm:text-sm text-right text-gray-600">{(totalAllowances)}</td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-xs sm:text-sm text-right text-gray-600">{(totalDeductions)}</td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-bold text-right text-gray-900">{(salary.netSalary )}</td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            salary.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : salary.status === 'approved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {salary.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-purple-50 border-t-2 border-purple-200">
                  <tr>
                    <td colSpan={2} className="px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold text-purple-900">Total</td>
                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold text-right text-purple-900">
                      {(paidSalaries.reduce((sum, s) => sum + s.baseSalary, 0))}
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold text-right text-purple-900">
                      {(paidSalaries.reduce((sum, s) => sum + ((Object.values(s.allowances || {}) as number[]).reduce((a: number, b: number) => a + b, 0)), 0))}
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold text-right text-purple-900">
                      {(paidSalaries.reduce((sum, s) => sum + ((Object.values(s.deductions || {}) as number[]).reduce((a: number, b: number) => a + b, 0)), 0))}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm font-bold text-right text-purple-900">
                      {(paidSalaries.reduce((sum, s) => sum + s.netSalary, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        */}

        {/* Edit Salary Modal */}
        {isEditSalaryModalOpen && editingSalary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold">Edit Salary Record</h2>
                <button
                  onClick={() => {
                    setIsEditSalaryModalOpen(false);
                    setEditingSalary(null);
                    setSalaryFormData({
                      baseSalary: '',
                      allowances: { DA: '', HRA: '', Other: '' },
                      deductions: { IncomeTax: '', PF: '', Other: '' },
                      status: 'pending',
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateSalary} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Employee</label>
                  <div className="w-full border rounded px-3 py-2 h-10 bg-gray-100 flex items-center text-sm">
                    {editingSalary.employeeName}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Base Salary (AED)</label>
                  <Input
                    type="number"
                    value={salaryFormData.baseSalary}
                    onChange={(e) => setSalaryFormData({ ...salaryFormData, baseSalary: e.target.value })}
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Allowances</label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="DA"
                      value={salaryFormData.allowances.DA}
                      onChange={(e) => setSalaryFormData({
                        ...salaryFormData,
                        allowances: { ...salaryFormData.allowances, DA: e.target.value }
                      })}
                      className="h-10"
                    />
                    <Input
                      type="number"
                      placeholder="HRA"
                      value={salaryFormData.allowances.HRA}
                      onChange={(e) => setSalaryFormData({
                        ...salaryFormData,
                        allowances: { ...salaryFormData.allowances, HRA: e.target.value }
                      })}
                      className="h-10"
                    />
                    <Input
                      type="number"
                      placeholder="Other Allowances"
                      value={salaryFormData.allowances.Other}
                      onChange={(e) => setSalaryFormData({
                        ...salaryFormData,
                        allowances: { ...salaryFormData.allowances, Other: e.target.value }
                      })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Deductions</label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Income Tax"
                      value={salaryFormData.deductions.IncomeTax}
                      onChange={(e) => setSalaryFormData({
                        ...salaryFormData,
                        deductions: { ...salaryFormData.deductions, IncomeTax: e.target.value }
                      })}
                      className="h-10"
                    />
                    <Input
                      type="number"
                      placeholder="PF"
                      value={salaryFormData.deductions.PF}
                      onChange={(e) => setSalaryFormData({
                        ...salaryFormData,
                        deductions: { ...salaryFormData.deductions, PF: e.target.value }
                      })}
                      className="h-10"
                    />
                    <Input
                      type="number"
                      placeholder="Other Deductions"
                      value={salaryFormData.deductions.Other}
                      onChange={(e) => setSalaryFormData({
                        ...salaryFormData,
                        deductions: { ...salaryFormData.deductions, Other: e.target.value }
                      })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Status</label>
                  <select
                    value={salaryFormData.status}
                    onChange={(e) => setSalaryFormData({ ...salaryFormData, status: e.target.value as any })}
                    className="w-full border rounded px-3 py-2 h-10 dark:bg-gray-800"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsEditSalaryModalOpen(false);
                      setEditingSalary(null);
                      setSalaryFormData({
                        baseSalary: '',
                        allowances: { DA: '', HRA: '', Other: '' },
                        deductions: { IncomeTax: '', PF: '', Other: '' },
                        status: 'pending',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Update Salary
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Expense Modal */}
        {isEditModalOpen && editingExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold">Edit Expense</h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingExpense(null);
                    setFormData({
                      category: '',
                      description: '',
                      amount: '',
                      quantity: '',
                      vendor: '',
                      date: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateExpense} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded px-3 py-2 h-10 dark:bg-gray-800"
                  >
                    <option value="">Select Category</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Description</label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Amount (AED)</label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Vendor (Optional)</label>
                  <Input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingExpense(null);
                      setFormData({
                        category: '',
                        description: '',
                        amount: '',
                        quantity: '',
                        vendor: '',
                        date: new Date().toISOString().split('T')[0],
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Update Expense
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ModuleAccessComponent>
  );
}
