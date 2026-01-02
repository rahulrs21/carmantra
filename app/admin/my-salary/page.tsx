"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useUser } from '@/lib/userContext';
import { SalaryRecord, Employee } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AlertCircle, Download } from 'lucide-react';
import { ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';

export default function MySalaryPage() {
  const { role, user, displayName } = useUser();
  const uid = user?.uid;
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // Get employee ID from current user
  useEffect(() => {
    if (!uid) return;

    const fetchSalaryData = async () => {
      try {
        // Get employee data from current user
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.employeeId) {
            // Fetch employee details
            const empDoc = await getDoc(doc(db, 'employees', userData.employeeId));
            if (empDoc.exists()) {
              const empData = empDoc.data() as Employee;
              empData.id = empDoc.id;
              setEmployee(empData);

              // Fetch salary records for this employee
              const salaryQuery = query(
                collection(db, 'salaryRecords'),
                where('employeeId', '==', userData.employeeId)
              );

              const unsubscribe = onSnapshot(salaryQuery, (snapshot) => {
                const salaryData = snapshot.docs.map(doc => ({
                  ...doc.data() as SalaryRecord,
                  id: doc.id,
                }));
                setSalaries(salaryData.sort((a, b) => {
                  return b.month.localeCompare(a.month);
                }));
                setLoading(false);
              });

              return unsubscribe;
            }
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching salary data:', error);
        toast.error('Failed to load salary data');
        setLoading(false);
      }
    };

    fetchSalaryData();
  }, [uid]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 border-green-200';
      case 'approved':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const downloadSalarySlip = (salary: SalaryRecord) => {
    // Create a simple text-based salary slip
    const content = `
SALARY SLIP

Employee: ${employee?.name}
Employee ID: ${employee?.id}
Month: ${salary.month}

EARNINGS:
Base Salary: ${salary.baseSalary.toFixed(2)}
${salary.allowances ? Object.entries(salary.allowances).map(([key, value]) => `${key}: ${(value as number).toFixed(2)}`).join('\n') : ''}

DEDUCTIONS:
${salary.deductions ? Object.entries(salary.deductions).map(([key, value]) => `${key}: ${(value as number).toFixed(2)}`).join('\n') : 'None'}

NET SALARY: ${salary.netSalary.toFixed(2)}

Status: ${salary.status.toUpperCase()}
${salary.paidDate ? `Paid Date: ${new Date(salary.paidDate).toLocaleDateString()}` : ''}

Remarks: ${salary.remarks || 'N/A'}
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `salary-slip-${salary.month}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading your salary records...
      </div>
    );
  }

  return (
    <ModuleAccessComponent module={ModuleAccess.SALARY}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Salary</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View your salary records and download salary slips</p>
        </div>

        {/* Salary Records */}
        <div className="space-y-4">
          {salaries.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No salary records found. Your administrator will add salary information here.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {salaries.map((salary) => {
                const paidDate = salary.paidDate?.toDate?.() || salary.paidDate ? new Date(salary.paidDate) : null;
                const totalAllowances = salary.allowances
                  ? Object.values(salary.allowances).reduce((sum, val) => sum + (val as number), 0)
                  : 0;
                const totalDeductions = salary.deductions
                  ? Object.values(salary.deductions).reduce((sum, val) => sum + (val as number), 0)
                  : 0;

                return (
                  <div
                    key={salary.id}
                    className={`p-4 rounded-lg border ${getStatusColor(salary.status)} dark:bg-gray-800 dark:border-gray-700`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(salary.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(salary.status)}`}>
                        {salary.status.charAt(0).toUpperCase() + salary.status.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Base Salary:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ₹{salary.baseSalary.toFixed(2)}
                        </span>
                      </div>

                      {totalAllowances > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Allowances:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            +₹{totalAllowances.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {totalDeductions > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Deductions:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -₹{totalDeductions.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white">Net Salary:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          ₹{salary.netSalary.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {paidDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Paid: {paidDate.toLocaleDateString()}
                      </p>
                    )}

                    {salary.remarks && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 italic">
                        {salary.remarks}
                      </p>
                    )}

                    <button
                      onClick={() => downloadSalarySlip(salary)}
                      className="w-full mt-3 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Slip
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {salaries.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Salary records are processed by your administrator. If you have questions about your salary, please contact your manager or admin.
            </p>
          </div>
        )}
      </div>
    </ModuleAccessComponent>
  );
}
