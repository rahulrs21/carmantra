"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, Timestamp, addDoc, updateDoc } from 'firebase/firestore';
import { Employee } from '@/lib/types';
import { DailyAttendance, AttendanceStatus, PresentDayType, AbsenceReason, AttendanceSettings } from '@/lib/attendanceTypes';
import { useUser } from '@/lib/userContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Calendar, 
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  AlertCircle,
  Check,
  X as XIcon,
  XCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { 
  getAttendanceColor, 
  formatAttendanceStatus,
} from '@/lib/attendanceCalculations';
import { ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';

// Status options
const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present', label: '✓ Present', color: 'bg-green-50 hover:bg-green-100 border-green-300' },
  { value: 'absent', label: '✗ Absent', color: 'bg-red-50 hover:bg-red-100 border-red-300' },
  { value: 'leave', label: '📋 Leave', color: 'bg-amber-50 hover:bg-amber-100 border-amber-300' },
  { value: 'not-marked', label: '— Not Marked', color: 'bg-gray-50 hover:bg-gray-100 border-gray-300' },
];

const dayTypeOptions: { value: PresentDayType; label: string }[] = [
  { value: 'full', label: 'Full Day (1.0)' },
  { value: 'half', label: 'Half Day (0.5)' },
  { value: 'quarter', label: 'Quarter Day (0.25)' },
];

interface BulkMarkData {
  status: AttendanceStatus;
  dayType?: PresentDayType;
  reason?: string;
}

export default function AttendancePage() {
  const router = useRouter();
  const { role: currentRole } = useUser();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Attendance state
  const [attendance, setAttendance] = useState<Record<string, any>>({});
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [bulkMarkData, setBulkMarkData] = useState<BulkMarkData | null>(null);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [markStatus, setMarkStatus] = useState<AttendanceStatus | ''>('');
  const [markReason, setMarkReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reasonDialogEmployee, setReasonDialogEmployee] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');
  const [showLeaveReasonDialog, setShowLeaveReasonDialog] = useState(false);
  const [leaveReasonEmployee, setLeaveReasonEmployee] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveType, setLeaveType] = useState<'paid' | 'unpaid'>('paid');
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string }>>([]);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<Employee | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [detailViewMonth, setDetailViewMonth] = useState<Date>(new Date());
  const [hoveredDateDetails, setHoveredDateDetails] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedParticularDates, setSelectedParticularDates] = useState<Set<string>>(new Set());
  const [showAttendanceTypeDialog, setShowAttendanceTypeDialog] = useState(false);
  const [attendanceTypeEmployee, setAttendanceTypeEmployee] = useState('');
  const [selectedAttendanceType, setSelectedAttendanceType] = useState<PresentDayType>('full');
  const [employeeStats, setEmployeeStats] = useState<Record<string, any>>({});
  
  // Settings state
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>({
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday by default
    holidays: [],
    weekendDays: ['Saturday', 'Sunday'],
  });
  const [showSettings, setShowSettings] = useState(false);
  const [tempWorkingDays, setTempWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [tempHolidays, setTempHolidays] = useState<Array<{ date: string; name: string; type: 'government' | 'company' }>>([]);
  const [newHolidayDateSettings, setNewHolidayDateSettings] = useState('');
  const [newHolidayNameSettings, setNewHolidayNameSettings] = useState('');
  const [newHolidayTypeSettings, setNewHolidayTypeSettings] = useState<'government' | 'company'>('government');

  const isAuthorized = currentRole === 'admin' || currentRole === 'manager';

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const q = query(collection(db, 'employees'), where('status', '==', 'active'));
        const snapshot = await getDocs(q);
        const employeeList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];

        employeeList.sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(employeeList);

        // Extract departments
        const depts = Array.from(new Set(employeeList.map(e => e.department))).sort() as string[];
        setDepartments(depts);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch attendance settings
  useEffect(() => {
    const fetchAttendanceSettings = async () => {
      try {
        const q = query(collection(db, 'attendanceSettings'));
        const snapshot = await getDocs(q);
        if (snapshot.docs.length > 0) {
          const settingsDoc = snapshot.docs[0].data() as AttendanceSettings;
          setAttendanceSettings(settingsDoc);
          setTempWorkingDays(settingsDoc.workingDays || [1, 2, 3, 4, 5]);
          setTempHolidays((settingsDoc.holidays || []).map(h => ({ ...h, type: h.type || 'government' })));
        }
      } catch (error) {
        console.error('Error fetching attendance settings:', error);
      }
    };
    fetchAttendanceSettings();
  }, []);

  // Fetch attendance for selected date
  useEffect(() => {
    const fetchAttendanceForDate = async () => {
      try {
        const dateStr = getDateStr(selectedDate);
        const q = query(
          collection(db, 'dailyAttendance'),
          where('date', '==', dateStr)
        );
        const snapshot = await getDocs(q);
        const records: Record<string, DailyAttendance> = {};

        snapshot.docs.forEach(doc => {
          const data = doc.data() as DailyAttendance;
          records[data.employeeId] = data;
        });

        setAttendance(records);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    };

    fetchAttendanceForDate();
  }, [selectedDate]);

  // Calculate stats when employee detail is shown or month changes
  useEffect(() => {
    if (showEmployeeDetail && selectedEmployeeDetail?.id) {
      calculateEmployeeStats(selectedEmployeeDetail.id, detailViewMonth);
    }
  }, [showEmployeeDetail, selectedEmployeeDetail?.id, detailViewMonth]);

  const getDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Check if a date is a working day
  const isWorkingDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return (attendanceSettings.workingDays || [1, 2, 3, 4, 5]).includes(dayOfWeek);
  };

  // Check if a date is a holiday
  const isHoliday = (date: Date): boolean => {
    const dateStr = getDateStr(date);
    return (attendanceSettings.holidays || []).some(h => h.date === dateStr);
  };

  // Get holiday name if exists
  const getHolidayName = (date: Date): string | undefined => {
    const dateStr = getDateStr(date);
    return (attendanceSettings.holidays || []).find(h => h.date === dateStr)?.name;
  };

  // Save attendance settings
  const saveAttendanceSettings = async () => {
    try {
      const settingsData = {
        workingDays: tempWorkingDays,
        holidays: tempHolidays,
        weekendDays: attendanceSettings.weekendDays,
        updatedAt: Timestamp.now(),
      };

      const q = query(collection(db, 'attendanceSettings'));
      const snapshot = await getDocs(q);

      if (snapshot.docs.length > 0) {
        // Update existing
        await updateDoc(doc(db, 'attendanceSettings', snapshot.docs[0].id), settingsData as any);
      } else {
        // Create new
        await addDoc(collection(db, 'attendanceSettings'), settingsData);
      }

      setAttendanceSettings(settingsData);
      setShowSettings(false);
      toast.success('Attendance settings saved successfully');
    } catch (error) {
      console.error('Error saving attendance settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Mark attendance
  const handleMarkAttendance = async (empId: string, status: AttendanceStatus, reason = '', presentDayType: PresentDayType = 'full', leaveTypeParam: 'paid' | 'unpaid' = 'paid') => {
    if (!isAuthorized) {
      toast.error('You do not have permission to mark attendance');
      return;
    }

    try {
      const dateStr = getDateStr(selectedDate);
      const existing = attendance[empId];

      if (existing && existing.status === status && existing.presentDayType === presentDayType) {
        // Clear if same status clicked
        if (existing.id) {
          await updateDoc(doc(db, 'dailyAttendance', existing.id), { status: 'not-marked', markedAt: Timestamp.now() });
        }
        const newAttendance = { ...attendance };
        delete newAttendance[empId];
        setAttendance(newAttendance);
        toast.success('Attendance cleared');
      } else {
        // Set new status
        if (existing && existing.id) {
          await updateDoc(doc(db, 'dailyAttendance', existing.id), {
            status,
            absenceReason: status === 'absent' ? reason : undefined,
            leaveReason: status === 'leave' ? reason : undefined,
            presentDayType: status === 'present' ? presentDayType : undefined,
            markedAt: Timestamp.now(),
          });
        } else {
          const docData: any = {
            employeeId: empId,
            date: dateStr,
            status,
            markedAt: Timestamp.now(),
            markedBy: 'admin',
          };
          if (status === 'absent') {
            if (reason) docData.absenceReason = reason;
          }
          if (status === 'present') docData.presentDayType = presentDayType;
          if (status === 'leave') {
            docData.leaveType = leaveTypeParam;
            if (reason) docData.leaveReason = reason;
          }
          const newDoc = await addDoc(collection(db, 'dailyAttendance'), docData);
        }

        setAttendance(prev => ({
          ...prev,
          [empId]: {
            id: existing?.id,
            employeeId: empId,
            date: dateStr,
            status,
            absenceReason: status === 'absent' ? reason : undefined,
            leaveReason: status === 'leave' ? reason : undefined,
            leaveType: status === 'leave' ? leaveTypeParam : undefined,
            presentDayType: status === 'present' ? presentDayType : undefined,
            markedAt: Timestamp.now(),
            markedBy: 'admin',
          },
        }));

        const typeLabel = presentDayType === 'full' ? '(Full)' : presentDayType === 'half' ? '(Half)' : '(Quarter)';
        toast.success(`Marked as ${status} ${status === 'present' ? typeLabel : ''}`);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  // Bulk mark attendance
  const handleBulkMark = async () => {
    if (selectedEmployees.size === 0 || !markStatus) {
      toast.error('Please select employees and status');
      return;
    }

    try {
      setSaving(true);
      const dateStr = getDateStr(selectedDate);

      for (const empId of Array.from(selectedEmployees)) {
        const existing = attendance[empId];
        
        if (existing && existing.id) {
          await updateDoc(doc(db, 'dailyAttendance', existing.id), {
            status: markStatus,
            absenceReason: markStatus === 'absent' ? markReason : undefined,
            markedAt: Timestamp.now(),
          });
        } else {
          const docData: any = {
            employeeId: empId,
            date: dateStr,
            status: markStatus,
            markedAt: Timestamp.now(),
            markedBy: 'admin',
          };
          if (markStatus === 'absent' && markReason) docData.absenceReason = markReason;
          if (markStatus === 'present') docData.presentDayType = 'full';
          if (markStatus === 'leave') docData.leaveType = 'paid';
          await addDoc(collection(db, 'dailyAttendance'), docData);
        }

        setAttendance(prev => ({
          ...prev,
          [empId]: {
            id: existing?.id,
            employeeId: empId,
            date: dateStr,
            status: markStatus,
            absenceReason: markStatus === 'absent' ? markReason : undefined,
            markedAt: Timestamp.now(),
            markedBy: 'admin',
          },
        }));
      }

      toast.success(`Marked ${selectedEmployees.size} employee(s) as ${markStatus}`);
      setSelectedEmployees(new Set());
      setMarkStatus('');
      setMarkReason('');
    } catch (error) {
      console.error('Error bulk marking:', error);
      toast.error('Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = filterDept === 'all' 
    ? employees 
    : employees.filter(e => e.department === filterDept);

  const getTodayStats = () => {
    let present = 0, absent = 0, leave = 0, notMarked = 0;

    employees.forEach(emp => {
      const att = attendance[emp.id || ''];
      if (!att || att.status === 'not-marked') {
        notMarked++;
      } else if (att.status === 'present') {
        present++;
      } else if (att.status === 'absent') {
        absent++;
      } else if (att.status === 'leave') {
        leave++;
      }
    });

    return { present, absent, leave, notMarked };
  };

  // Helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'text-green-600 bg-green-50';
      case 'absent':
        return 'text-red-600 bg-red-50';
      case 'leave':
        return 'text-yellow-600 bg-yellow-50';
      case 'holiday':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleMarkAttendanceForEmployee = async (employeeId: string, dateStr: string, status: string, reason: string = '') => {
    if (!isAuthorized) {
      toast.error('You do not have permission to mark attendance');
      return;
    }

    try {
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('employeeId', '==', employeeId),
        where('date', '==', dateStr)
      );

      const querySnapshot = await getDocs(q);
      const monthKey = dateStr.substring(0, 7);
      const key = `${employeeId}-${dateStr}`;
      const currentStatus = attendance[key]?.status;

      // Toggle: if clicking same button, deselect
      if (currentStatus === status) {
        if (!querySnapshot.empty) {
          // Delete the record
          querySnapshot.docs.forEach(async (docSnap) => {
            await updateDoc(docSnap.ref, {
              status: '',
              reason: '',
              timestamp: Timestamp.now()
            });
          });
        }

        setAttendance(prev => {
          const newAttendance = { ...prev };
          delete newAttendance[key];
          return newAttendance;
        });

        toast.success('Attendance cleared');
      } else {
        // Set new status
        if (querySnapshot.empty) {
          // Create new record
          const docData: any = {
            employeeId,
            date: dateStr,
            month: monthKey,
            status,
            timestamp: Timestamp.now()
          };
          if (reason) docData.reason = reason;
          await addDoc(attendanceRef, docData);
        } else {
          // Update existing record
          querySnapshot.docs.forEach(async (docSnap) => {
            await updateDoc(docSnap.ref, {
              status,
              reason: reason,
              timestamp: Timestamp.now()
            });
          });
        }

        setAttendance(prev => ({
          ...prev,
          [key]: { status, reason }
        }));

        toast.success(`Marked as ${status.charAt(0).toUpperCase() + status.slice(1)}`);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  const isDateInRange = (date: Date): boolean => {
    if (!selectedDateRange.start || !selectedDateRange.end) return false;

    const start = new Date(selectedDateRange.start);
    const end = new Date(selectedDateRange.end);
    const checkDate = new Date(date);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate >= start && checkDate <= end;
  };

  const isDateSelected = (dateStr: string): boolean => {
    return selectedParticularDates.has(dateStr);
  };

  const handleCalendarDayClick = (dateStr: string, event: React.MouseEvent) => {
    const clickedDate = new Date(dateStr + 'T00:00:00');

    if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
      // Ctrl+Click or Cmd+Click to select particular dates
      const newSelected = new Set(selectedParticularDates);
      if (newSelected.has(dateStr)) {
        newSelected.delete(dateStr);
      } else {
        newSelected.add(dateStr);
      }
      setSelectedParticularDates(newSelected);
    } else if (event.shiftKey && selectedDateRange.start) {
      // Shift+Click to select range
      const start = new Date(selectedDateRange.start);
      const end = new Date(clickedDate);

      if (end < start) {
        setSelectedDateRange({ start: end, end: start });
      } else {
        setSelectedDateRange({ start, end });
      }
      // Clear particular dates when using range
      setSelectedParticularDates(new Set());
    } else if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
      // Regular click - start new selection
      setSelectedDateRange({ start: clickedDate, end: null });
      setSelectedDate(clickedDate);
      setSelectedParticularDates(new Set());
    }
  };

  const getTodayAttendanceSummary = () => {
    const dateStr = getDateStr(selectedDate);
    let present = 0, absent = 0, leave = 0;

    employees.forEach(emp => {
      const attendanceKey = `${emp.id}-${dateStr}`;
      const att = attendance[attendanceKey];
      if (att) {
        if (att.status === 'present') present++;
        else if (att.status === 'absent') absent++;
        else if (att.status === 'leave') leave++;
      }
    });

    return { present, absent, leave, total: employees.length };
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await addDoc(collection(db, 'holidays'), {
        date: newHolidayDate,
        name: newHolidayName,
      });
      setHolidays([...holidays, { date: newHolidayDate, name: newHolidayName }]);
      setNewHolidayDate('');
      setNewHolidayName('');
      setShowHolidayForm(false);
      toast.success('Holiday added');
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error('Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (dateToDelete: string) => {
    try {
      const q = query(collection(db, 'holidays'), where('date', '==', dateToDelete));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Using updateDoc to 'delete' by removing the document - actually you should use deleteDoc
        // For now, just filter from local state
      }
      setHolidays(holidays.filter(h => h.date !== dateToDelete));
      toast.success('Holiday removed');
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to remove holiday');
    }
  };

  // Unified bulk marking function for all scenarios
  const handleBulkMarkAttendance = async (datesToMark: string[]) => {
    if (!selectedEmployees.size || !markStatus) {
      toast.error('Please select employees and status');
      return;
    }

    if (!isAuthorized) {
      toast.error('You do not have permission to mark attendance');
      return;
    }

    try {
      let count = 0;

      for (const dateStr of datesToMark) {
        const monthKey = dateStr.substring(0, 7);

        for (const empId of Array.from(selectedEmployees)) {
          const attendanceRef = collection(db, 'attendance');
          const q = query(
            attendanceRef,
            where('employeeId', '==', empId),
            where('date', '==', dateStr)
          );

          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            const docData: any = {
              employeeId: empId,
              date: dateStr,
              month: monthKey,
              status: markStatus,
              timestamp: Timestamp.now()
            };
            if (markReason) docData.reason = markReason;
            await addDoc(attendanceRef, docData);
          } else {
            querySnapshot.docs.forEach(async (docSnap) => {
              await updateDoc(docSnap.ref, {
                status: markStatus,
                reason: markReason || '',
                timestamp: Timestamp.now()
              });
            });
          }

          setAttendance(prev => ({
            ...prev,
            [`${empId}-${dateStr}`]: { status: markStatus, reason: markReason || '' }
          }));

          count++;
        }
      }

      const typeLabel = selectedParticularDates.size > 0 ? 'particular dates' : 'days';
      toast.success(`Marked ${selectedEmployees.size} employee(s) × ${datesToMark.length} ${typeLabel} = ${count} record(s)`);
      
      // Clear selections
      setSelectedEmployees(new Set());
      setSelectedDateRange({ start: null, end: null });
      setSelectedParticularDates(new Set());
      setMarkStatus('');
      setMarkReason('');
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  // Calculate employee attendance statistics
  const calculateEmployeeStats = async (employeeId: string, month?: Date) => {
    try {
      const targetMonth = month || detailViewMonth;
      const monthStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
      
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      const dailyDetails: Record<string, any> = {};

      // Count present days with type multiplier
      const presentQuery = query(
        collection(db, 'dailyAttendance'),
        where('employeeId', '==', employeeId),
        where('status', '==', 'present')
      );
      const presentSnapshot = await getDocs(presentQuery);
      presentSnapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        const dateStr = data.date as string;
        // Filter by month
        if (dateStr && dateStr.startsWith(monthStr)) {
          const type = data.presentDayType || 'full';
          const multiplier = type === 'full' ? 1 : type === 'half' ? 0.5 : 0.25;
          presentDays += multiplier;
          dailyDetails[dateStr] = {
            status: 'present',
            type: type,
            display: type === 'full' ? 'Full' : type === 'half' ? 'Half' : 'Quarter'
          };
        }
      });

      // Count absent days
      const absentQuery = query(
        collection(db, 'dailyAttendance'),
        where('employeeId', '==', employeeId),
        where('status', '==', 'absent')
      );
      const absentSnapshot = await getDocs(absentQuery);
      absentSnapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        const dateStr = data.date as string;
        if (dateStr && dateStr.startsWith(monthStr)) {
          absentDays++;
          dailyDetails[dateStr] = {
            status: 'absent',
            reason: data.absenceReason || 'N/A'
          };
        }
      });

      // Count leave days
      const leaveQuery = query(
        collection(db, 'dailyAttendance'),
        where('employeeId', '==', employeeId),
        where('status', '==', 'leave')
      );
      const leaveSnapshot = await getDocs(leaveQuery);
      leaveSnapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        const dateStr = data.date as string;
        if (dateStr && dateStr.startsWith(monthStr)) {
          leaveDays++;
          dailyDetails[dateStr] = {
            status: 'leave'
          };
        }
      });

      setEmployeeStats(prev => ({
        ...prev,
        [employeeId]: {
          present: Math.round(presentDays * 100) / 100,
          absent: absentDays,
          leave: leaveDays,
          dailyDetails: dailyDetails
        }
      }));
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You don&apos;t have permission to access this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = getTodayStats();


  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const q = query(collection(db, 'holidays'));
        const snapshot = await getDocs(q);
        const holidayList = snapshot.docs.map(doc => doc.data()) as Array<{ date: string; name: string }>;
        setHolidays(holidayList);
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    };
    fetchHolidays();
  }, []);



  return (
    <ModuleAccessComponent module={ModuleAccess.ATTENDANCE}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
              <Calendar className="w-8 h-8 text-orange-600" />
              Daily Attendance
            </h1>
            <p className="text-sm text-gray-500 mt-1">Mark and manage employee attendance</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <div className="text-center px-2 py-2 rounded-lg bg-green-50 border border-green-200">
              <p className="text-green-600 font-bold text-lg">{stats.present}</p>
              <p className="text-xs text-green-700 whitespace-nowrap">Present</p>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-red-50 border border-red-200">
              <p className="text-red-600 font-bold text-lg">{stats.absent}</p>
              <p className="text-xs text-red-700 whitespace-nowrap">Absent</p>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-yellow-600 font-bold text-lg">{stats.leave}</p>
              <p className="text-xs text-yellow-700 whitespace-nowrap">Leave</p>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-gray-600 font-bold text-lg">{stats.notMarked}</p>
              <p className="text-xs text-gray-700 whitespace-nowrap">Pending</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <input
                type="date"
                value={getDateStr(selectedDate)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            </div>

            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-full sm:w-48">
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
        </div>

        {/* Bulk Mark Card */}
        {selectedEmployees.size > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">
                ✓ {selectedEmployees.size} employee(s) selected
              </p>
              <Button
                onClick={() => setSelectedEmployees(new Set())}
                variant="outline"
                size="sm"
              >
                Clear Selection
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Select value={markStatus || ''} onValueChange={(value) => setMarkStatus(value as AttendanceStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">✓ Present</SelectItem>
                  <SelectItem value="absent">✗ Absent</SelectItem>
                  <SelectItem value="leave">📋 Leave</SelectItem>
                </SelectContent>
              </Select>

              {markStatus === 'absent' && (
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={markReason}
                  onChange={(e) => setMarkReason(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              <Button
                onClick={() => {
                  setSelectedEmployees(new Set());
                  setMarkStatus('');
                  setMarkReason('');
                }}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Cancel
              </Button>

              <Button
                onClick={handleBulkMark}
                disabled={!markStatus || saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Check className="w-4 h-4 mr-2" />
                {saving ? 'Marking...' : 'Mark All'}
              </Button>
            </div>
          </div>
        )}

        {/* Employees Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading employees...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No employees found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees(new Set(filteredEmployees.map(e => e.id || '')));
                          } else {
                            setSelectedEmployees(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Department</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Notes</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">View</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp, idx) => {
                    const att = attendance[emp.id || ''];
                    const status = att?.status || 'not-marked';

                    return (
                      <tr key={emp.id} className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.has(emp.id || '')}
                            onChange={(e) => {
                              const newSelected = new Set(selectedEmployees);
                              if (e.target.checked) {
                                newSelected.add(emp.id || '');
                              } else {
                                newSelected.delete(emp.id || '');
                              }
                              setSelectedEmployees(newSelected);
                            }}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.position}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{emp.department}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              onClick={() => {
                                setAttendanceTypeEmployee(emp.id!);
                                setSelectedAttendanceType('full');
                                setShowAttendanceTypeDialog(true);
                              }}
                              size="sm"
                              title="Present"
                              className={`${status === 'present' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-200 hover:bg-gray-300'} text-white`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>

                            <Button
                              onClick={() => {
                                setReasonDialogEmployee(emp.id!);
                                setAbsenceReason(att?.absenceReason || '');
                                setShowReasonDialog(true);
                              }}
                              size="sm"
                              title="Absent"
                              className={`${status === 'absent' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-200 hover:bg-gray-300'} text-white`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>

                            <Button
                              onClick={() => {
                                setLeaveReasonEmployee(emp.id!);
                                setLeaveReason(att?.leaveReason || '');
                                setShowLeaveReasonDialog(true);
                              }}
                              size="sm"
                              title="Leave"
                              className={`${status === 'leave' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-200 hover:bg-gray-300'} text-white`}
                            >
                              <AlertCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {att?.absenceReason ? (
                            <span className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded-full">
                              {att.absenceReason}
                            </span>
                          ) : att?.leaveReason ? (
                            <span className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded-full">
                              {att.leaveReason}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            onClick={() => {
                              setSelectedEmployeeDetail(emp);
                              setShowEmployeeDetail(true);
                            }}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={() => window.open('/admin/employees/attendance/monthly', '_blank')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            📊 Monthly Attendance & Salary Report
          </Button>
          <Button
            onClick={() => {
              setTempWorkingDays(attendanceSettings.workingDays || [1, 2, 3, 4, 5]);
              setTempHolidays((attendanceSettings.holidays || []).map(h => ({ ...h, type: h.type || 'government' })));
              setShowSettings(true);
            }}
            variant="outline"
            className="border-blue-300 hover:bg-blue-50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Attendance Settings
          </Button>
          {/* <Button
            onClick={() => setShowHolidayForm(true)}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Manage Holidays
          </Button> */}
        </div>
      </div>

      {/* Attendance Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm sm:max-w-2xl p-4 sm:p-6 space-y-4 my-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-lg sm:text-xl text-gray-800">Attendance Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <XIcon className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
            </div>

            {/* Working Days Selection */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-800">Working Days of Week</h4>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayOfWeek) => (
                  <label
                    key={dayOfWeek}
                    className={`flex items-center justify-center p-2 sm:p-3 rounded-lg border cursor-pointer transition ${
                      tempWorkingDays.includes(dayOfWeek)
                        ? 'bg-green-100 border-green-400 text-green-800'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={tempWorkingDays.includes(dayOfWeek)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTempWorkingDays([...tempWorkingDays, dayOfWeek].sort());
                        } else {
                          setTempWorkingDays(tempWorkingDays.filter(d => d !== dayOfWeek));
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="ml-2 text-xs sm:text-sm font-medium">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Holidays Section */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-800">Holidays</h4>
              
              {/* Add Holiday Form */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2">
                <label className="block text-xs font-medium text-gray-700">Add Holiday</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newHolidayDateSettings}
                    onChange={(e) => setNewHolidayDateSettings(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={newHolidayTypeSettings}
                    onChange={(e) => setNewHolidayTypeSettings(e.target.value as 'government' | 'company')}
                    className="px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="government">Govt</option>
                    <option value="company">Company</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Holiday name"
                  value={newHolidayNameSettings}
                  onChange={(e) => setNewHolidayNameSettings(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={() => {
                    if (newHolidayDateSettings && newHolidayNameSettings) {
                      setTempHolidays([
                        ...tempHolidays,
                        {
                          date: newHolidayDateSettings,
                          name: newHolidayNameSettings,
                          type: newHolidayTypeSettings,
                        },
                      ]);
                      setNewHolidayDateSettings('');
                      setNewHolidayNameSettings('');
                      setNewHolidayTypeSettings('government');
                    }
                  }}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Holiday
                </Button>
              </div>

              {/* Holidays List */}
              <div className="max-h-48 overflow-y-auto space-y-2">
                {tempHolidays.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No holidays added yet</p>
                ) : (
                  tempHolidays.map((holiday, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between gap-2 p-2 rounded border ${
                        holiday.type === 'government'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-800">{holiday.name}</p>
                        <p className="text-xs text-gray-600">
                          {holiday.date} · {holiday.type === 'government' ? 'Government' : 'Company'} Holiday
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setTempHolidays(tempHolidays.filter((_, i) => i !== idx));
                        }}
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 flex-shrink-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={saveAttendanceSettings}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Absence Reason Dialog */}
      {showReasonDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-base sm:text-lg text-gray-800">Mark as Absent</h3>
              <button onClick={() => setShowReasonDialog(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <XIcon className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Reason (optional)</p>
            <textarea
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value)}
              placeholder="e.g., Sick leave, Personal emergency..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  handleMarkAttendance(reasonDialogEmployee, 'absent', absenceReason);
                  setShowReasonDialog(false);
                  setAbsenceReason('');
                }}
                className="bg-red-600 hover:bg-red-700 flex-1 text-xs sm:text-sm"
              >
                Confirm
              </Button>
              <Button
                onClick={() => {
                  setShowReasonDialog(false);
                  setAbsenceReason('');
                }}
                variant="outline"
                className="flex-1 text-xs sm:text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Reason Dialog */}
      {showLeaveReasonDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-base sm:text-lg text-gray-800">Mark as Leave</h3>
              <button onClick={() => setShowLeaveReasonDialog(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <XIcon className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as 'paid' | 'unpaid')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="paid">Paid Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Reason (optional)</p>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="e.g., Vacation, Medical leave, Personal leave..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  handleMarkAttendance(leaveReasonEmployee, 'leave', leaveReason, 'full', leaveType);
                  setShowLeaveReasonDialog(false);
                  setLeaveReason('');
                  setLeaveType('paid');
                }}
                className="bg-yellow-600 hover:bg-yellow-700 flex-1 text-xs sm:text-sm"
              >
                Confirm
              </Button>
              <Button
                onClick={() => {
                  setShowLeaveReasonDialog(false);
                  setLeaveReason('');
                  setLeaveType('paid');
                }}
                variant="outline"
                className="flex-1 text-xs sm:text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Dialog */}
      {showHolidayForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-base sm:text-lg text-gray-800">Add Holiday</h3>
              <button onClick={() => setShowHolidayForm(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <XIcon className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            </div>
            <input
              type="date"
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="text"
              placeholder="Holiday name"
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (newHolidayDate && newHolidayName) {
                    setHolidays([...holidays, { date: newHolidayDate, name: newHolidayName }]);
                    setNewHolidayDate('');
                    setNewHolidayName('');
                    setShowHolidayForm(false);
                    toast.success('Holiday added');
                  }
                }}
                className="bg-green-600 hover:bg-green-700 flex-1 text-xs sm:text-sm"
              >
                Add
              </Button>
              <Button
                onClick={() => setShowHolidayForm(false)}
                variant="outline"
                className="flex-1 text-xs sm:text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Dialog */}
      {showEmployeeDetail && selectedEmployeeDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto max-w-sm sm:max-w-4xl p-3 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-2 sticky top-0 bg-white pb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg sm:text-xl text-gray-800 line-clamp-2">{selectedEmployeeDetail.name}</h3>
                <p className="text-xs sm:text-sm text-gray-500 line-clamp-1">{selectedEmployeeDetail.position}</p>
              </div>
              <button onClick={() => setShowEmployeeDetail(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1">
                <XIcon className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-gray-50 p-2 sm:p-3 rounded-lg gap-1 sm:gap-2">
              <Button
                onClick={() => setDetailViewMonth(new Date(detailViewMonth.getFullYear(), detailViewMonth.getMonth() - 1))}
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 w-8 sm:w-9 p-0 flex-shrink-0"
              >
                <ChevronLeft className="w-3 sm:w-4 h-3 sm:h-4" />
              </Button>
              <h4 className="font-semibold text-xs sm:text-base text-gray-800 flex-1 text-center">
                {detailViewMonth.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
              </h4>
              <Button
                onClick={() => setDetailViewMonth(new Date(detailViewMonth.getFullYear(), detailViewMonth.getMonth() + 1))}
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 w-8 sm:w-9 p-0 flex-shrink-0"
              >
                <ChevronRight className="w-3 sm:w-4 h-3 sm:h-4" />
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="text-center px-2 sm:px-3 py-2 sm:py-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-green-600 font-bold text-sm sm:text-base">{employeeStats[selectedEmployeeDetail.id!]?.present || 0}</p>
                <p className="text-xs text-green-700">Days Present</p>
              </div>
              <div className="text-center px-2 sm:px-3 py-2 sm:py-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-red-600 font-bold text-sm sm:text-base">{employeeStats[selectedEmployeeDetail.id!]?.absent || 0}</p>
                <p className="text-xs text-red-700">Days Absent</p>
              </div>
              <div className="text-center px-2 sm:px-3 py-2 sm:py-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-yellow-600 font-bold text-sm sm:text-base">{employeeStats[selectedEmployeeDetail.id!]?.leave || 0}</p>
                <p className="text-xs text-yellow-700">Days Leave</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 space-y-1">
              <p className="text-xs sm:text-sm text-gray-700">
                <span className="font-semibold">Total Days Worked:</span> {employeeStats[selectedEmployeeDetail.id!]?.present || 0} days
              </p>
              <p className="text-xs text-gray-600">
                Full day = 1, Half day = 0.5, Quarter day = 0.25
              </p>
            </div>

            {/* Calendar View */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100">
                <div className="grid grid-cols-7 gap-0">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center py-1 px-0.5 sm:py-2 sm:px-1 font-semibold text-xs text-gray-700 border border-gray-300 bg-gray-200">
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0">
                {(() => {
                  const daysInMonth = new Date(detailViewMonth.getFullYear(), detailViewMonth.getMonth() + 1, 0).getDate();
                  const firstDay = new Date(detailViewMonth.getFullYear(), detailViewMonth.getMonth(), 1).getDay();
                  const dailyDetails = employeeStats[selectedEmployeeDetail.id!]?.dailyDetails || {};
                  const days = [];

                  // Empty cells for days before month starts
                  for (let i = 0; i < firstDay; i++) {
                    days.push(
                      <div key={`empty-${i}`} className="border border-gray-300 bg-gray-50 aspect-square"></div>
                    );
                  }

                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${detailViewMonth.getFullYear()}-${String(detailViewMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const currentDate = new Date(detailViewMonth.getFullYear(), detailViewMonth.getMonth(), day);
                    const dayStatus = dailyDetails[dateStr];
                    const isNonWorkingDay = !isWorkingDay(currentDate);
                    const holiday = isHoliday(currentDate) ? getHolidayName(currentDate) : null;
                    
                    let bgColor = 'bg-white';
                    let textColor = 'text-gray-600';
                    let statusLabel = 'Not Marked';
                    let statusIcon = '—';

                    // Check for holidays first
                    if (holiday) {
                      bgColor = 'bg-purple-50';
                      textColor = 'text-purple-700';
                      statusLabel = holiday;
                      statusIcon = '🏢';
                    } else if (isNonWorkingDay) {
                      bgColor = 'bg-gray-100';
                      textColor = 'text-gray-500';
                      statusLabel = 'Weekend';
                      statusIcon = 'ⓘ';
                    } else if (dayStatus) {
                      if (dayStatus.status === 'present') {
                        bgColor = 'bg-green-50';
                        textColor = 'text-green-700';
                        statusLabel = dayStatus.display || 'Present';
                        statusIcon = '✓';
                      } else if (dayStatus.status === 'absent') {
                        bgColor = 'bg-red-50';
                        textColor = 'text-red-700';
                        statusLabel = 'Absent';
                        statusIcon = '✗';
                      } else if (dayStatus.status === 'leave') {
                        bgColor = 'bg-yellow-50';
                        textColor = 'text-yellow-700';
                        statusLabel = 'Leave';
                        statusIcon = '📋';
                      }
                    }

                    days.push(
                      <div key={day} className={`border border-gray-300 ${bgColor} p-1 sm:p-1.5 aspect-square flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer text-center group relative`}>
                        <span className={`font-bold text-xs sm:text-sm ${textColor}`}>{day}</span>
                        <span className={`text-lg sm:text-xl leading-tight ${textColor}`}>{statusIcon}</span>
                        <span className={`text-xs leading-tight line-clamp-1 ${textColor}`}>{statusLabel}</span>
                        
                        {/* Hover Buttons - Show on hover for working days */}
                        {!isNonWorkingDay && !holiday && (
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-0.5 rounded">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAttendance(selectedEmployeeDetail.id!, 'present', '', 'full');
                                calculateEmployeeStats(selectedEmployeeDetail.id!, detailViewMonth);
                              }}
                              size="sm"
                              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                              title="Mark Present"
                            >
                              ✓
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReasonDialogEmployee(selectedEmployeeDetail.id!);
                                setAbsenceReason('');
                                setShowReasonDialog(true);
                              }}
                              size="sm"
                              className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                              title="Mark Absent"
                            >
                              ✗
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLeaveReasonEmployee(selectedEmployeeDetail.id!);
                                setLeaveReason('');
                                setLeaveType('paid');
                                setShowLeaveReasonDialog(true);
                              }}
                              size="sm"
                              className="h-6 w-6 p-0 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded"
                              title="Mark Leave"
                            >
                              📋
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return days;
                })()}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Legend:</p>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-100 border border-green-300 rounded flex-shrink-0"></div>
                  <span className="truncate">Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 border border-red-300 rounded flex-shrink-0"></div>
                  <span className="truncate">Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-100 border border-yellow-300 rounded flex-shrink-0"></div>
                  <span className="truncate">Leave</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white border border-gray-300 rounded flex-shrink-0"></div>
                  <span className="truncate">Not Marked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-100 border border-purple-300 rounded flex-shrink-0"></div>
                  <span className="truncate">Holiday</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-100 border border-gray-300 rounded flex-shrink-0"></div>
                  <span className="truncate">Weekend</span>
                </div>
              </div>
            </div> 

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setShowEmployeeDetail(false)}
                variant="outline"
                className="flex-1 text-xs sm:text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Type Selection Dialog */}
      {showAttendanceTypeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-base sm:text-lg text-gray-800">Attendance Type</h3>
              <button onClick={() => setShowAttendanceTypeDialog(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <XIcon className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Select attendance type</p>
            
            <div className="space-y-2">
              <label className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                <input
                  type="radio"
                  name="attendance-type"
                  value="full"
                  checked={selectedAttendanceType === 'full'}
                  onChange={(e) => setSelectedAttendanceType(e.target.value as PresentDayType)}
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm text-gray-900">Full Day (1)</p>
                  <p className="text-xs text-gray-500">Complete day</p>
                </div>
              </label>

              <label className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                <input
                  type="radio"
                  name="attendance-type"
                  value="half"
                  checked={selectedAttendanceType === 'half'}
                  onChange={(e) => setSelectedAttendanceType(e.target.value as PresentDayType)}
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm text-gray-900">Half Day (1/2)</p>
                  <p className="text-xs text-gray-500">Half day</p>
                </div>
              </label>

              <label className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                <input
                  type="radio"
                  name="attendance-type"
                  value="quarter"
                  checked={selectedAttendanceType === 'quarter'}
                  onChange={(e) => setSelectedAttendanceType(e.target.value as PresentDayType)}
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm text-gray-900">Quarter Day (1/4)</p>
                  <p className="text-xs text-gray-500">Quarter day</p>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  handleMarkAttendance(attendanceTypeEmployee, 'present', '', selectedAttendanceType);
                  setShowAttendanceTypeDialog(false);
                }}
                className="bg-green-600 hover:bg-green-700 flex-1 text-xs sm:text-sm"
              >
                Mark Present
              </Button>
              <Button
                onClick={() => setShowAttendanceTypeDialog(false)}
                variant="outline"
                className="flex-1 text-xs sm:text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModuleAccessComponent>
  );
}

