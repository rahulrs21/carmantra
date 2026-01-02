"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs, where, addDoc, Timestamp } from 'firebase/firestore';
import { Employee, AttendanceRecord } from '@/lib/types';
import { useUser } from '@/lib/userContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Calendar, ChevronLeft, ChevronRight, Shield, CheckCircle2, XCircle, AlertCircle, Trash2, Plus, X } from 'lucide-react';
import { ModuleAccess, PermissionGate, ModuleAccessComponent } from '@/components/PermissionGate';

export default function AttendancePage() {
  const { role: currentRole } = useUser();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Record<string, { status: string; reason?: string }>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [absenceReason, setAbsenceReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reasonDialogEmployee, setReasonDialogEmployee] = useState<string>('');
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string }>>([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<Employee | null>(null);
  const [hoveredDateDetails, setHoveredDateDetails] = useState<string | null>(null);
  const [detailViewMonth, setDetailViewMonth] = useState(new Date());
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [markStatus, setMarkStatus] = useState<string>('');
  const [markReason, setMarkReason] = useState('');
  const [bulkMarkEmployee, setBulkMarkEmployee] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedParticularDates, setSelectedParticularDates] = useState<Set<string>>(new Set());

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

        // Sort by name in JavaScript instead of Firestore (to avoid needing composite index)
        employeeList.sort((a, b) => a.name.localeCompare(b.name));

        setEmployees(employeeList);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const q = query(collection(db, 'holidays'), orderBy('date', 'asc'));
        const snapshot = await getDocs(q);
        const holidayList = snapshot.docs.map(doc => doc.data()) as Array<{ date: string; name: string }>;
        setHolidays(holidayList);
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    };
    fetchHolidays();
  }, []);

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
        await updateDoc(doc(db, 'holidays', snapshot.docs[0].id), {});
      }
      setHolidays(holidays.filter(h => h.date !== dateToDelete));
      toast.success('Holiday removed');
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to remove holiday');
    }
  };


  // Fetch attendance for all employees and month
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const attendanceRef = collection(db, 'attendance');
        const monthKey = currentMonth.toISOString().slice(0, 7); // YYYY-MM

        const q = query(
          attendanceRef,
          where('month', '==', monthKey)
        );

        const snapshot = await getDocs(q);
        const records: Record<string, { status: string; reason?: string }> = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const key = `${data.employeeId}-${data.date}`;
          records[key] = {
            status: data.status,
            reason: data.reason || ''
          };
        });

        setAttendance(records);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    };

    fetchAttendance();
  }, [currentMonth]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
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
          await addDoc(attendanceRef, {
            employeeId,
            date: dateStr,
            month: monthKey,
            status,
            reason: reason,
            timestamp: Timestamp.now()
          });
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

  const getDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

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
            await addDoc(attendanceRef, {
              employeeId: empId,
              date: dateStr,
              month: monthKey,
              status: markStatus,
              reason: markReason || '',
              timestamp: Timestamp.now()
            });
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

  return (
    <ModuleAccessComponent module={ModuleAccess.ATTENDANCE}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
              <Calendar className="w-8 h-8 text-orange-600" />
              Attendance Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Track daily attendance for your team</p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-2 text-xs">
            {(() => {
              const stats = getTodayAttendanceSummary();
              return (
                <>
                  <div className="text-center px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-green-600 font-bold text-lg">{stats.present}</p>
                    <p className="text-green-700">Present</p>
                  </div>
                  <div className="text-center px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-red-600 font-bold text-lg">{stats.absent}</p>
                    <p className="text-red-700">Absent</p>
                  </div>
                  <div className="text-center px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200">
                    <p className="text-yellow-600 font-bold text-lg">{stats.leave}</p>
                    <p className="text-yellow-700">Leave</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Date Selector */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Select Date</p>
              <input
                type="date"
                value={getDateStr(selectedDate)}
                onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <Button
              onClick={() => setSelectedDate(new Date())}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              Reset to Today
            </Button>
          </div>
        </div>

        {/* Main Attendance Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <h2 className="font-bold text-lg text-gray-800">
              Mark Attendance for {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Click to mark attendance status for each employee</p>
          </div>

          {/* Bulk Mark Multiple Employees - Single Date */}
          {selectedEmployees.size > 0 && !selectedDateRange.start && !selectedParticularDates.size && (
            <div className="p-4 bg-indigo-50 border-b border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo-900">{selectedEmployees.size} employee(s) selected</p>
                <Button
                  onClick={() => setSelectedEmployees(new Set())}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Selection
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-semibold text-indigo-900 mb-2">Mark As</p>
                  <Select value={markStatus} onValueChange={setMarkStatus}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs font-semibold text-indigo-900 mb-2">Reason (Optional)</p>
                  <input
                    type="text"
                    placeholder="e.g., Medical leave"
                    value={markReason}
                    onChange={(e) => setMarkReason(e.target.value)}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    onClick={() => {
                      handleBulkMarkAttendance([getDateStr(selectedDate)]);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
                    size="sm"
                  >
                    Mark {selectedEmployees.size} Employee(s)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Unified Bulk Mark Panel - Works for both Date Range and Particular Dates */}
          {selectedEmployees.size > 0 && (selectedParticularDates.size > 0 || (selectedDateRange.start && selectedDateRange.end)) && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-lg border-2 border-purple-400 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                    ✨ Mark Attendance
                  </h3>
                  {selectedParticularDates.size > 0 ? (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>{selectedEmployees.size}</strong> employee(s) × <strong>{selectedParticularDates.size}</strong> date(s) = <strong>{selectedEmployees.size * selectedParticularDates.size}</strong> record(s)
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>{selectedEmployees.size}</strong> employee(s) × <strong>{Math.ceil((selectedDateRange.end!.getTime() - selectedDateRange.start!.getTime()) / (1000 * 60 * 60 * 24)) + 1}</strong> day(s) = <strong>{selectedEmployees.size * (Math.ceil((selectedDateRange.end!.getTime() - selectedDateRange.start!.getTime()) / (1000 * 60 * 60 * 24)) + 1)}</strong> record(s)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Dates: {selectedDateRange.start!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to {selectedDateRange.end!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setSelectedEmployees(new Set());
                    setSelectedDateRange({ start: null, end: null });
                    setSelectedParticularDates(new Set());
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Mark As</p>
                  <Select value={markStatus} onValueChange={setMarkStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">✓ Present</SelectItem>
                      <SelectItem value="absent">✗ Absent</SelectItem>
                      <SelectItem value="leave">📋 Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Reason (Optional)</p>
                  <input
                    type="text"
                    placeholder="e.g., Medical leave, Vacation"
                    value={markReason}
                    onChange={(e) => setMarkReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    onClick={() => {
                      setSelectedEmployees(new Set());
                      setSelectedDateRange({ start: null, end: null });
                      setSelectedParticularDates(new Set());
                      setMarkStatus('');
                      setMarkReason('');
                    }}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const datesToMark = selectedParticularDates.size > 0 
                        ? Array.from(selectedParticularDates)
                        : (() => {
                            const dates: string[] = [];
                            const start = new Date(selectedDateRange.start!);
                            const end = new Date(selectedDateRange.end!);
                            start.setHours(0, 0, 0, 0);
                            end.setHours(0, 0, 0, 0);
                            const current = new Date(start);
                            while (current <= end) {
                              dates.push(getDateStr(current));
                              current.setDate(current.getDate() + 1);
                            }
                            return dates;
                          })();
                      handleBulkMarkAttendance(datesToMark);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                    size="sm"
                  >
                    ✓ Mark All
                  </Button>
                </div>
              </div>

              <div className="bg-purple-100 border border-purple-400 rounded-lg p-3">
                <p className="text-xs text-purple-800">
                  <strong>📌 Summary:</strong> This will mark {selectedEmployees.size} employee(s) for {selectedParticularDates.size > 0 ? selectedParticularDates.size : Math.ceil((selectedDateRange.end!.getTime() - selectedDateRange.start!.getTime()) / (1000 * 60 * 60 * 24)) + 1} {selectedParticularDates.size > 0 ? 'selected date(s)' : 'consecutive day(s)'} with status: <strong>{markStatus || 'Select status'}</strong>
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <p>Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Employee</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Reason (if applicable)</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, index) => {
                    const dateStr = getDateStr(selectedDate);
                    const attendanceKey = `${emp.id}-${dateStr}`;
                    const att = attendance[attendanceKey];
                    const currentStatus = att?.status || '';

                    return (
                      <tr key={emp.id} className={`border-b border-gray-200 hover:bg-gray-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
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
                            <div>
                              <p className="font-medium text-gray-900">{emp.name}</p>
                              <p className="text-xs text-gray-500">{emp.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              onClick={() => handleMarkAttendanceForEmployee(emp.id!, dateStr, 'present', '')}
                              size="sm"
                              title="Mark Present"
                              className={`${currentStatus === 'present'
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                                }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setReasonDialogEmployee(emp.id!);
                                setAbsenceReason(att?.reason || '');
                                setShowReasonDialog(true);
                              }}
                              size="sm"
                              title="Mark Absent"
                              className={`${currentStatus === 'absent'
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                                }`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleMarkAttendanceForEmployee(emp.id!, dateStr, 'leave', '')}
                              size="sm"
                              title="Mark Leave"
                              className={`${currentStatus === 'leave'
                                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                                }`}
                            >
                              <AlertCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                if (currentStatus) {
                                  handleMarkAttendanceForEmployee(emp.id!, dateStr, currentStatus, '');
                                }
                              }}
                              size="sm"
                              title="Clear Attendance"
                              disabled={!currentStatus}
                              className="bg-gray-400 hover:bg-gray-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {att?.reason ? (
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(currentStatus)}`}>
                              {att.reason}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button
                            onClick={() => {
                              setSelectedEmployeeDetail(emp);
                              setShowEmployeeDetail(true);
                            }}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
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

        {/* Compact Calendar View */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-800">Calendar View</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-gray-700 min-w-[130px] text-center text-sm">
                  {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {/* Week Headers */}
            <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 text-xs py-2 bg-gray-100 rounded">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {Array(getFirstDayOfMonth(currentMonth))
                .fill(null)
                .concat(Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1))
                .map((day, index) => {
                  const dateStr = day
                    ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    : '';
                  const isHoliday = day && holidays.some(h => h.date === dateStr);

                  // Count attendance for this date
                  let presentCount = 0, absentCount = 0, leaveCount = 0;

                  if (day) {
                    employees.forEach(emp => {
                      const att = attendance[`${emp.id}-${dateStr}`];
                      if (att) {
                        if (att.status === 'present') presentCount++;
                        else if (att.status === 'absent') absentCount++;
                        else if (att.status === 'leave') leaveCount++;
                      }
                    });
                  }

                  return (
                    <div key={index} className="aspect-square">
                      {day ? (
                        <div
                          onClick={(e) => handleCalendarDayClick(dateStr, e)}
                          onMouseEnter={() => setHoveredDateDetails(dateStr)}
                          onMouseLeave={() => setHoveredDateDetails(null)}
                          className={`w-full h-full rounded border p-1 text-xs flex flex-col justify-between cursor-pointer transition hover:shadow-md relative ${
                            isHoliday
                              ? 'bg-blue-50 border-blue-300'
                              : isDateSelected(dateStr)
                              ? 'bg-cyan-100 border-cyan-500 ring-2 ring-cyan-400'
                              : isDateInRange(new Date(dateStr + 'T00:00:00'))
                              ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-300'
                              : getDateStr(selectedDate) === dateStr
                              ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                          title={selectedParticularDates.size > 0 ? 'Ctrl+Click to select multiple' : selectedDateRange.start ? 'Shift+Click to select range' : 'Click to select or Ctrl+Click for multiple'}
                        >
                          <div className="font-semibold text-gray-800">{day}</div>

                          <div className="text-xs space-y-0.5">
                            {isHoliday && <div className="text-blue-700 font-semibold">Holiday</div>}
                            {presentCount > 0 && <div className="text-green-700 font-semibold">✓ {presentCount}</div>}
                            {absentCount > 0 && <div className="text-red-700 font-semibold">✗ {absentCount}</div>}
                            {leaveCount > 0 && <div className="text-yellow-700 font-semibold">L {leaveCount}</div>}
                          </div>

                          {/* Hover Details - Employee Names (Inside Date Box) */}
                          {hoveredDateDetails === dateStr && day && (presentCount > 0 || absentCount > 0 || leaveCount > 0) && (
                            <div className="absolute inset-0 p-1 bg-white/95 backdrop-blur-sm border border-gray-300 rounded flex flex-col justify-center items-center z-20 text-xs max-h-full overflow-y-auto">
                              <div className="space-y-1">
                                {employees.map(emp => {
                                  const att = attendance[`${emp.id}-${dateStr}`];
                                  if (!att || !att.status) return null;
                                  const statusEmoji = att.status === 'present' ? '✓' : att.status === 'absent' ? '✗' : '📋';
                                  const statusColor = att.status === 'present' ? 'text-green-700' : att.status === 'absent' ? 'text-red-700' : 'text-yellow-700';
                                  return (
                                    <div key={emp.id} className={`${statusColor} font-medium whitespace-nowrap`}>
                                      {statusEmoji} {emp.name}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>



        {/* Single Date - Multiple Employees Section */}


        {/* Calendar Info */}
        {!selectedDateRange.start && !selectedEmployees.size && !selectedParticularDates.size && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <p className="text-sm text-blue-800 mb-3">
              <strong>💡 Tips:</strong>
            </p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-none">
              <li>• Click a date to select it</li>
              <li>• Hold <strong>Ctrl+Click</strong> to select multiple particular dates (shows in cyan)</li>
              <li>• Hold <strong>Shift+Click</strong> to select a continuous date range (shows in purple)</li>
              <li>• Check employee names to mark multiple people at once</li>
            </ul>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-gray-800">Manage Holidays</h3>
            {!showHolidayForm && (
              <Button onClick={() => setShowHolidayForm(true)} size="sm" className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Holiday
              </Button>
            )}
          </div>

          {showHolidayForm && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="Holiday name (e.g., New Year)"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <div className="flex gap-2">
                <Button onClick={handleAddHoliday} className="bg-green-600 hover:bg-green-700 flex-1">Save</Button>
                <Button onClick={() => setShowHolidayForm(false)} variant="outline" className="flex-1">Cancel</Button>
              </div>
            </div>
          )}

          {holidays.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No holidays added yet</p>
          ) : (
            <div className="space-y-2">
              {holidays.map((holiday) => (
                <div key={holiday.date} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{holiday.name}</p>
                    <p className="text-xs text-gray-600">{new Date(holiday.date).toLocaleDateString()}</p>
                  </div>
                  <Button
                    onClick={() => handleDeleteHoliday(holiday.date)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Absence Reason Dialog */}
      {showReasonDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-800">Mark as Absent</h3>
              <button onClick={() => setShowReasonDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">Provide a reason for absence (optional)</p>
            <textarea
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value)}
              placeholder="e.g., Sick leave, Personal emergency..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const dateStr = getDateStr(selectedDate);
                  handleMarkAttendanceForEmployee(reasonDialogEmployee, dateStr, 'absent', absenceReason);
                  setShowReasonDialog(false);
                  setAbsenceReason('');
                }}
                className="bg-red-600 hover:bg-red-700 flex-1"
              >
                Confirm
              </Button>
              <Button
                onClick={() => {
                  setShowReasonDialog(false);
                  setAbsenceReason('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Attendance Detail Modal */}
      {showEmployeeDetail && selectedEmployeeDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl text-gray-800">{selectedEmployeeDetail.name}</h3>
                <p className="text-sm text-gray-500">Attendance Records</p>
              </div>
              <button onClick={() => setShowEmployeeDetail(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Month Filter */}
            <div className="flex items-center justify-between gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailViewMonth(new Date(detailViewMonth.getFullYear(), detailViewMonth.getMonth() - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-gray-700 min-w-[150px] text-center">
                  {detailViewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailViewMonth(new Date(detailViewMonth.getFullYear(), detailViewMonth.getMonth() + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={() => setDetailViewMonth(new Date())}
                size="sm"
                variant="outline"
              >
                Current Month
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              {(() => {
                const monthKey = detailViewMonth.toISOString().slice(0, 7);
                let present = 0, absent = 0, leave = 0;

                Object.entries(attendance).forEach(([key, value]) => {
                  if (key.startsWith(selectedEmployeeDetail.id + '-') && key.includes(monthKey)) {
                    if (value.status === 'present') present++;
                    else if (value.status === 'absent') absent++;
                    else if (value.status === 'leave') leave++;
                  }
                });

                return (
                  <>
                    <div className="text-center px-4 py-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-green-600 font-bold text-lg">{present}</p>
                      <p className="text-xs text-green-700">Present Days</p>
                    </div>
                    <div className="text-center px-4 py-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-red-600 font-bold text-lg">{absent}</p>
                      <p className="text-xs text-red-700">Absent Days</p>
                    </div>
                    <div className="text-center px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="text-yellow-600 font-bold text-lg">{leave}</p>
                      <p className="text-xs text-yellow-700">Leave Days</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Attendance Table */}
            <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Day</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const monthKey = detailViewMonth.toISOString().slice(0, 7);
                    const days = getDaysInMonth(detailViewMonth);
                    const entries = [];

                    for (let i = 1; i <= days; i++) {
                      const dateStr = `${detailViewMonth.getFullYear()}-${String(detailViewMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                      const att = attendance[`${selectedEmployeeDetail.id}-${dateStr}`];

                      if (att && att.status) {
                        const date = new Date(dateStr + 'T00:00:00');
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        const statusColor = att.status === 'present' ? 'bg-green-50' : att.status === 'absent' ? 'bg-red-50' : 'bg-yellow-50';
                        const statusEmoji = att.status === 'present' ? '✓' : att.status === 'absent' ? '✗' : '📋';

                        entries.push(
                          <tr key={dateStr} className={`border-b border-gray-200 ${statusColor}`}>
                            <td className="px-4 py-3 font-medium text-gray-800">{dateStr}</td>
                            <td className="px-4 py-3 text-gray-600">{dayName}</td>
                            <td className="px-4 py-3 text-center font-semibold">
                              <span className={`${att.status === 'present' ? 'text-green-700' : att.status === 'absent' ? 'text-red-700' : 'text-yellow-700'}`}>
                                {statusEmoji} {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{att.reason || '—'}</td>
                          </tr>
                        );
                      }
                    }

                    return entries.length > 0 ? entries : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No attendance records for this month
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowEmployeeDetail(false)}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModuleAccessComponent>
  );
}
