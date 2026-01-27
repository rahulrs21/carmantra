"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, Timestamp, getDocs, where, deleteDoc } from 'firebase/firestore';
import { SalaryRecord, Employee } from '@/lib/types';
import { useUser } from '@/lib/userContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  calculateMonthlyAttendanceSummary,
  calculateSalaryBreakdown,
} from '@/lib/attendanceCalculations';
import { AttendanceSettings, DailyAttendance } from '@/lib/attendanceTypes';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { DollarSign, Plus, Download, Eye, Shield, Grid3x3, Table as TableIcon } from 'lucide-react';
import { ModuleAccess, PermissionGate, ModuleAccessComponent } from '@/components/PermissionGate';

export default function SalaryPage() {
  const { role: currentRole } = useUser();
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');

  const [formData, setFormData] = useState({
    employeeId: '',
    month: '',
    baseSalary: '',
    daAllowance: '',
    hraAllowance: '',
    otherAllowance: '',
    incomeTax: '',
    providentFund: '',
    otherDeduction: '',
  });

  const [autoFetching, setAutoFetching] = useState(false);

  const [salarySummary, setSalarySummary] = useState<any>(null);
  const [includeHolidays, setIncludeHolidays] = useState(true);
  const [otherAllowanceReason, setOtherAllowanceReason] = useState('');
  const [otherAllowanceAmount, setOtherAllowanceAmount] = useState(0);
  const [otherDeductionsReason, setOtherDeductionsReason] = useState('');
  const [otherDeductionsAmount, setOtherDeductionsAmount] = useState(0);

  // State for attendance data in view details
  const [viewAttendanceSummary, setViewAttendanceSummary] = useState<any>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const isAuthorized = currentRole === 'admin' || currentRole === 'manager';

  // Fetch employees
  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];
      setEmployees(data);
    });

    return () => unsubscribe();
  }, []);

  // Fetch salaries
  useEffect(() => {
    const q = query(collection(db, 'salaryRecords'), orderBy('month', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SalaryRecord[];
      setSalaries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch attendance settings
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>({
    workingDays: [1, 2, 3, 4, 5],
    holidays: [],
    weekendDays: ['Saturday', 'Sunday'],
  });

  useEffect(() => {
    const q = query(collection(db, 'attendanceSettings'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.docs.length > 0) {
          const settingsDoc = snapshot.docs[0].data() as AttendanceSettings;
          setAttendanceSettings(settingsDoc);
        }
      },
      (error) => {
        console.error('Error listening to attendance settings:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch attendance data when view dialog opens
  useEffect(() => {
    if (isViewDialogOpen && selectedSalary) {
      fetchAttendanceForView(selectedSalary.employeeId, selectedSalary.month);
    } else {
      setViewAttendanceSummary(null);
    }
  }, [isViewDialogOpen, selectedSalary]);

  // Auto-fetch salary data when employee and month are selected
  useEffect(() => {
    const autoFetchSalaryData = async () => {
      if (!formData.employeeId || !formData.month || selectedSalary) return;

      setAutoFetching(true);
      setSalarySummary(null);
      try {
        // Check if salary record exists for this month
        const q = query(
          collection(db, 'salaryRecords'),
          where('employeeId', '==', formData.employeeId),
          where('month', '==', formData.month)
        );
        const snapshot = await getDocs(q);

        if (snapshot.docs.length > 0) {
          // Use existing salary record
          const salaryRecord = snapshot.docs[0].data() as SalaryRecord;
          setSalarySummary(null);
          setFormData({
            employeeId: salaryRecord.employeeId,
            month: salaryRecord.month,
            baseSalary: salaryRecord.baseSalary.toString(),
            daAllowance: (salaryRecord.allowances?.DA || '').toString(),
            hraAllowance: (salaryRecord.allowances?.HRA || '').toString(),
            otherAllowance: (salaryRecord.allowances?.Other || '').toString(),
            incomeTax: (salaryRecord.deductions?.IncomeTax || '').toString(),
            providentFund: (salaryRecord.deductions?.PF || '').toString(),
            otherDeduction: (salaryRecord.deductions?.Other || '').toString(),
          });
          toast.success('Salary data fetched from existing record');
        } else {
          // Fetch employee's base salary and calculate from attendance using the same logic as attendance page
          const employee = employees.find(e => e.id === formData.employeeId);
          if (employee && employee.salary) {
            const baseSalary = employee.salary;

            // Get attendance data for the month
            const year = parseInt(formData.month.split('-')[0]);
            const month = parseInt(formData.month.split('-')[1]);
            const daysInMonth = new Date(year, month, 0).getDate();

            const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

            // Fetch all attendance records for this employee in this month
            const attQuery = query(
              collection(db, 'dailyAttendance'),
              where('employeeId', '==', formData.employeeId),
              where('date', '>=', startDateStr),
              where('date', '<=', endDateStr)
            );

            let monthRecords: DailyAttendance[] = [];

            try {
              const attSnapshot = await getDocs(attQuery);
              monthRecords = attSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
              } as DailyAttendance));
            } catch (error: any) {
              // If composite index is not available, query by employeeId only and filter client-side
              if (error.code === 'failed-precondition') {
                console.log('Using client-side filtering due to index requirement');
                const attQuery2 = query(
                  collection(db, 'dailyAttendance'),
                  where('employeeId', '==', formData.employeeId)
                );
                const attSnapshot = await getDocs(attQuery2);
                monthRecords = attSnapshot.docs
                  .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                  } as DailyAttendance))
                  .filter(doc => {
                    const docDate = typeof doc.date === 'string' ? doc.date : (doc.date as any)?.toDate?.()?.toISOString().split('T')[0] || '';
                    return docDate >= startDateStr && docDate <= endDateStr;
                  });
              } else {
                throw error;
              }
            }

            // Use the same calculation function as attendance page
            const holidayDates = (attendanceSettings.holidays || []).map(h => {
              const [y, m, d] = h.date.split('-').map(Number);
              return new Date(y, m - 1, d);
            });

            const summary = calculateMonthlyAttendanceSummary(
              formData.employeeId,
              year,
              month,
              monthRecords,
              holidayDates,
              'system',
              attendanceSettings.workingDays || [1, 2, 3, 4, 5]
            );

            // Use calculateSalaryBreakdown exactly like attendance page does
            const salaryBreakdown = calculateSalaryBreakdown(
              formData.employeeId,
              year,
              month,
              baseSalary,
              summary,
              'system'
            );

            // Calculate attendance rate from summary
            const attendanceRate = ((summary.totalPresentDays + summary.totalPaidLeaveDays) / salaryBreakdown.workingDaysInMonth) * 100;

            // Calculate holiday breakdown for the month
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const weekendDaysList = attendanceSettings.weekendDays || ['Saturday', 'Sunday'];
            let totalHolidays = 0;

            // Count weekend days
            for (let day = 1; day <= daysInMonth; day++) {
              const date = new Date(year, month - 1, day);
              const dayName = dayNames[date.getDay()];
              if (weekendDaysList.includes(dayName)) {
                totalHolidays++;
              }
            }

            // Count custom holidays
            const allHolidaysInMonth = (attendanceSettings.holidays || []).filter(h => {
              const [y, m] = h.date.split('-').map(Number);
              return y === year && m === month;
            });
            totalHolidays += allHolidaysInMonth.length;

            setSalarySummary({
              presentDays: summary.totalPresentDays,
              absentPaidDays: summary.totalAbsentPaidDays || 0,
              absentUnpaidDays: summary.totalAbsentUnpaidDays || 0,
              paidLeaveDays: summary.totalPaidLeaveDays,
              unpaidLeaveDays: summary.totalUnpaidLeaveDays,
              notMarkedDays: summary.totalNotMarkedDays,
              workingDays: salaryBreakdown.workingDaysInMonth,
              basePayableDays: salaryBreakdown.totalPayableDays,
              payableDays: salaryBreakdown.totalPayableDays.toFixed(1),
              perDaySalary: salaryBreakdown.perDaySalary.toFixed(2),
              attendanceRate: attendanceRate.toFixed(2),
              baseSalary: baseSalary.toFixed(2),
              grossSalary: salaryBreakdown.grossSalary.toFixed(2),
              totalDeductions: salaryBreakdown.totalDeductions.toFixed(2),
              deductionReason: `Absent Unpaid: ${summary.totalAbsentUnpaidDays} day${summary.totalAbsentUnpaidDays !== 1 ? 's' : ''}`,
              netSalary: salaryBreakdown.netSalary.toFixed(2),
              totalHolidays: totalHolidays,
            });

            const deductionFromAbsent = salaryBreakdown.totalDeductions;

            setFormData(prev => ({
              ...prev,
              baseSalary: baseSalary.toString(),
              incomeTax: '0',
              providentFund: '0',
              otherDeduction: deductionFromAbsent.toFixed(2),
              daAllowance: '0',
              hraAllowance: '0',
              otherAllowance: '0',
            }));

            toast.success('Salary data auto-fetched from employee record and attendance');
          }
        }
      } catch (error) {
        console.error('Error auto-fetching salary data:', error);
        toast.error('Failed to auto-fetch salary data');
      } finally {
        setAutoFetching(false);
      }
    };

    const timeoutId = setTimeout(autoFetchSalaryData, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [formData.employeeId, formData.month, selectedSalary, employees]);

  const handleOpenDialog = (salary?: SalaryRecord) => {
    if (salary) {
      setSelectedSalary(salary);
      setFormData({
        employeeId: salary.employeeId,
        month: salary.month,
        baseSalary: salary.baseSalary.toString(),
        daAllowance: (salary.allowances?.DA || '').toString(),
        hraAllowance: (salary.allowances?.HRA || '').toString(),
        otherAllowance: (salary.allowances?.Other || '').toString(),
        incomeTax: (salary.deductions?.IncomeTax || '').toString(),
        providentFund: (salary.deductions?.PF || '').toString(),
        otherDeduction: (salary.deductions?.Other || '').toString(),
      });
      // Load additional items
      setOtherAllowanceReason(salary.otherAllowanceReason || '');
      setOtherAllowanceAmount(salary.otherAllowanceAmount || 0);
      setOtherDeductionsReason(salary.otherDeductionsReason || '');
      setOtherDeductionsAmount(salary.otherDeductionsAmount || 0);
      // Set include holidays state
      setIncludeHolidays(salary.includeHolidays || false);
      
      // Load salary summary data for edit mode
      setSalarySummary({
        presentDays: salary.presentDays || 0,
        absentPaidDays: salary.absentPaidDays || 0,
        absentUnpaidDays: salary.absentUnpaidDays || 0,
        paidLeaveDays: salary.paidLeaveDays || 0,
        unpaidLeaveDays: salary.unpaidLeaveDays || 0,
        notMarkedDays: salary.notMarkedDays || 0,
        workingDays: salary.workingDays || 0,
        basePayableDays: salary.basePayableDays || 0,
        payableDays: salary.payableDays || '0',
        perDaySalary: salary.perDaySalary || '0',
        attendanceRate: salary.attendanceRate || '0',
        baseSalary: salary.baseSalary.toString(),
        grossSalary: (salary.baseSalary + Object.values(salary.allowances || {}).reduce((a: number, b: number) => a + b, 0)).toFixed(2),
        totalDeductions: (Object.values(salary.deductions || {}).reduce((a: number, b: number) => a + b, 0)).toFixed(2),
        netSalary: salary.netSalary?.toString() || '0',
        totalHolidays: salary.totalHolidays || 0,
      });
    } else {
      setSelectedSalary(null);
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
      // Reset additional items
      setOtherAllowanceReason('');
      setOtherAllowanceAmount(0);
      setOtherDeductionsReason('');
      setOtherDeductionsAmount(0);
      setIncludeHolidays(true);
      setSalarySummary(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSalary(null);
    setSalarySummary(null);
    setOtherAllowanceReason('');
    setOtherAllowanceAmount(0);
    setOtherDeductionsReason('');
    setOtherDeductionsAmount(0);
    setIncludeHolidays(true);
  };

  const fetchAttendanceForView = async (employeeId: string, month: string) => {
    try {
      setLoadingAttendance(true);
      // Fetch all attendance records for the employee (avoids need for composite index)
      const q = query(
        collection(db, 'dailyAttendance'),
        where('employeeId', '==', employeeId)
      );

      const snapshot = await getDocs(q);
      const allRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as DailyAttendance[];

      // Filter records by month client-side
      const attendanceRecords = allRecords.filter(record => {
        if (!record.date) return false;
        // Convert Timestamp to string if needed
        const dateStr = typeof record.date === 'string' ? record.date : (record.date as any)?.toDate?.().toISOString().slice(0, 7) || '';
        return dateStr.startsWith(month);
      });

      // Calculate attendance summary
      if (attendanceRecords.length > 0 && selectedSalary) {
        const [year, monthStr] = month.split('-');
        const holidays = (attendanceSettings.holidays || []).map(h => new Date(h.date));

        // Calculate monthly attendance summary
        const attendanceSummary = calculateMonthlyAttendanceSummary(
          employeeId,
          parseInt(year),
          parseInt(monthStr),
          attendanceRecords,
          holidays,
          'system',
          attendanceSettings.workingDays || [1, 2, 3, 4, 5]
        );

        // Calculate salary breakdown using stored base salary from selected record
        const salaryBreakdown = calculateSalaryBreakdown(
          employeeId,
          parseInt(year),
          parseInt(monthStr),
          selectedSalary.baseSalary || 0,
          attendanceSummary,
          'system'
        );

        // Calculate attendance rate
        const attendanceRate = ((attendanceSummary.totalPresentDays + attendanceSummary.totalPaidLeaveDays) / salaryBreakdown.workingDaysInMonth) * 100;

        // Create the summary object matching the structure from Add form
        const summaryData = {
          presentDays: attendanceSummary.totalPresentDays,
          absentPaidDays: attendanceSummary.totalAbsentPaidDays || 0,
          absentUnpaidDays: attendanceSummary.totalAbsentUnpaidDays || 0,
          paidLeaveDays: attendanceSummary.totalPaidLeaveDays,
          unpaidLeaveDays: attendanceSummary.totalUnpaidLeaveDays,
          notMarkedDays: attendanceSummary.totalNotMarkedDays,
          workingDays: salaryBreakdown.workingDaysInMonth,
          basePayableDays: salaryBreakdown.totalPayableDays,
          payableDays: salaryBreakdown.totalPayableDays.toFixed(1),
          perDaySalary: salaryBreakdown.perDaySalary.toFixed(2),
          attendanceRate: attendanceRate.toFixed(2),
          grossSalary: salaryBreakdown.grossSalary.toFixed(2),
          totalDeductions: salaryBreakdown.totalDeductions.toFixed(2),
          netSalary: salaryBreakdown.netSalary.toFixed(2),
        };

        setViewAttendanceSummary(summaryData);
      } else {
        setViewAttendanceSummary(null);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setViewAttendanceSummary(null);
    } finally {
      setLoadingAttendance(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthorized) {
      toast.error('You do not have permission to manage salaries');
      return;
    }

    if (!formData.employeeId || !formData.month || !formData.baseSalary) {
      toast.error('Please fill in required fields');
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

      const salaryData = {
        employeeId: formData.employeeId,
        month: formData.month,
        baseSalary,
        allowances,
        deductions,
        netSalary,
        otherAllowanceReason,
        otherAllowanceAmount,
        otherDeductionsReason,
        otherDeductionsAmount,
        payableDays: salarySummary?.payableDays || '',
        perDaySalary: salarySummary?.perDaySalary || '',
        workingDays: salarySummary?.workingDays || '',
        attendanceRate: salarySummary?.attendanceRate || '',
        includeHolidays: includeHolidays,
        totalHolidays: salarySummary?.totalHolidays || 0,
        basePayableDays: salarySummary?.basePayableDays || 0,
        // Save attendance summary for edit mode
        presentDays: salarySummary?.presentDays || 0,
        absentPaidDays: salarySummary?.absentPaidDays || 0,
        absentUnpaidDays: salarySummary?.absentUnpaidDays || 0,
        paidLeaveDays: salarySummary?.paidLeaveDays || 0,
        unpaidLeaveDays: salarySummary?.unpaidLeaveDays || 0,
        notMarkedDays: salarySummary?.notMarkedDays || 0,
        status: selectedSalary?.status || 'pending' as const,
        updatedAt: Timestamp.now(),
      };

      if (selectedSalary && selectedSalary.id) {
        await updateDoc(doc(db, 'salaryRecords', selectedSalary.id), salaryData);
        toast.success('Salary updated successfully');
      } else {
        await addDoc(collection(db, 'salaryRecords'), {
          ...salaryData,
          status: 'pending',
          createdAt: Timestamp.now(),
        });
        toast.success('Salary record created');
      }

      // Reset dialog and state properly
      handleCloseDialog();
      
      // Force refresh of data - the useEffect with onSnapshot will handle this
      // but we need to ensure the state is cleared
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving salary:', error);
      toast.error('Failed to save salary record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (salaryId: string) => {
    if (!isAuthorized) {
      toast.error('You do not have permission to approve salaries');
      return;
    }

    try {
      await updateDoc(doc(db, 'salaryRecords', salaryId), {
        status: 'approved',
      });
      toast.success('Salary approved');
    } catch (error: any) {
      console.error('Error approving salary:', error);
      toast.error('Failed to approve salary');
    }
  };

  const handleMarkPaid = async (salaryId: string) => {
    if (!isAuthorized) {
      toast.error('You do not have permission to mark salaries as paid');
      return;
    }

    try {
      await updateDoc(doc(db, 'salaryRecords', salaryId), {
        status: 'paid',
        paidDate: Timestamp.now(),
      });
      toast.success('Salary marked as paid');
    } catch (error: any) {
      console.error('Error marking salary as paid:', error);
      toast.error('Failed to mark salary as paid');
    }
  };

  const handleDelete = async (salaryId: string) => {
    if (!isAuthorized) {
      toast.error('You do not have permission to delete salaries');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this salary record? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'salaryRecords', salaryId));
      toast.success('Salary record deleted successfully');
    } catch (error: any) {
      console.error('Error deleting salary:', error);
      toast.error('Failed to delete salary record');
    }
  };

  const filteredSalaries = salaries.filter((salary) => {
    if (filterMonth && salary.month !== filterMonth) return false;
    if (filterEmployee !== 'all' && salary.employeeId !== filterEmployee) return false;
    if (filterStatus !== 'all' && salary.status !== filterStatus) return false;
    return true;
  });

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to access salary management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ModuleAccessComponent module={ModuleAccess.EMPLOYEE_SALARY}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              <DollarSign className="w-8 h-8" />
              Salary Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage employee salaries and slips</p>
          </div>
          <PermissionGate module="salary" action="create">
            <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Salary
            </Button>
          </PermissionGate>
        </header>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Month</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Employee</Label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id!}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 items-center justify-end">
          <Button
            size="sm"
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
          >
            <TableIcon className="w-4 h-4 mr-2" />
            Table View
          </Button>
          <Button
            size="sm"
            onClick={() => setViewMode('card')}
            className={viewMode === 'card' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            Card View
          </Button>
        </div>

        {/* Salary Records - Table View */}
        {viewMode === 'table' && (
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                Loading salary records...
              </div>
            ) : filteredSalaries.length === 0 ? (
              <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                No salary records found
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-900">Employee</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-900">Month</th>
                      <th className="px-4 sm:px-6 py-4 text-right text-sm font-semibold text-gray-900">Gross Salary</th>
                      <th className="hidden sm:table-cell px-4 sm:px-6 py-4 text-right text-sm font-semibold text-gray-900">Allowances</th>
                      <th className="hidden md:table-cell px-4 sm:px-6 py-4 text-right text-sm font-semibold text-gray-900">Deductions</th>
                      <th className="px-4 sm:px-6 py-4 text-right text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700">Final Net Salary</th>
                      <th className="px-4 sm:px-6 py-4 text-center text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSalaries.map((salary, index) => (
                      <tr
                        key={salary.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                      >
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                              {getEmployeeName(salary.employeeId).charAt(0)}
                            </div>
                            <span className="hidden sm:inline">{getEmployeeName(salary.employeeId)}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {salary.month}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                          AED {Number(salary.baseSalary).toFixed(2)}
                        </td>
                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm font-medium text-green-600 text-right whitespace-nowrap">
                          AED {(Number(Object.values(salary.allowances || {}).reduce((a, b) => a + b, 0)) + Number(salary.otherAllowanceAmount || 0)).toFixed(2)}
                        </td>
                        <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-sm font-medium text-red-600 text-right whitespace-nowrap">
                          AED {(Number(Object.values(salary.deductions || {}).reduce((a, b) => a + b, 0)) + Number(salary.otherDeductionsAmount || 0)).toFixed(2)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-bold text-white text-right whitespace-nowrap bg-gradient-to-r from-green-600 to-green-700">
                          AED {(
                            (salary.includeHolidays && salary.totalHolidays && salary.totalHolidays > 0 && Number(salary.payableDays || 0) >= 7 ?
                              (Number(salary.basePayableDays || 0) + Number(salary.totalHolidays || 0)) * Number(salary.perDaySalary || 0) :
                              Number(salary.basePayableDays || 0) * Number(salary.perDaySalary || 0)) -
                            (Number(Object.values(salary.deductions || {}).reduce((a, b) => a + b, 0)) + Number(salary.otherDeductionsAmount || 0)) +
                            Number(salary.otherAllowanceAmount || 0)
                          ).toFixed(2)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                          <Badge className={getStatusColor(salary.status)}>
                            {salary.status}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="View Details"
                              onClick={() => {
                                setSelectedSalary(salary);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <PermissionGate module="salary" action="edit">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Edit"
                                onClick={() => handleOpenDialog(salary)}
                              >
                                ✏️
                              </Button>
                            </PermissionGate>
                            {salary.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                title="Approve"
                                onClick={() => handleApprove(salary.id!)}
                              >
                                ✓
                              </Button>
                            )}
                            {salary.status === 'approved' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                title="Mark as Paid"
                                onClick={() => handleMarkPaid(salary.id!)}
                              >
                                💰
                              </Button>
                            )}
                            <PermissionGate module="salary" action="edit">
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                title="Delete"
                                onClick={() => handleDelete(salary.id!)}
                              >
                                🗑️
                              </Button>
                            </PermissionGate>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Salary Records - Card View */}
        {viewMode === 'card' && (
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                Loading salary records...
              </div>
            ) : filteredSalaries.length === 0 ? (
              <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                No salary records found
              </div>
            ) : (
              filteredSalaries.map((salary) => (
                <div key={salary.id} className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-shadow border border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                        {getEmployeeName(salary.employeeId).charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{getEmployeeName(salary.employeeId)}</h3>
                        <p className="text-sm text-gray-600">{salary.month}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(salary.status)}>
                      {salary.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-600 text-xs font-medium">Base Salary</p>
                      <p className="font-semibold text-lg text-gray-900 mt-1">AED {Number(salary.baseSalary).toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-gray-600 text-xs font-medium">Allowances</p>
                      <p className="font-semibold text-lg text-green-600 mt-1">
                        AED {(Number(Object.values(salary.allowances || {}).reduce((a, b) => a + b, 0)) + Number(salary.otherAllowanceAmount || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-gray-600 text-xs font-medium">Deductions</p>
                      <p className="font-semibold text-lg text-red-600 mt-1">
                        AED {(Number(Object.values(salary.deductions || {}).reduce((a, b) => a + b, 0)) + Number(salary.otherDeductionsAmount || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-600 to-green-700 p-3 rounded-lg text-white border border-green-700">
                      <p className="text-white text-xs font-medium opacity-90">FINAL NET SALARY</p>
                      <p className="font-bold text-lg text-white mt-1">AED {(
                        (salary.includeHolidays && salary.totalHolidays && salary.totalHolidays > 0 && Number(salary.payableDays || 0) >= 7 ?
                          (Number(salary.basePayableDays || 0) + Number(salary.totalHolidays || 0)) * Number(salary.perDaySalary || 0) :
                          Number(salary.basePayableDays || 0) * Number(salary.perDaySalary || 0)) -
                        (Number(Object.values(salary.deductions || {}).reduce((a, b) => a + b, 0)) + Number(salary.otherDeductionsAmount || 0)) +
                        Number(salary.otherAllowanceAmount || 0)
                      ).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSalary(salary);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    <PermissionGate module="salary" action="edit">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(salary)}
                      >
                        Edit
                      </Button>
                    </PermissionGate>
                    {salary.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(salary.id!)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Approve
                      </Button>
                    )}
                    {salary.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkPaid(salary.id!)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Mark as Paid
                      </Button>
                    )}
                    <PermissionGate module="salary" action="edit">
                      <Button
                        size="sm"
                        onClick={() => handleDelete(salary.id!)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSalary ? 'Edit Salary' : 'Add Salary Record'}</DialogTitle>
              <DialogDescription>
                {selectedSalary ? 'Update salary information' : 'Create a new salary record. Select an employee and month to auto-fetch salary data.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-2 py-2">
                {autoFetching && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-blue-700">Fetching salary data...</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee *</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                      disabled={!!selectedSalary}
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
                      disabled={!!selectedSalary}
                    />
                  </div>
                </div>

                {/* Salary Summary - Auto-fetched from Attendance */}
                {salarySummary && !selectedSalary && formData.employeeId ? (
                  <div className="space-y-2 border-t pt-4">
                    {/* Attendance Stats */}
                    <div className="bg-white p-2 rounded-lg border border-gray-200 space-y-2">
                      <div className='flex justify-between items-center'>
                        <h4 className="font-semibold text-sm text-gray-700">Attendance Summary</h4>
                        <a href="/admin/employees/attendance/monthly/" target='_blank' className='text-xs p-1 px-2 bg-blue-100 hover:underline rounded animate-pulse'>View monthly attendance details</a>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        <div className="text-center p-1 bg-green-50 rounded">
                          <p className="text-lg font-bold text-green-600">{salarySummary.presentDays}</p>
                          <p className="text-xs text-gray-600">Present Days</p>
                        </div>
                        <div className="text-center p-1 bg-red-50 rounded">
                          <p className="text-lg font-bold text-red-600">{salarySummary.absentPaidDays}</p>
                          <p className="text-xs text-gray-600">Absent Paid</p>
                        </div>
                        <div className="text-center p-1 bg-orange-50 rounded">
                          <p className="text-lg font-bold text-orange-600">{salarySummary.absentUnpaidDays}</p>
                          <p className="text-xs text-gray-600">Absent Unpaid</p>
                        </div>
                        <div className="text-center p-1 bg-blue-50 rounded">
                          <p className="text-lg font-bold text-blue-600">{salarySummary.paidLeaveDays}</p>
                          <p className="text-xs text-gray-600">Paid Leave</p>
                        </div>
                        <div className="text-center p-1 bg-purple-50 rounded">
                          <p className="text-lg font-bold text-purple-600">{salarySummary.unpaidLeaveDays}</p>
                          <p className="text-xs text-gray-600">Unpaid Leave</p>
                        </div>
                        <div className="text-center p-1 bg-gray-100 rounded">
                          <p className="text-lg font-bold text-gray-600">{salarySummary.notMarkedDays}</p>
                          <p className="text-xs text-gray-600">Not Marked</p>
                        </div>
                      </div>
                    </div>

                    {/* Salary Calculations */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Working Days</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{salarySummary.workingDays}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Payable Days</p>
                        {includeHolidays && salarySummary.totalHolidays > 0 && salarySummary.payableDays >= 7 ? (
                          <div className='flex justify-between items-center'>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              {Number(salarySummary.basePayableDays) + salarySummary.totalHolidays}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              [{salarySummary.payableDays} + {salarySummary.totalHolidays}]

                            </p>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-gray-900 mt-1">{salarySummary.payableDays}</p>
                        )}
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Per Day Salary</p>
                        <p className="text-lg font-bold text-indigo-600 mt-1">AED {salarySummary.perDaySalary}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Attendance Rate</p>
                        <p className="text-lg font-bold text-indigo-600 mt-1">{salarySummary.attendanceRate}%</p>
                      </div>
                    </div>

                    {/* Holiday Information */}
                    {salarySummary.totalHolidays > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-700 font-semibold">Total Holidays: {salarySummary.totalHolidays}</p>
                            <p className="text-xs text-blue-600 mt-1">{`Include holidays in payable days? 
                            ${Number(salarySummary.payableDays) < 7 ? `You need at least 7 payable days to include ${salarySummary.totalHolidays} holidays.` : ''} `}</p>
                          </div>
                          <input
                            type="checkbox"
                            disabled={Number(salarySummary.payableDays) < 7}
                            checked={includeHolidays && Number(salarySummary.payableDays) >= 7}
                            onChange={() => setIncludeHolidays(!includeHolidays)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Gross, Deductions, Net */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200">
                        <p className="text-xs text-gray-600 font-medium">Gross Salary</p>
                        <p className="text-2xl font-bold text-indigo-600 mt-2">AED {salarySummary.grossSalary}</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
                        <p className="text-xs text-gray-600 font-medium">Deductions </p>
                        <p className="text-2xl font-bold text-red-600 mt-2">AED {salarySummary.totalDeductions}</p>
                        {/* <p className="text-xs text-gray-700 mt-1">{salarySummary.deductionReason}</p> */}
                      </div>
                      {/* <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-medium">Net Salary</p>
                        {includeHolidays && salarySummary.totalHolidays > 0 && salarySummary.payableDays >= 7 ? (
                          <p className="text-2xl font-bold text-green-600 mt-2">AED {(((Number(salarySummary.basePayableDays) + salarySummary.totalHolidays) * Number(salarySummary.perDaySalary)) - Number(salarySummary.totalDeductions)).toFixed(2)}</p>
                        ) : (
                          <p className="text-2xl font-bold text-green-600 mt-2">AED {(((Number(salarySummary.basePayableDays)) * Number(salarySummary.perDaySalary)) - Number(salarySummary.totalDeductions)).toFixed(2)}</p>
                        )}
                      </div> */}
                    </div>

                    {/* Additional Earnings & Deductions */}
                    <div className="space-y-2 border-t pt-2">
                      <h4 className="font-semibold text-sm text-gray-700">Additional Items</h4>


                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 1fr'>
                        {/* Other Allowance */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                          <div className="flex-[0.7]">
                            <p className="text-sm font-semibold text-green-700">Other Allowance</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="col-span-1 sm:col-span-2 space-y-1">
                                <Label className="text-xs text-gray-600">Reason</Label>
                                <Input
                                  type="text"
                                  placeholder="e.g., Bonus, Travel, Mobile"
                                  className="text-sm"
                                  value={otherAllowanceReason}
                                  onChange={(e) => setOtherAllowanceReason(e.target.value)}
                                />
                              </div>
                              <div className="col-span-1 space-y-1">
                                <Label className="text-xs text-gray-600">Amount (AED)</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={otherAllowanceAmount}
                                  onChange={(e) => setOtherAllowanceAmount(parseFloat(e.target.value) || 0)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Other Deductions */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                          <div className="">
                            <p className="text-sm font-semibold text-red-700">Other Deductions</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="col-span-1 sm:col-span-2 space-y-1">
                                <Label className="text-xs text-gray-600">Reason</Label>
                                <Input
                                  type="text"
                                  placeholder="e.g., Damage, Loan, Advance"
                                  className="text-sm"
                                  value={otherDeductionsReason}
                                  onChange={(e) => setOtherDeductionsReason(e.target.value)}
                                />
                              </div>
                              <div className="col-span-1 space-y-1">
                                <Label className="text-xs text-gray-600">Amount (AED)</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={otherDeductionsAmount}
                                  onChange={(e) => setOtherDeductionsAmount(parseFloat(e.target.value) || 0)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>


                      {/* Final Net Salary */}
                      <div className="bg-gradient-to-br from-green-600 to-green-700 p-3 rounded-lg text-white">
                        <p className="text-sm font-semibold opacity-90">FINAL NET SALARY</p>
                        <div className="flex items-center justify-between">
                          <p className="text-2xl font-bold">
                            AED {(
                              (includeHolidays && salarySummary.totalHolidays > 0 && salarySummary.payableDays >= 7 ?
                                (Number(salarySummary.basePayableDays) + salarySummary.totalHolidays) * Number(salarySummary.perDaySalary) :
                                Number(salarySummary.basePayableDays) * Number(salarySummary.perDaySalary)) -
                              Number(salarySummary.totalDeductions) +
                              otherAllowanceAmount -
                              otherDeductionsAmount
                            ).toFixed(2)}
                          </p>
                          <div className="text-right text-sm opacity-80">
                            <p>Payable Days: {includeHolidays && salarySummary.totalHolidays > 0 && salarySummary.payableDays >= 7 ? Number(salarySummary.basePayableDays) + salarySummary.totalHolidays : salarySummary.payableDays}</p>
                            <p>@ AED {salarySummary.perDaySalary}/day</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (

                  formData.employeeId && !selectedSalary && (
                    <div className="text-center text-red-500 italic border-t pt-2 animate-pulse">
                      This Employee Salary is already added for the selected month.
                    </div>
                  )

                )}

                {/* Manual Entry Section - Only show if editing existing salary */}
                {selectedSalary && salarySummary && (
                  <div className="space-y-2 border-t pt-4">
                    {/* Salary Summary Display for Editing */}
                    <div className="space-y-2 bg-white p-2 rounded-lg border border-gray-200">
                      <div className='flex justify-between items-center'>
                        <h4 className="font-semibold text-sm text-gray-700">Attendance Summary</h4>
                        <a href="/admin/employees/attendance/monthly/" target='_blank' className='text-xs p-1 px-2 bg-blue-100 hover:underline rounded animate-pulse'>View monthly attendance details</a>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        <div className="text-center p-1 bg-green-50 rounded">
                          <p className="text-lg font-bold text-green-600">{salarySummary.presentDays}</p>
                          <p className="text-xs text-gray-600">Present Days</p>
                        </div>
                        <div className="text-center p-1 bg-red-50 rounded">
                          <p className="text-lg font-bold text-red-600">{salarySummary.absentPaidDays}</p>
                          <p className="text-xs text-gray-600">Absent Paid</p>
                        </div>
                        <div className="text-center p-1 bg-orange-50 rounded">
                          <p className="text-lg font-bold text-orange-600">{salarySummary.absentUnpaidDays}</p>
                          <p className="text-xs text-gray-600">Absent Unpaid</p>
                        </div>
                        <div className="text-center p-1 bg-blue-50 rounded">
                          <p className="text-lg font-bold text-blue-600">{salarySummary.paidLeaveDays}</p>
                          <p className="text-xs text-gray-600">Paid Leave</p>
                        </div>
                        <div className="text-center p-1 bg-purple-50 rounded">
                          <p className="text-lg font-bold text-purple-600">{salarySummary.unpaidLeaveDays}</p>
                          <p className="text-xs text-gray-600">Unpaid Leave</p>
                        </div>
                        <div className="text-center p-1 bg-gray-100 rounded">
                          <p className="text-lg font-bold text-gray-600">{salarySummary.notMarkedDays}</p>
                          <p className="text-xs text-gray-600">Not Marked</p>
                        </div>
                      </div>
                    </div>

                    {/* Salary Calculations */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Working Days</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{salarySummary.workingDays}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Payable Days</p>
                        {includeHolidays && salarySummary.totalHolidays > 0 && Number(salarySummary.payableDays) >= 7 ? (
                          <div className='flex justify-between items-center'>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              {Number(salarySummary.basePayableDays) + salarySummary.totalHolidays}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              [{salarySummary.payableDays} + {salarySummary.totalHolidays}]
                            </p>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-gray-900 mt-1">{salarySummary.payableDays}</p>
                        )}
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Per Day Salary</p>
                        <p className="text-lg font-bold text-indigo-600 mt-1">AED {salarySummary.perDaySalary}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Attendance Rate</p>
                        <p className="text-lg font-bold text-indigo-600 mt-1">{salarySummary.attendanceRate}%</p>
                      </div>
                    </div>

                    {/* Holiday Information */}
                    {salarySummary.totalHolidays > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-700 font-semibold">Total Holidays: {salarySummary.totalHolidays}</p>
                            <p className="text-xs text-blue-600 mt-1">{`Include holidays in payable days? 
                            ${Number(salarySummary.payableDays) < 7 ? `You need at least 7 payable days to include ${salarySummary.totalHolidays} holidays.` : ''} `}</p>
                          </div>
                          <input
                            type="checkbox"
                            disabled={Number(salarySummary.payableDays) < 7}
                            checked={includeHolidays && Number(salarySummary.payableDays) >= 7}
                            onChange={() => setIncludeHolidays(!includeHolidays)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Gross, Deductions, Net */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200">
                        <p className="text-xs text-gray-600 font-medium">Gross Salary</p>
                        <p className="text-2xl font-bold text-indigo-600 mt-2">AED {salarySummary.grossSalary}</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
                        <p className="text-xs text-gray-600 font-medium">Deductions</p>
                        <p className="text-2xl font-bold text-red-600 mt-2">AED {salarySummary.totalDeductions}</p>
                      </div>
                    </div>

                    {/* Additional Earnings & Deductions */}
                    <div className="space-y-2 border-t pt-2">
                      <h4 className="font-semibold text-sm text-gray-700">Additional Items</h4>

                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                        {/* Other Allowance */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                          <div className="">
                            <p className="text-sm font-semibold text-green-700">Other Allowance</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="col-span-1 sm:col-span-2 space-y-1">
                                <Label className="text-xs text-gray-600">Reason</Label>
                                <Input
                                  type="text"
                                  placeholder="e.g., Bonus, Travel, Mobile"
                                  className="text-sm"
                                  value={otherAllowanceReason}
                                  onChange={(e) => setOtherAllowanceReason(e.target.value)}
                                />
                              </div>
                              <div className="col-span-1 space-y-1">
                                <Label className="text-xs text-gray-600">Amount (AED)</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={otherAllowanceAmount}
                                  onChange={(e) => setOtherAllowanceAmount(parseFloat(e.target.value) || 0)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Other Deductions */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                          <div className="">
                            <p className="text-sm font-semibold text-red-700">Other Deductions</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="col-span-1 sm:col-span-2 space-y-1">
                                <Label className="text-xs text-gray-600">Reason</Label>
                                <Input
                                  type="text"
                                  placeholder="e.g., Damage, Loan, Advance"
                                  className="text-sm"
                                  value={otherDeductionsReason}
                                  onChange={(e) => setOtherDeductionsReason(e.target.value)}
                                />
                              </div>
                              <div className="col-span-1 space-y-1">
                                <Label className="text-xs text-gray-600">Amount (AED)</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={otherDeductionsAmount}
                                  onChange={(e) => setOtherDeductionsAmount(parseFloat(e.target.value) || 0)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Final Net Salary */}
                    <div className="bg-gradient-to-br from-green-600 to-green-700 p-3 rounded-lg text-white">
                      <p className="text-sm font-semibold opacity-90">FINAL NET SALARY</p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-bold">
                          AED {(
                            (includeHolidays && salarySummary.totalHolidays > 0 && Number(salarySummary.payableDays) >= 7 ?
                              (Number(salarySummary.basePayableDays) + salarySummary.totalHolidays) * Number(salarySummary.perDaySalary) :
                              Number(salarySummary.basePayableDays) * Number(salarySummary.perDaySalary)) -
                            Number(salarySummary.totalDeductions) +
                            otherAllowanceAmount -
                            otherDeductionsAmount
                          ).toFixed(2)}
                        </p>
                        <div className="text-right text-sm opacity-80">
                          <p>Payable Days: {includeHolidays && salarySummary.totalHolidays > 0 && Number(salarySummary.payableDays) >= 7 ? Number(salarySummary.basePayableDays) + salarySummary.totalHolidays : salarySummary.payableDays}</p>
                          <p>@ AED {salarySummary.perDaySalary}/day</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || (!salarySummary && !selectedSalary)}>
                  {submitting ? 'Saving...' : selectedSalary ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Salary Slip</DialogTitle>
            </DialogHeader>
            {selectedSalary ? (
              <div className="space-y-4 py-4">
                <div className="text-center border-b pb-4">
                  <h3 className="text-lg font-bold">{getEmployeeName(selectedSalary.employeeId)}</h3>
                  <p className="text-sm text-gray-600">{selectedSalary.month}</p>
                </div>

                <div className="space-y-4">
                  {/* Attendance Summary Section */}
                  {loadingAttendance ? (
                    <div className="text-center text-gray-500 py-4">Loading attendance data...</div>
                  ) : viewAttendanceSummary ? (
                    <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                      <h4 className="font-semibold text-sm text-gray-700">Attendance Summary</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <p className="text-lg font-bold text-green-600">{viewAttendanceSummary.presentDays}</p>
                          <p className="text-xs text-gray-600">Present Days</p>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <p className="text-lg font-bold text-red-600">{viewAttendanceSummary.absentPaidDays}</p>
                          <p className="text-xs text-gray-600">Absent Paid</p>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded">
                          <p className="text-lg font-bold text-orange-600">{viewAttendanceSummary.absentUnpaidDays}</p>
                          <p className="text-xs text-gray-600">Absent Unpaid</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <p className="text-lg font-bold text-blue-600">{viewAttendanceSummary.paidLeaveDays}</p>
                          <p className="text-xs text-gray-600">Paid Leave</p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <p className="text-lg font-bold text-purple-600">{viewAttendanceSummary.unpaidLeaveDays}</p>
                          <p className="text-xs text-gray-600">Unpaid Leave</p>
                        </div>
                        <div className="text-center p-2 bg-gray-100 rounded">
                          <p className="text-lg font-bold text-gray-600">{viewAttendanceSummary.notMarkedDays}</p>
                          <p className="text-xs text-gray-600">Not Marked</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Salary Calculations */}
                  {loadingAttendance ? (
                    <div className="text-center text-gray-500 py-2">Loading...</div>
                  ) : viewAttendanceSummary ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Working Days</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{viewAttendanceSummary.workingDays}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Payable Days</p>
                        {selectedSalary?.includeHolidays && selectedSalary?.totalHolidays && selectedSalary?.totalHolidays > 0 ? (
                          <div className='flex justify-between items-center'>
                            <p className="text-lg font-bold text-indigo-600 mt-1">
                              {(Number(selectedSalary.basePayableDays) + selectedSalary.totalHolidays).toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              [{Number(selectedSalary.basePayableDays).toFixed(1)} + {selectedSalary.totalHolidays}]
                            </p>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-indigo-600 mt-1">{viewAttendanceSummary.payableDays}</p>
                        )}
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Per Day Salary</p>
                        <p className="text-lg font-bold text-indigo-600 mt-1">AED {viewAttendanceSummary.perDaySalary}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">Attendance Rate</p>
                        <p className="text-lg font-bold text-indigo-600 mt-1">{viewAttendanceSummary.attendanceRate}%</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Gross, Deductions, Net */}
                  {viewAttendanceSummary && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200">
                        <p className="text-xs text-gray-600 font-medium">Gross Salary</p>
                        <p className="text-2xl font-bold text-indigo-600 mt-2">AED {viewAttendanceSummary.grossSalary}</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
                        <p className="text-xs text-gray-600 font-medium">Deductions</p>
                        <p className="text-2xl font-bold text-red-600 mt-2">AED {viewAttendanceSummary.totalDeductions}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-medium">Net Salary</p>
                        <p className="text-2xl font-bold text-green-600 mt-2">AED {(selectedSalary?.includeHolidays && selectedSalary?.totalHolidays && selectedSalary?.totalHolidays > 0 ? ((Number(selectedSalary.basePayableDays) + selectedSalary.totalHolidays) * Number(viewAttendanceSummary.perDaySalary) - Number(viewAttendanceSummary.totalDeductions)) : (Number(viewAttendanceSummary.basePayableDays) * Number(viewAttendanceSummary.perDaySalary) - Number(viewAttendanceSummary.totalDeductions))).toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  {/* Additional Allowance and Deductions */}
                  {selectedSalary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4">
                      {/* Other Allowance */}
                      {(selectedSalary.otherAllowanceAmount || 0) > 0 && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-sm text-green-700 mb-2">Other Allowance</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Reason</span>
                              <span className="font-semibold">{selectedSalary.otherAllowanceReason || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Amount</span>
                              <span className="font-semibold">AED {Number(selectedSalary.otherAllowanceAmount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Other Deductions */}
                      {(selectedSalary.otherDeductionsAmount || 0) > 0 && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <h4 className="font-semibold text-sm text-red-700 mb-2">Other Deductions</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Reason</span>
                              <span className="font-semibold">{selectedSalary.otherDeductionsReason || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Amount</span>
                              <span className="font-semibold">AED {Number(selectedSalary.otherDeductionsAmount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Final Net Salary */}
                  {viewAttendanceSummary && (
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-4 rounded-lg text-white">
                      <p className="text-sm font-semibold opacity-90 mb-2">FINAL NET SALARY</p>
                      <p className="text-3xl font-bold">
                        AED {(
                          (selectedSalary?.includeHolidays && selectedSalary?.totalHolidays && selectedSalary?.totalHolidays > 0 ?
                            (Number(selectedSalary.basePayableDays) + selectedSalary.totalHolidays) * Number(viewAttendanceSummary.perDaySalary) :
                            Number(viewAttendanceSummary.basePayableDays) * Number(viewAttendanceSummary.perDaySalary)) -
                          Number(viewAttendanceSummary.totalDeductions) +
                          Number(selectedSalary.otherAllowanceAmount || 0) -
                          Number(selectedSalary.otherDeductionsAmount || 0)
                        ).toFixed(2)}
                      </p>
                      <p className="text-xs opacity-80 mt-2">Payable Days: {selectedSalary?.includeHolidays && selectedSalary?.totalHolidays && selectedSalary?.totalHolidays > 0 ? (Number(selectedSalary.basePayableDays) + selectedSalary.totalHolidays).toFixed(1) : Number(viewAttendanceSummary.payableDays).toFixed(1)} @ AED {viewAttendanceSummary.perDaySalary}/day</p>
                    </div>
                  )}

                  {/* Status Section */}
                  <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                    <span className="font-semibold text-gray-700">Status</span>
                    <Badge className={getStatusColor(selectedSalary.status)}>
                      {selectedSalary.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>


      </div>
    </ModuleAccessComponent>
  );
}
