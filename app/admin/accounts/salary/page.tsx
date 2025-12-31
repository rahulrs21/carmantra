"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, setDoc, doc, getDocs, onSnapshot, Timestamp, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate, ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';

interface StaffSalary {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  workingDays: number;
  status: 'draft' | 'calculated' | 'approved' | 'paid';
  createdAt: { seconds: number };
  paidDate?: { seconds: number };
  notes?: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  basicSalary: number;
  position?: string;
}

export default function StaffSalaryManagementPage() {
  const router = useRouter();
  const [salaries, setSalaries] = useState<StaffSalary[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedSalaryId, setSelectedSalaryId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'bank_transfer',
    transactionId: '',
    notes: '',
  });

  useEffect(() => {
    // Fetch staff members with salary info
    const fetchStaff = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'staff'));
        const staff = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || '',
          email: doc.data().email || '',
          basicSalary: doc.data().basicSalary || 0,
          position: doc.data().position || '',
        }));
        setStaffMembers(staff);
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };

    fetchStaff();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'salaries'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StaffSalary[];
      setSalaries(data.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const monthSalaries = useMemo(() => {
    return salaries.filter((s) => s.month === selectedMonth);
  }, [salaries, selectedMonth]);

  const handleCalculateSalaries = async () => {
    const [year, month] = selectedMonth.split('-');
    const monthDate = new Date(`${year}-${month}-01`);
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

    try {
      for (const staff of staffMembers) {
        // Calculate working days from attendance records
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('staffId', '==', staff.id),
          where('date', '>=', Timestamp.fromDate(monthDate)),
          where('date', '<=', Timestamp.fromDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)))
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);
        const presentDays = attendanceSnapshot.docs.filter((doc) => doc.data().status === 'present').length;
        const halfDays = attendanceSnapshot.docs.filter((doc) => doc.data().status === 'half_day').length;
        const workingDays = presentDays + halfDays * 0.5;

        const basicSalary = staff.basicSalary;
        const allowances = basicSalary * 0.1; // 10% allowance
        const deductions = basicSalary * 0.05; // 5% deduction
        const netSalary = basicSalary + allowances - deductions;

        const docId = `${staff.id}_${selectedMonth}`;

        await setDoc(doc(db, 'salaries', docId), {
          staffId: staff.id,
          staffName: staff.name,
          month: selectedMonth,
          basicSalary,
          allowances,
          deductions,
          netSalary,
          workingDays,
          status: 'calculated',
          createdAt: Timestamp.now(),
        });
      }

      alert('Salaries calculated successfully!');
    } catch (error) {
      console.error('Error calculating salaries:', error);
      alert('Failed to calculate salaries');
    }
  };

  const handleMarkAsPaid = async (salaryId: string) => {
    try {
      await setDoc(
        doc(db, 'salaries', salaryId),
        {
          status: 'paid',
          paidDate: Timestamp.now(),
          paymentMethod: paymentData.paymentMethod,
          transactionId: paymentData.transactionId,
          notes: paymentData.notes,
        },
        { merge: true }
      );

      setShowPaymentForm(false);
      setSelectedSalaryId(null);
      setPaymentData({
        paymentMethod: 'bank_transfer',
        transactionId: '',
        notes: '',
      });
      alert('Salary marked as paid!');
    } catch (error) {
      console.error('Error marking salary as paid:', error);
      alert('Failed to mark salary as paid');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'calculated':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPayroll = monthSalaries.reduce((sum, s) => sum + s.netSalary, 0);
  const paidCount = monthSalaries.filter((s) => s.status === 'paid').length;

  return (
    <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Salary Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage staff salaries and payroll</p>
          </div>
          <div className="flex gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded px-3 py-2 text-sm h-10 dark:bg-gray-800"
            />
            <PermissionGate module="accounts" action="create">
              <Button onClick={handleCalculateSalaries}>📊 Calculate Salaries</Button>
            </PermissionGate>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Staff</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{monthSalaries.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 font-medium">Total Payroll</div>
            <div className="text-2xl font-bold text-green-900 mt-1">AED {totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Paid</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">{paidCount} / {monthSalaries.length}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="text-sm text-orange-600 font-medium">Pending Payment</div>
            <div className="text-2xl font-bold text-orange-900 mt-1">
              AED {monthSalaries.filter((s) => s.status !== 'paid').reduce((sum, s) => sum + s.netSalary, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Payment Form Modal */}
        {showPaymentForm && selectedSalaryId && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4 border border-blue-200">
            <h2 className="text-lg font-semibold">Record Salary Payment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                className="border rounded px-3 py-2 h-10 dark:bg-gray-800"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
              </select>

              <Input
                type="text"
                placeholder="Transaction ID / Check #"
                value={paymentData.transactionId}
                onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                className="h-10"
              />

              <Input
                type="text"
                placeholder="Notes (Optional)"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className="col-span-1 md:col-span-2 h-10"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleMarkAsPaid(selectedSalaryId)} className="flex-1">
                ✓ Mark as Paid
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentForm(false);
                  setSelectedSalaryId(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Salary Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6">Loading...</div>
          ) : monthSalaries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No salary records for {selectedMonth}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Staff Name</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">Basic</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">Allowances</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">Deductions</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">Net Salary</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monthSalaries.map((salary) => (
                    <tr key={salary.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{salary.staffName}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">AED {salary.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">AED {salary.allowances.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">AED {salary.deductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm font-bold text-right text-gray-900">AED {salary.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(salary.status)}`}>
                          {salary.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        {salary.status !== 'paid' && (
                          <PermissionGate module="accounts" action="edit">
                            <button
                              onClick={() => {
                                setSelectedSalaryId(salary.id);
                                setShowPaymentForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Mark Paid
                            </button>
                          </PermissionGate>
                        )}
                        <button
                          onClick={() => router.push(`/admin/accounts/salary/${salary.id}`)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          View Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Salary Breakdown by Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Status Distribution</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Paid</span>
                <span className="font-semibold">{monthSalaries.filter((s) => s.status === 'paid').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Approved</span>
                <span className="font-semibold">{monthSalaries.filter((s) => s.status === 'approved').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Calculated</span>
                <span className="font-semibold">{monthSalaries.filter((s) => s.status === 'calculated').length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Average Salary</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Basic Avg</span>
                <span className="font-semibold">AED {(monthSalaries.reduce((sum, s) => sum + s.basicSalary, 0) / monthSalaries.length || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Net Avg</span>
                <span className="font-semibold">AED {(monthSalaries.reduce((sum, s) => sum + s.netSalary, 0) / monthSalaries.length || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleAccessComponent>
  );
}
