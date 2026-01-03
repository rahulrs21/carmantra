"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ModuleAccessComponent, ModuleAccess } from '@/components/PermissionGate';
import { SalaryRecord, Employee } from '@/lib/types';
import { Download, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface SalaryWithEmployee extends SalaryRecord {
  employee?: Employee;
}

export default function ViewSalarySlipPage() {
  const router = useRouter();
  const params = useParams();
  const salaryId = params.id as string;

  const [salary, setSalary] = useState<SalaryWithEmployee | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        const salaryDoc = await getDoc(doc(db, 'salaryRecords', salaryId));
        if (salaryDoc.exists()) {
          const salaryData = { id: salaryDoc.id, ...salaryDoc.data() } as SalaryWithEmployee;
          setSalary(salaryData);

          // Fetch employee details
          const empDoc = await getDoc(doc(db, 'employees', salaryData.employeeId));
          if (empDoc.exists()) {
            setEmployee({ id: empDoc.id, ...empDoc.data() } as Employee);
            setSalary({ ...salaryData, employee: { id: empDoc.id, ...empDoc.data() } as Employee });
          }
        } else {
          toast.error('Salary record not found');
          router.push('/admin/accounts/salary');
        }
      } catch (error) {
        console.error('Error fetching salary:', error);
        toast.error('Failed to load salary record');
      } finally {
        setLoading(false);
      }
    };

    if (salaryId) {
      fetchSalary();
    }
  }, [salaryId, router]);

  const downloadSalarySlip = () => {
    if (!salary) return;

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
      <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-gray-500">Loading salary record...</div>
        </div>
      </ModuleAccessComponent>
    );
  }

  if (!salary) {
    return (
      <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-gray-500">Salary record not found</div>
        </div>
      </ModuleAccessComponent>
    );
  }

  const monthDate = new Date(salary.month);
  const monthYear = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const totalAllowances = salary.allowances ? Object.values(salary.allowances).reduce((a, b) => a + b, 0) : 0;
  const totalDeductions = salary.deductions ? Object.values(salary.deductions).reduce((a, b) => a + b, 0) : 0;

  return (
    <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Salary Slip</h1>
              <p className="text-sm text-gray-500 mt-1">{monthYear}</p>
            </div>
          </div>
          <Button onClick={downloadSalarySlip} className="bg-indigo-600 hover:bg-indigo-700">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-8 space-y-8">
          {/* Employee Information */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4 text-blue-900">Employee Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-lg font-semibold">{employee?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Employee ID</p>
                <p className="text-lg font-semibold">{employee?.id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Designation</p>
                <p className="text-lg font-semibold">{employee?.position || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Salary Month</p>
                <p className="text-lg font-semibold">{monthYear}</p>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4 text-blue-900">Earnings</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-700">Base Salary</span>
                <span className="font-semibold">AED {salary.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {salary.allowances && Object.entries(salary.allowances).map(([key, value]) => (
                value > 0 && (
                  <div key={key} className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">{key} Allowance</span>
                    <span className="font-semibold">AED {(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )
              ))}
              <div className="flex justify-between items-center py-3 bg-blue-50 px-4 rounded font-bold text-blue-900">
                <span>Total Earnings</span>
                <span>AED {(salary.baseSalary + totalAllowances).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4 text-blue-900">Deductions</h2>
            <div className="space-y-3">
              {salary.deductions && Object.entries(salary.deductions).length > 0 ? (
                <>
                  {Object.entries(salary.deductions).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-700">{key}</span>
                        <span className="font-semibold">AED {(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )
                  ))}
                  <div className="flex justify-between items-center py-3 bg-red-50 px-4 rounded font-bold text-red-900">
                    <span>Total Deductions</span>
                    <span>AED {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No deductions for this period
                </div>
              )}
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-200">
            <p className="text-sm text-green-700 font-medium mb-2">NET SALARY (Amount to be Paid)</p>
            <p className="text-4xl font-bold text-green-900">AED {salary.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>

          {/* Status */}
          <div className="border-t pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Salary Status</p>
              <div className="mt-2">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  salary.status === 'paid' 
                    ? 'bg-green-100 text-green-800'
                    : salary.status === 'approved'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {salary.status.toUpperCase()}
                </span>
              </div>
            </div>
            {salary.paidDate && (
              <div>
                <p className="text-sm text-gray-600">Paid Date</p>
                <p className="text-lg font-semibold mt-2">
                  {new Date(salary.paidDate?.toDate?.() || salary.paidDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleAccessComponent>
  );
}
