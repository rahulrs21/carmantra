/**
 * Attendance & Salary Calculation Utilities
 * Core business logic for attendance and salary calculations
 */

import { 
  DailyAttendance, 
  MonthlyAttendanceSummary, 
  SalaryBreakdown, 
  PresentDayType,
  AttendanceStatus
} from './attendanceTypes';
import { Timestamp } from 'firebase/firestore';

// ============================================================================
// CALCULATION UTILITIES
// ============================================================================

/**
 * Convert present day type to numerical contribution
 * full = 1.0, half = 0.5, quarter = 0.25
 */
export const getDayContribution = (dayType: PresentDayType): number => {
  const contributions: Record<PresentDayType, number> = {
    'full': 1.0,
    'half': 0.5,
    'quarter': 0.25,
  };
  return contributions[dayType] || 0;
};

/**
 * Check if a date is weekend (Saturday = 6, Sunday = 0)
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

/**
 * Check if a date is a working day (not weekend)
 */
export const isWorkingDay = (date: Date, holidays?: Date[]): boolean => {
  if (isWeekend(date)) return false;
  if (holidays?.some(h => isSameDay(h, date))) return false;
  return true;
};

/**
 * Get number of working days in a month
 */
export const getWorkingDaysInMonth = (year: number, month: number, holidays: Date[] = []): number => {
  let workingDays = 0;
  const lastDay = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month - 1, day);
    if (isWorkingDay(date, holidays)) {
      workingDays++;
    }
  }
  
  return workingDays;
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

/**
 * Convert Timestamp or string to Date
 */
export const timestampToDate = (ts: Timestamp | string | any): Date => {
  if (ts instanceof Timestamp) {
    return ts.toDate();
  }
  if (typeof ts === 'string') {
    // Parse YYYY-MM-DD format
    const [year, month, day] = ts.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(ts);
};

/**
 * Get array of dates for all days in a month
 */
export const getDaysInMonth = (year: number, month: number): Date[] => {
  const dates: Date[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= lastDay; day++) {
    dates.push(new Date(year, month - 1, day));
  }
  
  return dates;
};

// ============================================================================
// MONTHLY ATTENDANCE CALCULATION
// ============================================================================

/**
 * Calculate monthly attendance summary from daily records
 */
export const calculateMonthlyAttendanceSummary = (
  employeeId: string,
  year: number,
  month: number,
  dailyAttendanceRecords: DailyAttendance[],
  holidays: Date[] = [],
  calculatedBy: string = 'system'
): MonthlyAttendanceSummary => {
  const workingDaysInMonth = getWorkingDaysInMonth(year, month, holidays);
  const daysInMonth = getDaysInMonth(year, month);
  
  let totalPresentDays = 0;
  let totalAbsentDays = 0;
  let totalPaidLeaveDays = 0;
  let totalUnpaidLeaveDays = 0;
  let totalNotMarkedDays = 0;
  
  // Process each day in the month
  daysInMonth.forEach(date => {
    // Skip non-working days
    if (!isWorkingDay(date, holidays)) {
      return;
    }
    
    // Find attendance record for this day
    const record = dailyAttendanceRecords.find(r => 
      isSameDay(timestampToDate(r.date), date)
    );
    
    if (!record) {
      totalNotMarkedDays++;
      return;
    }
    
    switch (record.status) {
      case 'present':
        totalPresentDays += getDayContribution(record.presentDayType || 'full');
        break;
      case 'absent':
        totalAbsentDays++;
        break;
      case 'leave':
        if (record.leaveType === 'paid') {
          totalPaidLeaveDays++;
        } else {
          totalUnpaidLeaveDays++;
        }
        break;
      case 'not-marked':
        totalNotMarkedDays++;
        break;
    }
  });
  
  // Calculate payable days
  // Formula: workingDays - unpaidLeave - absent (but counting present + paidLeave)
  const totalPayableDays = totalPresentDays + totalPaidLeaveDays;
  const attendancePercentage = workingDaysInMonth > 0 
    ? (totalPresentDays / workingDaysInMonth) * 100 
    : 0;
  
  return {
    id: `${employeeId}-${year}-${month}`,
    employeeId,
    year,
    month,
    totalWorkingDays: workingDaysInMonth,
    totalPresentDays,
    totalAbsentDays,
    totalPaidLeaveDays,
    totalUnpaidLeaveDays,
    totalNotMarkedDays,
    totalPayableDays,
    attendancePercentage: Math.round(attendancePercentage * 100) / 100,
    calculatedAt: Timestamp.now(),
    calculatedBy,
    status: 'completed',
  };
};

// ============================================================================
// SALARY CALCULATION
// ============================================================================

/**
 * Calculate salary breakdown for a month
 */
export const calculateSalaryBreakdown = (
  employeeId: string,
  year: number,
  month: number,
  grossSalary: number,
  monthlyAttendanceSummary: MonthlyAttendanceSummary,
  calculatedBy: string = 'system'
): SalaryBreakdown => {
  const workingDaysInMonth = monthlyAttendanceSummary.totalWorkingDays;
  const perDaySalary = workingDaysInMonth > 0 ? grossSalary / workingDaysInMonth : 0;
  
  // Get payable and deductible days
  const presentDays = monthlyAttendanceSummary.totalPresentDays;
  const paidLeaveDays = monthlyAttendanceSummary.totalPaidLeaveDays;
  const absentDays = monthlyAttendanceSummary.totalAbsentDays;
  const unpaidLeaveDays = monthlyAttendanceSummary.totalUnpaidLeaveDays;
  
  const totalPayableDays = presentDays + paidLeaveDays;
  
  // Calculate deductions
  const totalDeductionDays = absentDays + unpaidLeaveDays;
  const totalDeductions = totalDeductionDays * perDaySalary;
  
  // Net salary
  const netSalary = grossSalary - totalDeductions;
  
  // Detailed breakdown
  const presentDaysAmount = presentDays * perDaySalary;
  const paidLeaveDaysAmount = paidLeaveDays * perDaySalary;
  const absentDaysDeduction = absentDays * perDaySalary;
  const unpaidLeaveDaysDeduction = unpaidLeaveDays * perDaySalary;
  
  return {
    id: `${employeeId}-${year}-${month}`,
    employeeId,
    year,
    month,
    grossSalary,
    workingDaysInMonth,
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    presentDays,
    paidLeaveDays,
    totalPayableDays,
    absentDays,
    unpaidLeaveDays,
    deductionPerDay: Math.round(perDaySalary * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netSalary: Math.round(netSalary * 100) / 100,
    breakdown: {
      presentDaysAmount: Math.round(presentDaysAmount * 100) / 100,
      paidLeaveDaysAmount: Math.round(paidLeaveDaysAmount * 100) / 100,
      absentDaysDeduction: Math.round(absentDaysDeduction * 100) / 100,
      unpaidLeaveDaysDeduction: Math.round(unpaidLeaveDaysDeduction * 100) / 100,
    },
    calculatedAt: Timestamp.now(),
    calculatedBy,
    status: 'calculated',
  };
};

/**
 * Batch calculate salary for multiple employees
 */
export const calculateBatchSalaries = (
  employees: Array<{ id: string; salary: number }>,
  year: number,
  month: number,
  monthlySummaries: Record<string, MonthlyAttendanceSummary>,
  calculatedBy: string = 'system'
): SalaryBreakdown[] => {
  return employees.map(emp => {
    const summary = monthlySummaries[emp.id];
    if (!summary) {
      throw new Error(`No attendance summary found for employee ${emp.id}`);
    }
    return calculateSalaryBreakdown(
      emp.id,
      year,
      month,
      emp.salary,
      summary,
      calculatedBy
    );
  });
};

// ============================================================================
// FORMATTING & DISPLAY UTILITIES
// ============================================================================

/**
 * Format day type to readable string
 */
export const formatDayType = (dayType?: PresentDayType): string => {
  const labels: Record<PresentDayType, string> = {
    'full': 'Full Day (1.0)',
    'half': 'Half Day (0.5)',
    'quarter': 'Quarter Day (0.25)',
  };
  return labels[dayType || 'full'];
};

/**
 * Format attendance status to readable string
 */
export const formatAttendanceStatus = (status: AttendanceStatus): string => {
  const labels: Record<AttendanceStatus, string> = {
    'present': 'Present',
    'absent': 'Absent',
    'leave': 'Leave',
    'not-marked': 'Not Marked',
  };
  return labels[status];
};

/**
 * Get color code for attendance status
 */
export const getAttendanceColor = (status: AttendanceStatus): string => {
  const colors: Record<AttendanceStatus, string> = {
    'present': '#10b981', // Green
    'absent': '#ef4444',  // Red
    'leave': '#f59e0b',   // Amber/Yellow
    'not-marked': '#d1d5db', // Gray
  };
  return colors[status];
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency: string = 'AED'): string => {
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number): string => {
  return `${(value).toFixed(2)}%`;
};

/**
 * Get salary status badge color
 */
export const getSalaryStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'draft': '#6b7280',
    'calculated': '#3b82f6',
    'approved': '#10b981',
    'finalized': '#059669',
  };
  return colors[status] || '#9ca3af';
};

// ============================================================================
// VALIDATION & BUSINESS LOGIC
// ============================================================================

/**
 * Validate attendance record before saving
 */
export const validateAttendanceRecord = (record: Partial<DailyAttendance>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!record.employeeId) errors.push('Employee ID is required');
  if (!record.date) errors.push('Date is required');
  if (!record.status) errors.push('Attendance status is required');
  
  if (record.status === 'present' && !record.presentDayType) {
    errors.push('Day type is required for present status');
  }
  
  if (record.status === 'absent' && !record.absenceReason) {
    errors.push('Absence reason is required');
  }
  
  if (record.status === 'leave' && !record.leaveType) {
    errors.push('Leave type is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Check if an attendance record can be marked for a given date
 */
export const canMarkAttendance = (date: Date, currentDate: Date = new Date()): boolean => {
  // Allow marking for past dates and today, not for future dates
  return date <= currentDate;
};

/**
 * Get attendance marking deadline for a day
 * (Returns next possible date for marking if deadline has passed)
 */
export const getAttendanceMarkingDeadline = (
  dateToMark: Date,
  deadlineHour: number = 23
): { canMark: boolean; reason: string } => {
  const now = new Date();
  const deadline = new Date(dateToMark);
  deadline.setHours(deadlineHour, 59, 59);
  
  if (dateToMark > now) {
    return { canMark: false, reason: 'Cannot mark attendance for future dates' };
  }
  
  if (now > deadline) {
    return { canMark: false, reason: `Attendance marking deadline has passed for ${dateToMark.toDateString()}` };
  }
  
  return { canMark: true, reason: '' };
};

/**
 * Calculate attendance streak (consecutive present days)
 */
export const calculateAttendanceStreak = (dailyRecords: DailyAttendance[]): number => {
  // Sort by date descending (most recent first)
  const sorted = [...dailyRecords].sort((a, b) => {
    const dateA = timestampToDate(a.date).getTime();
    const dateB = timestampToDate(b.date).getTime();
    return dateB - dateA;
  });
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const record of sorted) {
    const recordDate = timestampToDate(record.date);
    recordDate.setHours(0, 0, 0, 0);
    
    // Check if consecutive
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - streak);
    
    // Skip weekends and holidays
    if (!isWorkingDay(recordDate)) continue;
    
    if (record.status === 'present' && isSameDay(recordDate, expectedDate)) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};
