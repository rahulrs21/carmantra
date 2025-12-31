"use client";

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, addDoc, deleteDoc, doc, onSnapshot, Timestamp, getDocs, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate, ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';
import { formatDateTime } from '@/lib/utils';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: { seconds: number };
  vendor?: string;
  receiptUrl?: string;
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
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
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

  const filtered = useMemo(() => {
    let result = expenses;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) => e.description.toLowerCase().includes(query) || e.category.toLowerCase().includes(query));
    }

    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter);
    }

    return result;
  }, [expenses, searchQuery, categoryFilter]);

  const currentMonth = new Date();
  const monthlyExpenses = expenses.filter((e) => {
    const eDate = new Date(e.date.seconds * 1000);
    return eDate.getMonth() === currentMonth.getMonth() && eDate.getFullYear() === currentMonth.getFullYear();
  });
  const totalMonthly = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.description || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await addDoc(collection(db, 'expenses'), {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        vendor: formData.vendor || '',
        date: Timestamp.fromDate(new Date(formData.date)),
        createdAt: Timestamp.now(),
      });

      setFormData({
        category: '',
        description: '',
        amount: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
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

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="col-span-1 md:col-span-2 h-10"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">This Month</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">AED {totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-blue-600 mt-1">{monthlyExpenses.length} expenses</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 font-medium">Total All Time</div>
            <div className="text-2xl font-bold text-green-900 mt-1">AED {totalAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-green-600 mt-1">{expenses.length} expenses</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Categories Used</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">{new Set(expenses.map((e) => e.category)).size}</div>
            <div className="text-xs text-purple-600 mt-1">distinct categories</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No expenses found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Category</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Description</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Vendor</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(expense.date.seconds * 1000).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">{expense.category}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{expense.vendor || '-'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-right text-gray-900">AED {expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm">
                        <PermissionGate module="accounts" action="delete">
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
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
      </div>
    </ModuleAccessComponent>
  );
}
