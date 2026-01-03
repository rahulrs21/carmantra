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
import jsPDF from 'jspdf';

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
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Helper function to draw a table
      const drawTable = (
        startY: number,
        rows: Array<[string, string]>,
        headerBgColor: [number, number, number],
        headerTextColor: [number, number, number]
      ) => {
        let y = startY;
        const colWidth = contentWidth / 2;
        const rowHeight = 8;

        // Draw header
        doc.setFillColor(...headerBgColor);
        doc.setTextColor(...headerTextColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.rect(margin, y, colWidth, rowHeight, 'F');
        doc.rect(margin + colWidth, y, colWidth, rowHeight, 'F');
        doc.text('Description', margin + 2, y + 5);
        doc.text('Amount (AED)', margin + colWidth + contentWidth - 40, y + 5);

        y += rowHeight;

        // Draw rows
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        rows.forEach((row, index) => {
          const isLast = index === rows.length - 1;
          
          if (isLast) {
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y, contentWidth, rowHeight, 'F');
          }

          doc.setDrawColor(200, 200, 200);
          doc.line(margin, y, pageWidth - margin, y);

          doc.text(row[0], margin + 2, y + 5);
          doc.text(row[1], pageWidth - margin - 10, y + 5, { align: 'right' });

          y += rowHeight;
        });

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);

        return y;
      };

      // Company Header
      doc.setFontSize(18);
      doc.setTextColor(25, 25, 112); // Midnight blue
      doc.text('CARMANTRA', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Professional Salary Slip', pageWidth / 2, yPosition, { align: 'center' });

      // Divider line
      yPosition += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);

      // Employee Information Section
      yPosition += 10;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('EMPLOYEE INFORMATION', margin, yPosition);

      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const empInfoLeft = [
        `Employee Name: ${employee?.name || 'N/A'}`,
        `Employee ID: ${employee?.id || 'N/A'}`,
        `Designation: ${employee?.position || 'N/A'}`,
      ];

      const monthDate = new Date(salary.month);
      const monthYear = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const empInfoRight = [
        `Salary Month: ${monthYear}`,
        `Salary Status: ${salary.status.charAt(0).toUpperCase() + salary.status.slice(1)}`,
        `Generated Date: ${new Date().toLocaleDateString()}`,
      ];

      empInfoLeft.forEach((text, index) => {
        doc.text(text, margin, yPosition + index * 5);
      });

      empInfoRight.forEach((text, index) => {
        doc.text(text, pageWidth / 2, yPosition + index * 5);
      });

      yPosition += 20;

      // Earnings Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(25, 25, 112);
      doc.text('EARNINGS', margin, yPosition);
      yPosition += 7;

      const earningsData: Array<[string, string]> = [
        ['Base Salary', salary.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ];

      if (salary.allowances && Object.keys(salary.allowances).length > 0) {
        Object.entries(salary.allowances).forEach(([key, value]) => {
          if (value > 0) {
            earningsData.push([
              `${key} Allowance`,
              (value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ]);
          }
        });
      }

      const totalEarnings = salary.baseSalary + (salary.allowances 
        ? Object.values(salary.allowances).reduce((sum, val) => sum + (val as number), 0)
        : 0);

      earningsData.push(['TOTAL EARNINGS', totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]);

      yPosition = drawTable(yPosition, earningsData, [25, 25, 112], [255, 255, 255]);

      yPosition += 10;

      // Deductions Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(25, 25, 112);
      doc.text('DEDUCTIONS', margin, yPosition);
      yPosition += 7;

      const deductionsData: Array<[string, string]> = [];

      if (salary.deductions && Object.keys(salary.deductions).length > 0) {
        Object.entries(salary.deductions).forEach(([key, value]) => {
          if (value > 0) {
            deductionsData.push([
              key,
              (value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ]);
          }
        });
      }

      const totalDeductions = salary.deductions
        ? Object.values(salary.deductions).reduce((sum, val) => sum + (val as number), 0)
        : 0;

      if (deductionsData.length > 0 || totalDeductions > 0) {
        deductionsData.push(['TOTAL DEDUCTIONS', totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]);
      } else {
        deductionsData.push(['No Deductions', '0.00']);
      }

      yPosition = drawTable(yPosition, deductionsData, [220, 53, 69], [255, 255, 255]);

      yPosition += 15;

      // Net Salary Section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(25, 25, 112);
      doc.text('NET SALARY', margin, yPosition);

      doc.setFontSize(16);
      doc.setTextColor(34, 139, 34); // Forest green
      doc.text(
        `AED ${salary.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pageWidth - margin,
        yPosition,
        { align: 'right' }
      );

      // Footer
      yPosition = pageHeight - 25;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);

      yPosition += 5;
      if (salary.paidDate) {
        const paidDate = salary.paidDate?.toDate?.() || salary.paidDate ? new Date(salary.paidDate) : null;
        doc.text(`Paid Date: ${paidDate?.toLocaleDateString()}`, margin, yPosition);
      }

      doc.text('This is an electronically generated document.', pageWidth / 2, yPosition, { align: 'center' });
      doc.text(`Page 1 of 1`, pageWidth - margin, yPosition, { align: 'right' });

      yPosition += 5;
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text('For any queries regarding your salary, please contact your HR department.', pageWidth / 2, yPosition, { align: 'center' });

      // Save PDF
      doc.save(`salary-slip-${salary.month}.pdf`);
      toast.success('Salary slip downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate salary slip PDF');
    }
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
                          AED {salary.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {totalAllowances > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Allowances:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            +AED {totalAllowances.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {totalDeductions > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Deductions:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -AED {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white">Net Salary:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          AED {salary.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
