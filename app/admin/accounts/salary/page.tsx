"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, updateDoc, doc, getDocs, onSnapshot, Timestamp, where, orderBy, addDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PermissionGate, ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';
import { SalaryRecord, Employee } from '@/lib/types';
import { Plus, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface StaffMember extends Employee {}

export default function StaffSalaryManagementPage() {
  const router = useRouter();
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedSalaryId, setSelectedSalaryId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewSlipSalary, setViewSlipSalary] = useState<(SalaryRecord & { employee?: Employee }) | null>(null);
  const [viewSlipEmployee, setViewSlipEmployee] = useState<Employee | null>(null);
  const [isViewSlipOpen, setIsViewSlipOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'bank_transfer',
    transactionId: '',
    notes: '',
  });
  const [formData, setFormData] = useState({
    employeeId: '',
    month: new Date().toISOString().slice(0, 7),
    baseSalary: '',
    daAllowance: '',
    hraAllowance: '',
    otherAllowance: '',
    incomeTax: '',
    providentFund: '',
    otherDeduction: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StaffMember[];
      setEmployees(data);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'salaryRecords'), orderBy('month', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SalaryRecord[];
      setSalaries(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const monthSalaries = useMemo(() => {
    return salaries.filter((s) => s.month === selectedMonth);
  }, [salaries, selectedMonth]);

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Unknown';
  };

  const handleViewSlip = async (salary: SalaryRecord) => {
    try {
      const empDoc = await getDoc(doc(db, 'employees', salary.employeeId));
      if (empDoc.exists()) {
        const empData = { id: empDoc.id, ...empDoc.data() } as Employee;
        setViewSlipEmployee(empData);
        setViewSlipSalary({ ...salary, employee: empData });
        setIsViewSlipOpen(true);
      } else {
        toast.error('Employee not found');
      }
    } catch (error) {
      console.error('Error loading employee:', error);
      toast.error('Failed to load employee details');
    }
  };

  const downloadSalarySlip = (salary: SalaryRecord & { employee?: Employee } | null) => {
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
        `Employee Name: ${viewSlipEmployee?.name || 'N/A'}`,
        `Employee ID: ${viewSlipEmployee?.id || 'N/A'}`,
        `Designation: ${viewSlipEmployee?.position || 'N/A'}`,
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

  const calculateNetSalary = () => {
    const base = parseFloat(formData.baseSalary) || 0;
    const da = parseFloat(formData.daAllowance) || 0;
    const hra = parseFloat(formData.hraAllowance) || 0;
    const other = parseFloat(formData.otherAllowance) || 0;
    const tax = parseFloat(formData.incomeTax) || 0;
    const pf = parseFloat(formData.providentFund) || 0;
    const otherDed = parseFloat(formData.otherDeduction) || 0;

    return base + da + hra + other - tax - pf - otherDed;
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.month || !formData.baseSalary) {
      alert('Please fill in required fields');
      return;
    }

    setSubmitting(true);

    try {
      const baseSalary = parseFloat(formData.baseSalary);
      const allowances = {
        DA: parseFloat(formData.daAllowance) || 0,
        HRA: parseFloat(formData.hraAllowance) || 0,
        Other: parseFloat(formData.otherAllowance) || 0,
      };
      const deductions = {
        IncomeTax: parseFloat(formData.incomeTax) || 0,
        PF: parseFloat(formData.providentFund) || 0,
        Other: parseFloat(formData.otherDeduction) || 0,
      };

      const netSalary = calculateNetSalary();

      await addDoc(collection(db, 'salaryRecords'), {
        employeeId: formData.employeeId,
        month: formData.month,
        baseSalary,
        allowances,
        deductions,
        netSalary,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      alert('Salary record created!');
      setIsDialogOpen(false);
      setFormData({
        employeeId: '',
        month: new Date().toISOString().slice(0, 7),
        baseSalary: '',
        daAllowance: '',
        hraAllowance: '',
        otherAllowance: '',
        incomeTax: '',
        providentFund: '',
        otherDeduction: '',
      });
    } catch (error) {
      console.error('Error adding salary:', error);
      alert('Failed to add salary record');
    } finally {
      setSubmitting(false);
    }
  };



  const handleMarkAsPaid = async (salaryId: string) => {
    try {
      await updateDoc(doc(db, 'salaryRecords', salaryId), {
        status: 'paid',
        paidDate: Timestamp.now(),
      });

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

  const totalPayroll = monthSalaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
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
            <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Salary
            </Button>
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
              AED {monthSalaries.filter((s) => s.status !== 'paid').reduce((sum, s) => sum + (s.netSalary || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  {monthSalaries.map((salary) => {
                    const totalAllowances = Object.values(salary.allowances || {}).reduce((a, b) => a + b, 0);
                    const totalDeductions = Object.values(salary.deductions || {}).reduce((a, b) => a + b, 0);
                    return (
                    <tr key={salary.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{getEmployeeName(salary.employeeId)}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">AED {salary.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">AED {totalAllowances.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">AED {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                                if (salary.id) {
                                  setSelectedSalaryId(salary.id);
                                  setShowPaymentForm(true);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Mark Paid
                            </button>
                          </PermissionGate>
                        )}
                        <button
                          onClick={() => handleViewSlip(salary)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          View Slip
                        </button>
                      </td>
                    </tr>
                  );
                  })}
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
                <span className="text-sm text-gray-600">Pending</span>
                <span className="font-semibold">{monthSalaries.filter((s) => s.status === 'pending').length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Average Salary</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Basic Avg</span>
                <span className="font-semibold">AED {(monthSalaries.reduce((sum, s) => sum + s.baseSalary, 0) / monthSalaries.length || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Net Avg</span>
                <span className="font-semibold">AED {(monthSalaries.reduce((sum, s) => sum + (s.netSalary || 0), 0) / monthSalaries.length || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Salary Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Salary Record</DialogTitle>
              <DialogDescription>
                Create a new salary record for an employee
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSalary}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee *</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id!}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="month">Month *</Label>
                    <Input
                      id="month"
                      type="month"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-semibold text-sm">Earnings</h4>
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Base Salary *</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      placeholder="0"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="daAllowance">DA Allowance</Label>
                      <Input
                        id="daAllowance"
                        type="number"
                        placeholder="0"
                        value={formData.daAllowance}
                        onChange={(e) => setFormData({ ...formData, daAllowance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hraAllowance">HRA Allowance</Label>
                      <Input
                        id="hraAllowance"
                        type="number"
                        placeholder="0"
                        value={formData.hraAllowance}
                        onChange={(e) => setFormData({ ...formData, hraAllowance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otherAllowance">Other Allowance</Label>
                      <Input
                        id="otherAllowance"
                        type="number"
                        placeholder="0"
                        value={formData.otherAllowance}
                        onChange={(e) => setFormData({ ...formData, otherAllowance: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-semibold text-sm">Deductions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="incomeTax">Income Tax</Label>
                      <Input
                        id="incomeTax"
                        type="number"
                        placeholder="0"
                        value={formData.incomeTax}
                        onChange={(e) => setFormData({ ...formData, incomeTax: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="providentFund">Provident Fund</Label>
                      <Input
                        id="providentFund"
                        type="number"
                        placeholder="0"
                        value={formData.providentFund}
                        onChange={(e) => setFormData({ ...formData, providentFund: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otherDeduction">Other Deduction</Label>
                      <Input
                        id="otherDeduction"
                        type="number"
                        placeholder="0"
                        value={formData.otherDeduction}
                        onChange={(e) => setFormData({ ...formData, otherDeduction: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 bg-indigo-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Net Salary</p>
                  <p className="text-2xl font-bold text-indigo-600">AED {calculateNetSalary().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Salary Slip Modal */}
        <Dialog open={isViewSlipOpen} onOpenChange={setIsViewSlipOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div>
                <DialogTitle>Salary Slip</DialogTitle>
                {viewSlipSalary && (
                  <DialogDescription>
                    {new Date(viewSlipSalary.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </DialogDescription>
                )}
              </div>
              <Button onClick={() => downloadSalarySlip(viewSlipSalary)} className="bg-indigo-600 hover:bg-indigo-700">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </DialogHeader>

            {viewSlipSalary && (
              <div className="space-y-6 py-4">
                {/* Employee Information */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Employee Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Name</p>
                      <p className="font-semibold">{viewSlipEmployee?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Employee ID</p>
                      <p className="font-semibold">{viewSlipEmployee?.id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Designation</p>
                      <p className="font-semibold">{viewSlipEmployee?.position || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Salary Month</p>
                      <p className="font-semibold">{new Date(viewSlipSalary.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Earnings</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-700">Base Salary</span>
                      <span className="font-semibold">AED {viewSlipSalary.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {viewSlipSalary.allowances && Object.entries(viewSlipSalary.allowances).map(([key, value]) => (
                      value > 0 && (
                        <div key={key} className="flex justify-between py-2 border-b">
                          <span className="text-gray-700">{key} Allowance</span>
                          <span className="font-semibold">AED {(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )
                    ))}
                    <div className="flex justify-between py-2 bg-blue-50 px-2 rounded font-bold text-blue-900">
                      <span>Total Earnings</span>
                      <span>AED {(viewSlipSalary.baseSalary + Object.values(viewSlipSalary.allowances || {}).reduce((a, b) => a + b, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Deductions</h3>
                  <div className="space-y-2 text-sm">
                    {viewSlipSalary.deductions && Object.entries(viewSlipSalary.deductions).length > 0 ? (
                      <>
                        {Object.entries(viewSlipSalary.deductions).map(([key, value]) => (
                          value > 0 && (
                            <div key={key} className="flex justify-between py-2 border-b">
                              <span className="text-gray-700">{key}</span>
                              <span className="font-semibold">AED {(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )
                        ))}
                        <div className="flex justify-between py-2 bg-red-50 px-2 rounded font-bold text-red-900">
                          <span>Total Deductions</span>
                          <span>AED {Object.values(viewSlipSalary.deductions).reduce((a, b) => a + b, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-2 text-gray-500 text-sm">No deductions for this period</div>
                    )}
                  </div>
                </div>

                {/* Net Salary */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
                  <p className="text-sm text-green-700 font-medium mb-1">NET SALARY (Amount to be Paid)</p>
                  <p className="text-3xl font-bold text-green-900">AED {viewSlipSalary.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>

                {/* Status */}
                <div className="border-t pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold inline-block mt-1 ${
                      viewSlipSalary.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : viewSlipSalary.status === 'approved'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {viewSlipSalary.status.toUpperCase()}
                    </span>
                  </div>
                  {viewSlipSalary.paidDate && (
                    <div>
                      <p className="text-sm text-gray-600">Paid Date</p>
                      <p className="font-semibold mt-1">
                        {new Date(viewSlipSalary.paidDate?.toDate?.() || viewSlipSalary.paidDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ModuleAccessComponent>
  );
}
