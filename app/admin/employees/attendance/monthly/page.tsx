"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, onSnapshot, writeBatch } from 'firebase/firestore';
import { Employee } from '@/lib/types';
import { 
  DailyAttendance, 
  MonthlyAttendanceSummary, 
  SalaryBreakdown 
} from '@/lib/attendanceTypes';
import { useUser } from '@/lib/userContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  AlertCircle,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Trash,
  X as XIcon,
} from 'lucide-react';
import {
  calculateMonthlyAttendanceSummary,
  calculateSalaryBreakdown,
  calculateEmployeeDetailStats,
  formatCurrency,
  formatPercentage,
  getWorkingDaysInMonth,
} from '@/lib/attendanceCalculations';
import { ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';
import { AttendanceSettings } from '@/lib/attendanceTypes';

interface EmployeeAttendanceData {
  employee: Employee;
  summary: MonthlyAttendanceSummary;
  salaryBreakdown?: SalaryBreakdown;
}

export default function MonthlyAttendancePage() {
  const router = useRouter();
  const { role: currentRole } = useUser();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'charts'>('list');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);

  const [includeHolidays, setIncludeHolidays] = useState<boolean>(true);

  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>({
    workingDays: [1, 2, 3, 4, 5],
    holidays: [],
    weekendDays: ['Saturday', 'Sunday'],
  });
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearDialogEmployee, setClearDialogEmployee] = useState<string>('');

  const isAuthorized = currentRole === 'admin' || currentRole === 'manager' || currentRole === 'accounts';

  // Helper function to calculate weekend days and custom holidays in a month
  const calculateHolidayBreakdown = (year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekendDaysList = attendanceSettings.weekendDays || ['Saturday', 'Sunday'];
    
    let weekendDaysCount = 0;
    
    // Count weekend days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayName = dayNames[date.getDay()];
      if (weekendDaysList.includes(dayName)) {
        weekendDaysCount++;
      }
    }
    
    // Count custom holidays in the month
    const allHolidaysInMonth = (attendanceSettings.holidays || []).filter(h => {
      const [y, m] = h.date.split('-').map(Number);
      return y === year && m === month;
    });
    
    const customHolidaysCount = allHolidaysInMonth.length;
    
    // Count custom holidays that fall on week-off days
    const holidaysOnWeekoffCount = allHolidaysInMonth.filter(h => {
      const [y, m, d] = h.date.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const dayName = dayNames[date.getDay()];
      return weekendDaysList.includes(dayName);
    }).length;
    
    // Count holidays NOT on week-off days
    const holidaysNotOnWeekoff = customHolidaysCount - holidaysOnWeekoffCount;
    
    return {
      weekendDays: weekendDaysCount,
      customHolidays: customHolidaysCount,
      holidaysOnWeekoff: holidaysOnWeekoffCount,
      holidaysNotOnWeekoff: holidaysNotOnWeekoff,
      total: weekendDaysCount + customHolidaysCount,
    };
  };

  // Clear all attendance for an employee in selected month
  const clearMonthAttendance = async (empId: string) => {
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const daysInMonth = new Date(year, month, 0).getDate();

      const batch = writeBatch(db);
      let deletedCount = 0;

      // Query and delete all attendance records for the employee in the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const q = query(
          collection(db, 'dailyAttendance'),
          where('employeeId', '==', empId),
          where('date', '==', dateStr)
        );
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          deletedCount++;
        });
      }

      if (deletedCount > 0) {
        await batch.commit();
        
        // Refetch the monthly data to update UI immediately
        await refetchMonthlyData();
        
        toast.success(`Cleared ${deletedCount} attendance record(s) for the month`);
      } else {
        toast.info('No attendance records found for this month');
      }
    } catch (error) {
      console.error('Error clearing attendance:', error);
      toast.error('Failed to clear attendance');
    } finally {
      setShowClearDialog(false);
      setClearDialogEmployee('');
    }
  };

  // Fetch attendance settings with real-time listener
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

    // Cleanup: unsubscribe from the listener when component unmounts
    return () => unsubscribe();
  }, []);

  // Function to refetch attendance data for the current month
  const refetchMonthlyData = async () => {
    if (!isAuthorized) return;

    try {
      // Fetch active employees
      const empQuery = query(
        collection(db, 'employees'),
        where('status', '==', 'active')
      );
      const empSnapshot = await getDocs(empQuery);
      const emps = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      emps.sort((a, b) => a.name.localeCompare(b.name));
      setEmployees(emps);

      // Extract departments
      const depts = Array.from(new Set(emps.map(e => e.department))).sort();
      setDepartments(depts);

      // Fetch daily attendance records for the month
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // Create date strings for the month range (YYYY-MM-DD format)
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const attQuery = query(
        collection(db, 'dailyAttendance'),
        where('date', '>=', startDateStr),
        where('date', '<=', endDateStr)
      );

      const attSnapshot = await getDocs(attQuery);
      const dailyRecords = attSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as DailyAttendance));

      // Group by employee
      const recordsByEmployee: Record<string, DailyAttendance[]> = {};
      emps.forEach(emp => {
        recordsByEmployee[emp.id || ''] = [];
      });
      dailyRecords.forEach(record => {
        if (recordsByEmployee[record.employeeId]) {
          recordsByEmployee[record.employeeId].push(record);
        }
      });

      // Calculate summaries
      const holidayDates = (attendanceSettings.holidays || []).map(h => {
        const [y, m, d] = h.date.split('-').map(Number);
        return new Date(y, m - 1, d);
      });

      const data: EmployeeAttendanceData[] = [];
      for (const emp of emps) {
        const empId = emp.id || '';
        const summary = calculateMonthlyAttendanceSummary(
          empId,
          year,
          month,
          recordsByEmployee[empId] || [],
          holidayDates,
          'system',
          attendanceSettings.workingDays || [1, 2, 3, 4, 5]
        );

        const salaryBreakdown = emp.salary
          ? calculateSalaryBreakdown(
              empId,
              year,
              month,
              emp.salary,
              summary,
              'system'
            )
          : undefined;

        data.push({
          employee: emp,
          summary,
          salaryBreakdown,
        });
      }

      setEmployeeData(data);
    } catch (error) {
      console.error('Error refetching attendance data:', error);
      toast.error('Failed to reload attendance data');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthorized) return;

      try {
        setLoading(true);

        // Fetch active employees
        const empQuery = query(
          collection(db, 'employees'),
          where('status', '==', 'active')
        );
        const empSnapshot = await getDocs(empQuery);
        const emps = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        emps.sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(emps);

        // Extract departments
        const depts = Array.from(new Set(emps.map(e => e.department))).sort();
        setDepartments(depts);

        // Fetch daily attendance records for the month
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // Create date strings for the month range (YYYY-MM-DD format)
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const attQuery = query(
          collection(db, 'dailyAttendance'),
          where('date', '>=', startDateStr),
          where('date', '<=', endDateStr)
        );

        const attSnapshot = await getDocs(attQuery);
        const dailyRecords = attSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as DailyAttendance));

        // Group by employee
        const recordsByEmployee: Record<string, DailyAttendance[]> = {};
        emps.forEach(emp => {
          recordsByEmployee[emp.id || ''] = [];
        });
        dailyRecords.forEach(record => {
          if (recordsByEmployee[record.employeeId]) {
            recordsByEmployee[record.employeeId].push(record);
          }
        });

        // Calculate summaries
        const holidayDates = (attendanceSettings.holidays || []).map(h => {
          const [y, m, d] = h.date.split('-').map(Number);
          return new Date(y, m - 1, d);
        });

        const data: EmployeeAttendanceData[] = [];
        for (const emp of emps) {
          const empId = emp.id || '';
          const summary = calculateMonthlyAttendanceSummary(
            empId,
            year,
            month,
            recordsByEmployee[empId] || [],
            holidayDates,
            'system',
            attendanceSettings.workingDays || [1, 2, 3, 4, 5]
          );

          const salaryBreakdown = emp.salary
            ? calculateSalaryBreakdown(
                empId,
                year,
                month,
                emp.salary,
                summary,
                'system'
              )
            : undefined;

          data.push({
            employee: emp,
            summary,
            salaryBreakdown,
          });
        }

        setEmployeeData(data);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        toast.error('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, isAuthorized, attendanceSettings]);

  const navigateMonth = (months: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + months);
    setSelectedDate(newDate);
  };

  const filteredData = filterDept === 'all'
    ? employeeData
    : employeeData.filter(d => d.employee.department === filterDept);

  // Chart data
  const chartData = filteredData.map(d => ({
    name: d.employee.name,
    present: d.summary.totalPresentDays,
    absent: d.summary.totalAbsentDays,
    leave: d.summary.totalPaidLeaveDays + d.summary.totalUnpaidLeaveDays,
    notMarked: d.summary.totalNotMarkedDays,
  }));

  const departmentStats = departments.map(dept => {
    const deptData = employeeData.filter(d => d.employee.department === dept);
    const totalPresent = deptData.reduce((sum, d) => sum + d.summary.totalPresentDays, 0);
    const totalAbsent = deptData.reduce((sum, d) => sum + d.summary.totalAbsentDays, 0);
    const totalLeave = deptData.reduce((sum, d) => sum + d.summary.totalPaidLeaveDays + d.summary.totalUnpaidLeaveDays, 0);

    return {
      name: dept,
      present: totalPresent,
      absent: totalAbsent,
      leave: totalLeave,
      count: deptData.length,
    };
  });

  const salaryStats = filteredData
    .filter(d => d.salaryBreakdown)
    .reduce(
      (acc, d) => ({
        totalGross: acc.totalGross + (d.salaryBreakdown?.grossSalary || 0),
        totalNet: acc.totalNet + (d.salaryBreakdown?.netSalary || 0),
        totalDeductions: acc.totalDeductions + (d.salaryBreakdown?.totalDeductions || 0),
      }),
      { totalGross: 0, totalNet: 0, totalDeductions: 0 }
    );

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to view attendance reports.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading attendance reports...
      </div>
    );
  }

  return (
    <ModuleAccessComponent module={ModuleAccess.EMPLOYEES}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-indigo-600" />
              Monthly Attendance & Salary Report
            </h1>
            <p className="text-gray-600 mt-1">Detailed attendance summary and salary calculations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(-1)}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous Month
              </Button>

              <div className="text-center min-w-[200px]">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <input
                  type="month"
                  value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    setSelectedDate(new Date(parseInt(year), parseInt(month) - 1));
                  }}
                  className="mt-2 text-center w-full"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(1)}
              >
                Next Month
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="w-full sm:w-auto"
            >
              Current Month
            </Button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-200 hover:bg-gray-300'}
          >
            List View
          </Button>
          <Button
            onClick={() => setViewMode('charts')}
            className={viewMode === 'charts' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-200 hover:bg-gray-300'}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Charts & Analytics
          </Button>
        </div>

        {/* Department Filter */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Department</label>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Charts View */}
        {viewMode === 'charts' && (
          <div className="space-y-6">
            {/* Department Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Department Attendance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#10b981" />
                    <Bar dataKey="absent" fill="#ef4444" />
                    <Bar dataKey="leave" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Employee Attendance Trend */}
              {filteredData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Attendance Rate by Employee</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredData.map(d => ({
                      name: d.employee.name.split(' ')[0],
                      rate: d.summary.attendancePercentage,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="rate" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Salary Summary */}
            {salaryStats.totalGross > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
                  <p className="text-sm text-green-700 font-semibold">Total Gross Salary</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {formatCurrency(salaryStats.totalGross)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow p-6 border border-red-200">
                  <p className="text-sm text-red-700 font-semibold">Total Deductions</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {formatCurrency(salaryStats.totalDeductions)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
                  <p className="text-sm text-blue-700 font-semibold">Total Net Salary</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {formatCurrency(salaryStats.totalNet)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className=" grid grid-cols-1 md:grid-cols-2  gap-3">
            {filteredData.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">No employees found</p>
              </div>
            ) : (
              filteredData.map(data => (
                <div key={data.employee.id} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Employee Header */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{data.employee.name}</h3>
                        <p className="text-sm text-gray-600">{data.employee.position} • {data.employee.department}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Job Status: <span className="font-semibold text-gray-700">
                            {data.employee.jobStatus === 'full-time' ? 'Full Time' : data.employee.jobStatus === 'part-time' ? 'Part Time' : 'Freelance'}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">{formatPercentage(data.summary.attendancePercentage)}</p>
                        <p className="text-xs text-gray-600">Attendance Rate</p>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 p-6 border-b">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{data.summary.totalPresentDays}</p>
                      <p className="text-xs text-gray-600">Present Days</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{data.summary.totalAbsentPaidDays}</p>
                      <p className="text-xs text-gray-600">Absent Paid</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-800">{data.summary.totalAbsentUnpaidDays}</p>
                      <p className="text-xs text-gray-600">Absent Unpaid</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">{data.summary.totalPaidLeaveDays}</p>
                      <p className="text-xs text-gray-600">Paid Leave</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{data.summary.totalUnpaidLeaveDays}</p>
                      <p className="text-xs text-gray-600">Unpaid Leave</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">{data.summary.totalNotMarkedDays}</p>
                      <p className="text-xs text-gray-600">Not Marked</p>
                    </div>
                  </div>

                  {/* Salary Breakdown */}
                  {data.salaryBreakdown && (
                    <div className="p-6 bg-gray-50 space-y-4">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <p className="text-xs text-gray-600">Working Days</p>
                          <p className="text-lg font-bold text-gray-900">{data.salaryBreakdown.workingDaysInMonth}</p>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <p className="text-xs text-gray-600">Payable Days</p>
                          <div className='flex justify-start items-center'>

                              {
                                includeHolidays ? (

                                  <>
                                  <p className="text-lg font-bold text-gray-900 mr-2">{Number(data.salaryBreakdown.totalPayableDays) + Number(calculateHolidayBreakdown(selectedDate.getFullYear(), selectedDate.getMonth() + 1).total)}</p>

                                  <p className='text-xs whitespace-nowrap'> [{data.salaryBreakdown.totalPayableDays} + {calculateHolidayBreakdown(selectedDate.getFullYear(), selectedDate.getMonth() + 1).total} Holidays]</p>
                                  </>
                                ) : (
                                  <p className="text-lg font-bold text-gray-900">{data.salaryBreakdown.totalPayableDays}</p>
                                )
                              }
                          </div>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <p className="text-xs text-gray-600">Per Day Salary</p>
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(data.salaryBreakdown.perDaySalary)}</p>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <p className="text-xs text-gray-600">Attendance Rate</p>
                          <p className="text-lg font-bold text-gray-900">{formatPercentage(data.summary.attendancePercentage)}</p>
                        </div>
                      </div>

                      {/* Salary Components */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="border-l-4 border-green-600 pl-4 bg-white p-3 rounded">
                          <p className="text-sm text-gray-600">Gross Salary</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(data.salaryBreakdown.grossSalary)}
                          </p>
                        </div>
                        <div className="border-l-4 border-red-600 pl-4 bg-white p-3 rounded">
                          <p className="text-sm text-gray-600">Deductions</p>
                          <p className="text-xl font-bold text-red-600">
                            {formatCurrency(data.salaryBreakdown.totalDeductions)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Absent: {data.salaryBreakdown.absentDays} days | Unpaid Leave: {data.salaryBreakdown.unpaidLeaveDays} days
                          </p>
                        </div>
                        <div className="border-l-4 border-blue-600 pl-4 bg-white p-3 rounded">
                          <p className="text-sm text-gray-600">Net Salary</p>
                          
                          

                          <div className="text-xl font-bold text-blue-600">

                            {includeHolidays ? (
                              formatCurrency(
                                ((data.salaryBreakdown.totalPayableDays + calculateHolidayBreakdown(selectedDate.getFullYear(), selectedDate.getMonth() + 1).total) * data.salaryBreakdown.perDaySalary) - data.salaryBreakdown.totalDeductions 
                              )
                            ) : (
                              formatCurrency(
                                (data.salaryBreakdown.totalPayableDays * data.salaryBreakdown.perDaySalary) - data.salaryBreakdown.totalDeductions
                              )
                            )}
                            
                            {/* {formatCurrency(
                              (data.salaryBreakdown.totalPayableDays * data.salaryBreakdown.perDaySalary) - data.salaryBreakdown.totalDeductions
                            )} */}
                          </div>


                          


                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div className="p-6 text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span>Working Days in Month:</span>
                      <span className="font-semibold text-gray-900">{data.summary.totalWorkingDays}</span>
                    </div> 

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Week Off Days ({(attendanceSettings.weekendDays || ['Saturday', 'Sunday']).join(', ')})</span>
                        <span className="font-semibold text-gray-900">
                          {calculateHolidayBreakdown(selectedDate.getFullYear(), selectedDate.getMonth() + 1).weekendDays}
                        </span>
                      </div>
                      {calculateHolidayBreakdown(selectedDate.getFullYear(), selectedDate.getMonth() + 1).customHolidays > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span>Other Holidays (Govt, Company)</span>
                            <span className="font-semibold text-gray-900">
                              {calculateHolidayBreakdown(selectedDate.getFullYear(), selectedDate.getMonth() + 1).customHolidays}
                            </span>
                          </div>
                          {calculateHolidayBreakdown(selectedDate.getFullYear(), selectedDate.getMonth() + 1).holidaysOnWeekoff > 0 && (
                            <div className="flex justify-between pl-4 text-sm">
                              <span className="text-gray-600">Coming in Week Off</span>
                              <span className="font-semibold text-blue-600">
                                {calculateHolidayBreakdown(selectedDate.getFullYear(), selectedDate.getMonth() + 1).holidaysOnWeekoff}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between  pt-2 border-t">
                        <div className="font-semibold flex justify-center items-center">
                          Total Holidays
                          <input type="checkbox"
                            className="ml-3 mr-1 cursor-pointer"
                            checked={includeHolidays}
                            onChange={() => setIncludeHolidays(!includeHolidays)}
                          />
                          Include in Payable Days
                        </div>
                        <span className="font-semibold text-gray-900">
                          {calculateHolidayBreakdown(selectedDate.getFullYear(), selectedDate.getMonth() + 1).total}
                        </span>

                      </div>
                    </div>

                    {data.salaryBreakdown && (
                      <>
                        <div className="flex justify-between pt-2 border-t">
                          <span>Per Day Salary:</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(data.salaryBreakdown.perDaySalary)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {/* <div className="p-4 border-t bg-gray-50 flex gap-2">
                    <Button
                      onClick={() => {
                        setClearDialogEmployee(data.employee.id!);
                        setShowClearDialog(true);
                      }}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Clear All Attendance
                    </Button>
                  </div> */}
                </div>
              ))
            )}
          </div>
        )}

        {/* Clear Attendance Confirmation Dialog */}
        {showClearDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-base sm:text-lg text-gray-800">Clear All Attendance</h3>
                <button onClick={() => setShowClearDialog(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <XIcon className="w-4 sm:w-5 h-4 sm:h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to clear <strong>all</strong> attendance records for <strong>{selectedDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => clearMonthAttendance(clearDialogEmployee)}
                  className="bg-red-600 hover:bg-red-700 flex-1 text-xs sm:text-sm"
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
                <Button
                  onClick={() => setShowClearDialog(false)}
                  variant="outline"
                  className="flex-1 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModuleAccessComponent>
  );
}
