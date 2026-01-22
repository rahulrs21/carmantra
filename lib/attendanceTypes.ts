/**
 * Advanced Attendance & Salary Management Types
 * Comprehensive type definitions for attendance tracking and salary calculations
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// ATTENDANCE TYPES
// ============================================================================

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'not-marked';

export type PresentDayType = 'full' | 'half' | 'quarter';

export type LeaveType = 'paid' | 'unpaid';

export type AbsenceReason = 
  | 'sick-leave' 
  | 'personal-reasons' 
  | 'emergency' 
  | 'unauthorized' 
  | 'other';

/**
 * Daily Attendance Record
 * One record per employee per day
 */
export interface DailyAttendance {
  id: string;
  employeeId: string;
  date: Timestamp; // YYYY-MM-DD as Timestamp
  status: AttendanceStatus;
  
  // For Present status
  presentDayType?: PresentDayType; // 'full' (1.0), 'half' (0.5), 'quarter' (0.25)
  
  // For Absent status
  absenceReason?: AbsenceReason;
  absenceType?: 'paid' | 'unpaid'; // Type of absence (paid or unpaid)
  absenceNote?: string; // Optional additional text
  
  // For Leave status
  leaveType?: LeaveType; // 'paid' or 'unpaid'
  leaveReason?: string; // Optional reason
  
  // Metadata
  markedAt: Timestamp;
  markedBy: string; // Admin/Manager ID
  lastModified?: Timestamp;
  lastModifiedBy?: string;
  
  // Metadata for calculations
  workingDayContribution?: number; // 1.0, 0.5, 0.25, or 0 (calculated)
  isWeekend?: boolean;
  isHoliday?: boolean;
}

/**
 * Monthly Attendance Summary (Per Employee)
 * Pre-calculated summary for performance
 */
export interface MonthlyAttendanceSummary {
  id: string;
  employeeId: string;
  year: number;
  month: number; // 1-12
  
  // Day counts
  totalWorkingDays: number; // Excluding weekends & holidays
  totalPresentDays: number; // Sum of day contributions (1.0, 0.5, 0.25)
  totalAbsentDays: number; // Count of absence entries (total)
  totalAbsentPaidDays: number; // Paid absent days
  totalAbsentUnpaidDays: number; // Unpaid absent days
  totalPaidLeaveDays: number;
  totalUnpaidLeaveDays: number;
  totalNotMarkedDays: number;
  
  // Final calculation
  totalPayableDays: number; // workingDays - unpaidLeave - absent
  attendancePercentage: number; // (totalPresentDays / totalWorkingDays) * 100
  
  // Associated salary
  salaryBreakdown?: SalaryBreakdown;
  
  // Metadata
  calculatedAt: Timestamp;
  calculatedBy: string;
  status: 'completed' | 'pending' | 'processing';
  notes?: string;
}

/**
 * Salary Breakdown (Per Month)
 * Detailed salary calculation for a specific month
 */
export interface SalaryBreakdown {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  
  // Base calculation
  grossSalary: number; // Employee's monthly salary
  workingDaysInMonth: number;
  perDaySalary: number; // grossSalary / workingDaysInMonth
  
  // Payable days breakdown
  presentDays: number;
  paidLeaveDays: number;
  totalPayableDays: number;
  
  // Deductions
  absentDays: number;
  unpaidLeaveDays: number;
  deductionPerDay: number; // perDaySalary
  totalDeductions: number; // (absentDays + unpaidLeaveDays) * deductionPerDay
  
  // Final salary
  netSalary: number; // grossSalary - totalDeductions
  
  // Breakdown details
  breakdown: {
    presentDaysAmount: number;
    paidLeaveDaysAmount: number;
    absentDaysDeduction: number;
    unpaidLeaveDaysDeduction: number;
  };
  
  // Metadata
  calculatedAt: Timestamp;
  calculatedBy: string;
  approvedAt?: Timestamp;
  approvedBy?: string;
  status: 'draft' | 'calculated' | 'approved' | 'finalized';
  remarks?: string;
}

/**
 * Attendance Settings (System-wide)
 * Configuration for attendance rules
 */
export interface AttendanceSettings {
  id?: string;
  workingDaysPerWeek?: number[]; // [1,2,3,4,5] for Mon-Fri
  workingDays?: number[]; // e.g., [1, 2, 3, 4, 5] for Monday-Friday
  holidays?: Array<{
    date: string; // YYYY-MM-DD format
    name: string;
    type?: 'government' | 'company';
  }>;
  holidayDates?: string[]; // Array of YYYY-MM-DD dates
  defaultWorkingDaysPerMonth?: number;
  requireAbsenceReasonAfterDays?: number; // After X absent days
  attendanceMarkingDeadline?: string; // Time like "23:59:59"
  weekendDays?: string[]; // e.g., ["Saturday", "Sunday"]
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
  companyId?: string;
}

/**
 * Bulk Attendance Record (for efficient bulk marking)
 * Used for marking multiple employees at once
 */
export interface BulkAttendanceRequest {
  date: Timestamp;
  attendanceRecords: Array<{
    employeeId: string;
    status: AttendanceStatus;
    presentDayType?: PresentDayType;
    absenceReason?: AbsenceReason;
    absenceNote?: string;
    leaveType?: LeaveType;
    leaveReason?: string;
  }>;
  markedBy: string;
  markedAt: Timestamp;
}

/**
 * Attendance Statistics (for reporting)
 */
export interface AttendanceStatistics {
  employeeId: string;
  totalMarked: number;
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
  totalNotMarked: number;
  attendanceRate: number;
  averageDayContribution: number;
}

// ============================================================================
// COMBINED INTERFACES FOR UI
// ============================================================================

/**
 * Employee with Attendance for Daily View
 * Used in the daily attendance marking interface
 */
export interface EmployeeWithAttendance {
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    salary: number;
  };
  todayAttendance?: DailyAttendance;
  monthlyAttendance?: MonthlyAttendanceSummary;
  salaryBreakdown?: SalaryBreakdown;
}

/**
 * Attendance UI State
 * For component state management
 */
export interface AttendanceUIState {
  selectedDate: Date;
  selectedMonth: number;
  selectedYear: number;
  viewMode: 'daily' | 'monthly';
  filterDepartment?: string;
  filterStatus?: AttendanceStatus;
  bulkAction?: 'mark-present' | 'mark-absent' | 'mark-leave' | null;
  selectedEmployees: string[]; // Employee IDs for bulk actions
}

/**
 * Holiday Configuration
 */
export interface Holiday {
  id: string;
  date: Timestamp;
  name: string;
  type: 'national' | 'company' | 'regional';
  createdAt: Timestamp;
  createdBy: string;
}

