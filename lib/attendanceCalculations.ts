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
 * Get number of working days in a month based on custom working days
 */
export const getWorkingDaysInMonth = (year: number, month: number, holidays: Date[] = [], workingDays: number[] = [1, 2, 3, 4, 5]): number => {
  let workingDaysCount = 0;
  const lastDay = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // Check if this day is in the working days array and not a holiday
    if (workingDays.includes(dayOfWeek) && !holidays.some(h => isSameDay(h, date))) {
      workingDaysCount++;
    }
  }
  
  return workingDaysCount;
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
// EMPLOYEE DETAIL STATISTICS (for daily view - matching calendar calculation)
// ============================================================================

/**
 * Calculate employee statistics from daily attendance records
 * This matches the logic in the daily attendance calendar view
 */
export const calculateEmployeeDetailStats = (
  dailyAttendanceRecords: DailyAttendance[],
  targetMonth?: { year: number; month: number }
): {
  present: number;
  presentCalculated: number;
  absent: number;
  paidLeave: number;
  unpaidLeave: number;
  notMarked: number;
  dailyDetails: Record<string, any>;
} => {
  const dailyDetails: Record<string, any> = {};
  
  let monthStr = '';
  if (targetMonth) {
    monthStr = `${targetMonth.year}-${String(targetMonth.month).padStart(2, '0')}`;
  }

  // Process all attendance records
  dailyAttendanceRecords.forEach(record => {
    const dateStr = typeof record.date === 'string' 
      ? record.date 
      : record.date instanceof Timestamp 
        ? `${record.date.toDate().getFullYear()}-${String(record.date.toDate().getMonth() + 1).padStart(2, '0')}-${String(record.date.toDate().getDate()).padStart(2, '0')}`
        : '';

    // Filter by month if specified
    if (monthStr && !dateStr.startsWith(monthStr)) {
      return;
    }

    // Skip 'not-marked' status
    if (record.status === 'not-marked') {
      return;
    }

    if (record.status === 'present') {
      const type = record.presentDayType || 'full';
      
      dailyDetails[dateStr] = {
        status: 'present',
        type: type,
        display: type === 'full' ? 'Full' : type === 'half' ? 'Half' : 'Quarter',
        multiplier: type === 'full' ? 1 : type === 'half' ? 0.5 : 0.25
      };
    } else if (record.status === 'absent') {
      dailyDetails[dateStr] = {
        status: 'absent',
        absenceReason: record.absenceReason,
        absenceType: record.absenceReason ? 'unpaid' : 'paid'
      };
    } else if (record.status === 'leave') {
      dailyDetails[dateStr] = {
        status: 'leave',
        leaveType: record.leaveType || 'paid',
        leaveReason: record.leaveReason
      };
    }
  });

  // Count by status
  const presentDaysCount = Object.values(dailyDetails).filter((d: any) => d.status === 'present').length;
  const absentDaysCount = Object.values(dailyDetails).filter((d: any) => d.status === 'absent').length;
  const paidLeaveDaysCount = Object.values(dailyDetails).filter((d: any) => d.status === 'leave' && d.leaveType === 'paid').length;
  const unpaidLeaveDaysCount = Object.values(dailyDetails).filter((d: any) => d.status === 'leave' && d.leaveType === 'unpaid').length;

  // Calculate total present days (with multipliers)
  let totalPresentDays = 0;
  Object.values(dailyDetails).forEach((d: any) => {
    if (d.status === 'present') {
      const mult = d.multiplier || 1;
      totalPresentDays += mult;
    }
  });
  totalPresentDays = Math.round(totalPresentDays * 100) / 100;

  return {
    present: presentDaysCount,
    presentCalculated: totalPresentDays,
    absent: absentDaysCount,
    paidLeave: paidLeaveDaysCount,
    unpaidLeave: unpaidLeaveDaysCount,
    notMarked: 0, // Not needed for this calculation
    dailyDetails: dailyDetails
  };
};

// ============================================================================
// MONTHLY ATTENDANCE CALCULATION
// ============================================================================

/**
 * Calculate monthly attendance summary from daily records
 * 
 * This matches the logic from calculateEmployeeStats in the daily attendance view
 * 
 * Calculation logic (NO filtering by holidays or working days):
 * - Present Days = Sum of full (1) + half (0.5) + quarter (0.25) day contributions
 * - Absent Days = Count of all absent records
 * - Paid Leave = Count of leave records with leaveType = 'paid'
 * - Unpaid Leave = Count of leave records with leaveType = 'unpaid'
 * - Not Marked Days = Count of working days with no records
 */
export const calculateMonthlyAttendanceSummary = (
  employeeId: string,
  year: number,
  month: number,
  dailyAttendanceRecords: DailyAttendance[],
  holidays: Date[] = [],
  calculatedBy: string = 'system',
  workingDays: number[] = [1, 2, 3, 4, 5]
): MonthlyAttendanceSummary => {
  const workingDaysInMonth = getWorkingDaysInMonth(year, month, holidays, workingDays);
  const daysInMonth = getDaysInMonth(year, month);
  
  let totalPresentDays = 0;
  let totalAbsentDays = 0;
  let totalAbsentPaidDays = 0;
  let totalAbsentUnpaidDays = 0;
  let totalPaidLeaveDays = 0;
  let totalUnpaidLeaveDays = 0;
  let totalNotMarkedDays = 0;
  
  const dailyDetails: Record<string, any> = {};
  
  // Process all marked records (ignore holidays, ignore working day status)
  dailyAttendanceRecords.forEach(record => {
    if (record.status === 'not-marked') {
      return;
    }
    
    const dateStr = typeof record.date === 'string'
      ? record.date
      : record.date instanceof Timestamp
        ? `${record.date.toDate().getFullYear()}-${String(record.date.toDate().getMonth() + 1).padStart(2, '0')}-${String(record.date.toDate().getDate()).padStart(2, '0')}`
        : '';

    if (record.status === 'present') {
      const type = record.presentDayType || 'full';
      dailyDetails[dateStr] = {
        status: 'present',
        type: type,
        multiplier: type === 'full' ? 1 : type === 'half' ? 0.5 : type === 'quarter' ? 0.25 : 1
      };
    } else if (record.status === 'absent') {
      const absenceType = record.absenceType || 'unpaid';
      dailyDetails[dateStr] = {
        status: 'absent',
        absenceType: absenceType
      };
    } else if (record.status === 'leave') {
      dailyDetails[dateStr] = {
        status: 'leave',
        leaveType: record.leaveType || 'paid'
      };
    }
  });

  // Count records by status
  const presentRecords = Object.values(dailyDetails).filter((d: any) => d.status === 'present');
  const absentRecords = Object.values(dailyDetails).filter((d: any) => d.status === 'absent');
  const leaveRecordsMap = Object.entries(dailyDetails).filter((entry: any) => entry[1].status === 'leave');
  
  totalAbsentDays = absentRecords.length;
  
  // Separate absent by type
  absentRecords.forEach((absent: any) => {
    if (absent.absenceType === 'paid') {
      totalAbsentPaidDays++;
    } else {
      totalAbsentUnpaidDays++;
    }
  });
  
  // Separate leave by type - EXCLUDING auto-marked week-offs (non-working days)
  leaveRecordsMap.forEach((entry: any) => {
    const dateStr = entry[0];
    const leave = entry[1];
    
    // Parse the date string to check if it's a working day
    const [dateYear, dateMonth, dateDay] = dateStr.split('-').map(Number);
    const leaveDate = new Date(dateYear, dateMonth - 1, dateDay);
    const dayOfWeek = leaveDate.getDay();
    const isWorkingDay = workingDays.includes(dayOfWeek);
    const isHoliday = holidays.some(h => isSameDay(h, leaveDate));
    
    // Only count as paid/unpaid leave if it's on a working day (not auto-marked week-off)
    if (isWorkingDay && !isHoliday) {
      if (leave.leaveType === 'paid') {
        totalPaidLeaveDays++;
      } else {
        totalUnpaidLeaveDays++;
      }
    }
  });
  
  // Calculate present days with multipliers
  presentRecords.forEach((present: any) => {
    totalPresentDays += present.multiplier || 1;
  });
  totalPresentDays = Math.round(totalPresentDays * 100) / 100;
  
  // Calculate not-marked days for working days only
  daysInMonth.forEach(date => {
    const dayOfWeek = date.getDay();
    const isWorkingDay = workingDays.includes(dayOfWeek) && !holidays.some(h => isSameDay(h, date));
    
    if (!isWorkingDay) {
      return; // Skip non-working days/weekends/holidays
    }
    
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Check if there's a record for this day
    if (!dailyDetails[dateStr]) {
      totalNotMarkedDays++;
    }
  });
  
  // Calculate payable days
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
    totalAbsentPaidDays,
    totalAbsentUnpaidDays,
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
  
  // Calculate per day salary based on total days in the month, not working days
  const totalDaysInMonth = getDaysInMonth(year, month).length;
  const perDaySalary = totalDaysInMonth > 0 ? grossSalary / totalDaysInMonth : 0;
  
  // Get payable and deductible days
  const presentDays = monthlyAttendanceSummary.totalPresentDays;
  const paidLeaveDays = monthlyAttendanceSummary.totalPaidLeaveDays;
  const absentPaidDays = monthlyAttendanceSummary.totalAbsentPaidDays;
  const absentDays = monthlyAttendanceSummary.totalAbsentDays;
  const unpaidLeaveDays = monthlyAttendanceSummary.totalUnpaidLeaveDays;
  
  // Payable days include: Present + Paid Leave + Absent Paid
  const totalPayableDays = presentDays + paidLeaveDays + absentPaidDays;
  
  // Calculate deductions based on unpaid absences and unpaid leaves only
  const totalDeductionDays = (absentDays - absentPaidDays) + unpaidLeaveDays;
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

/**
 * Generate attendance records for week-off days (paid leave)
 * This function returns records that should be created for week-off days
 */
export const generateWeekOffPaidLeaveRecords = (
  employeeIds: string[],
  newWorkingDays: number[],
  monthsToProcess: Array<{ year: number; month: number }>
): Partial<DailyAttendance>[] => {
  const records: Partial<DailyAttendance>[] = [];
  const allDaysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sun-Sat
  const weekOffDays = allDaysOfWeek.filter(day => !newWorkingDays.includes(day));
  
  if (weekOffDays.length === 0) return records;

  for (const targetMonth of monthsToProcess) {
    const targetYear = targetMonth.year;
    const targetMonthNum = targetMonth.month;
    const targetDaysInMonth = new Date(targetYear, targetMonthNum, 0).getDate();

    for (let day = 1; day <= targetDaysInMonth; day++) {
      const date = new Date(targetYear, targetMonthNum - 1, day);
      const dayOfWeek = date.getDay();

      if (!weekOffDays.includes(dayOfWeek)) continue;

      const dateStr = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      for (const empId of employeeIds) {
        records.push({
          employeeId: empId,
          date: dateStr as any, // Stored as YYYY-MM-DD string
          status: 'leave' as AttendanceStatus,
          leaveType: 'paid',
          leaveReason: 'Company Week-off',
          markedAt: Timestamp.now(),
          markedBy: 'system',
        });
      }
    }
  }

  return records;
};
