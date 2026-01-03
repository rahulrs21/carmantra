"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, setDoc, doc, onSnapshot, Timestamp, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate, ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';
import { X } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: 'present' | 'absent' | 'leave';
  reason?: string;
  timestamp?: { seconds: number };
}

interface Employee {
  id: string;
  name: string;
  email: string;
  position?: string;
  status?: string;
}

export default function EmployeeAttendancePage() {
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reasonDialogEmployee, setReasonDialogEmployee] = useState<string>('');
  const [reasonInput, setReasonInput] = useState('');
  const [editingReason, setEditingReason] = useState(false);

  // Fetch all active employees from employees collection
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'employees'));
        const employeesList = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name || '',
            email: doc.data().email || '',
            position: doc.data().position || '',
            status: doc.data().status || 'active',
          }))
          .filter(emp => emp.status === 'active')
          .sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(employeesList);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch attendance records from employees/attendance module
  useEffect(() => {
    const q = query(collection(db, 'attendance'));
    const unsub = onSnapshot(q, (snapshot) => {
      const attendanceMap: Record<string, AttendanceRecord> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Create key from employeeId and date for quick lookup
        const key = `${data.employeeId}-${data.date}`;
        attendanceMap[key] = {
          id: doc.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName || '',
          date: data.date,
          status: data.status,
          reason: data.reason || '',
          timestamp: data.timestamp,
        };
      });
      
      setAttendance(attendanceMap);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleMarkAttendance = async (employeeId: string, status: 'present' | 'absent' | 'leave' | null, reason: string = '') => {
    try {
      const employeeName = employees.find(e => e.id === employeeId)?.name || '';
      const docId = `${employeeId}_${selectedDate}`;
      const monthKey = selectedDate.substring(0, 7); // YYYY-MM format

      if (status === null) {
        // Clear the record
        const existingKey = `${employeeId}-${selectedDate}`;
        if (attendance[existingKey]) {
          await setDoc(doc(db, 'attendance', attendance[existingKey].id), {}, { merge: false });
        }
      } else {
        // Set new status
        const attendanceData: any = {
          employeeId,
          employeeName,
          date: selectedDate,
          month: monthKey,
          status,
          timestamp: Timestamp.now(),
        };
        
        // Only add reason if status is 'absent' and reason is provided
        if (status === 'absent' && reason) {
          attendanceData.reason = reason;
        }
        
        await setDoc(
          doc(db, 'attendance', docId),
          attendanceData,
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance');
    }
  };

  const getTodayAttendance = () => {
    const records: Record<string, AttendanceRecord> = {};
    
    Object.entries(attendance).forEach(([key, record]) => {
      if (record.date === selectedDate) {
        records[record.employeeId] = record;
      }
    });
    
    return records;
  };

  const getMonthAttendance = () => {
    const records: Record<string, AttendanceRecord> = {};
    const monthKey = selectedMonth;
    
    Object.entries(attendance).forEach(([key, record]) => {
      if (record.date && record.date.startsWith(monthKey)) {
        records[record.employeeId] = record;
      }
    });
    
    return records;
  };

  const todayRecords = getTodayAttendance();
  const monthRecords = getMonthAttendance();

  const presentToday = Object.values(todayRecords).filter((a) => a.status === 'present').length;
  const absentToday = Object.values(todayRecords).filter((a) => a.status === 'absent').length;
  const leaveToday = Object.values(todayRecords).filter((a) => a.status === 'leave').length;

  return (
    <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employee Attendance</h1>
            <p className="text-sm text-gray-500 mt-1">Track daily attendance for all employees</p>
          </div>
        </div>

        {/* Date Picker */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">📅 Select Date</label>
          <div className="mb-4 text-sm text-gray-600 font-medium">
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Button
              onClick={() => {
                const prevDate = new Date(selectedDate);
                prevDate.setDate(prevDate.getDate() - 1);
                setSelectedDate(prevDate.toISOString().split('T')[0]);
              }}
              variant="outline"
              className="w-full sm:w-auto border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50"
            >
              ← Previous
            </Button>
            
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 flex-1 border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
            
            <Button
              onClick={() => {
                const nextDate = new Date(selectedDate);
                nextDate.setDate(nextDate.getDate() + 1);
                setSelectedDate(nextDate.toISOString().split('T')[0]);
              }}
              variant="outline"
              className="w-full sm:w-auto border-2 border-gray-300 hover:border-orange-500 hover:bg-orange-50"
            >
              Next →
            </Button>
            
            <Button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              variant="outline"
              className="w-full sm:w-auto border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            >
              Today
            </Button>
          </div>
        </div>

        {/* Today's Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="text-sm text-blue-600 font-semibold">Total Employees</div>
            <div className="text-3xl font-bold text-blue-900 mt-2">{employees.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
            <div className="text-sm text-green-600 font-semibold">Present</div>
            <div className="text-3xl font-bold text-green-900 mt-2">{presentToday}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
            <div className="text-sm text-red-600 font-semibold">Absent</div>
            <div className="text-3xl font-bold text-red-900 mt-2">{absentToday}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200 shadow-sm">
            <div className="text-sm text-yellow-600 font-semibold">Leave</div>
            <div className="text-3xl font-bold text-yellow-900 mt-2">{leaveToday}</div>
          </div>
        </div>

        {/* Attendance Marking Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              Mark Attendance for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Select one status per employee: Present, Absent, or Leave</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <p className="font-medium">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="font-medium">No active employees found</p>
            </div>
          ) : (
            <div className={`overflow-x-auto ${employees.length > 10 ? 'max-h-[600px] overflow-y-auto' : ''}`}>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Employee Name</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const record = todayRecords[employee.id];
                    const currentStatus = record?.status || null;
                    
                    return (
                      <tr key={employee.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        {/* Employee Name */}
                        <td className="px-4 sm:px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{employee.email}</p>
                        </td>

                        {/* Attendance Status - Radio Buttons */}
                        <td className="px-4 sm:px-6 py-4">
                          <PermissionGate module="accounts" action="create">
                            <div className="flex flex-wrap gap-3 items-center">
                              {/* Present Radio */}
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`attendance_${employee.id}`}
                                  value="present"
                                  checked={currentStatus === 'present'}
                                  onChange={() => handleMarkAttendance(employee.id, 'present')}
                                  className="w-4 h-4 text-green-600 cursor-pointer accent-green-600"
                                />
                                <span className={`text-sm font-medium transition-colors ${
                                  currentStatus === 'present'
                                    ? 'text-green-700 bg-green-100 px-2 py-1 rounded'
                                    : 'text-gray-600 group-hover:text-green-600'
                                }`}>
                                  ✓ Present
                                </span>
                              </label>

                              {/* Absent Radio */}
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`attendance_${employee.id}`}
                                  value="absent"
                                  checked={currentStatus === 'absent'}
                                  onChange={() => {
                                    setReasonDialogEmployee(employee.id);
                                    setReasonInput(record?.reason || '');
                                    setEditingReason(!!record?.reason);
                                    setShowReasonDialog(true);
                                  }}
                                  className="w-4 h-4 text-red-600 cursor-pointer accent-red-600"
                                />
                                <span className={`text-sm font-medium transition-colors ${
                                  currentStatus === 'absent'
                                    ? 'text-red-700 bg-red-100 px-2 py-1 rounded'
                                    : 'text-gray-600 group-hover:text-red-600'
                                }`}>
                                  ✕ Absent
                                </span>
                              </label>

                              {/* Leave Radio */}
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`attendance_${employee.id}`}
                                  value="leave"
                                  checked={currentStatus === 'leave'}
                                  onChange={() => handleMarkAttendance(employee.id, 'leave')}
                                  className="w-4 h-4 text-yellow-600 cursor-pointer accent-yellow-600"
                                />
                                <span className={`text-sm font-medium transition-colors ${
                                  currentStatus === 'leave'
                                    ? 'text-yellow-700 bg-yellow-100 px-2 py-1 rounded'
                                    : 'text-gray-600 group-hover:text-yellow-600'
                                }`}>
                                  🏖️ Leave
                                </span>
                              </label>

                              {/* Clear Button */}
                              {currentStatus && (
                                <button
                                  onClick={() => handleMarkAttendance(employee.id, null)}
                                  className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                  title="Clear selection"
                                >
                                  <X className="w-4 h-4" /> 
                                </button>
                              )}
                            </div>
                          </PermissionGate>
                        </td>

                        {/* Reason Column */}
                        <td className="px-4 sm:px-6 py-4">
                          {currentStatus === 'absent' && record?.reason ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm text-gray-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                                {record.reason}
                              </span>
                              <button
                                onClick={() => {
                                  setReasonDialogEmployee(employee.id);
                                  setReasonInput(record.reason || '');
                                  setEditingReason(true);
                                  setShowReasonDialog(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Edit
                              </button>
                            </div>
                          ) : currentStatus === 'absent' ? (
                            <span className="text-xs text-gray-400">No reason provided</span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Monthly Summary */}
        {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-gray-800">Monthly Summary</h2>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm h-10 dark:bg-gray-800 dark:text-white dark:border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl sm:text-3xl font-bold text-green-900">
                {Object.values(monthRecords).filter((a) => a.status === 'present').length}
              </div>
              <div className="text-xs sm:text-sm text-green-600 mt-2 font-medium">Present Days</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl sm:text-3xl font-bold text-red-900">
                {Object.values(monthRecords).filter((a) => a.status === 'absent').length}
              </div>
              <div className="text-xs sm:text-sm text-red-600 mt-2 font-medium">Absent Days</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-900">
                {Object.values(monthRecords).filter((a) => a.status === 'leave').length}
              </div>
              <div className="text-xs sm:text-sm text-yellow-600 mt-2 font-medium">Leave Days</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl sm:text-3xl font-bold text-purple-900">
                {employees.length * new Date(selectedMonth + '-01').getDay() === 0 ? 0 : 
                  Object.values(monthRecords).filter(a => 
                    a.date.startsWith(selectedMonth) && 
                    a.status !== 'present' && 
                    a.status !== 'absent' && 
                    a.status !== 'leave'
                  ).length
                }
              </div>
              <div className="text-xs sm:text-sm text-purple-600 mt-2 font-medium">Not Marked</div>
            </div>
          </div>
        </div> */}
      </div>

      {/* Reason Dialog Modal */}
      {showReasonDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {editingReason ? '✏️ Edit Absence Reason' : '📝 Add Absence Reason'}
              </h3>
              <button
                onClick={() => {
                  setShowReasonDialog(false);
                  setReasonInput('');
                  setEditingReason(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Provide a reason for the absence
            </p>

            {/* Reason Input */}
            <textarea
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="e.g., Medical leave, Personal emergency, Sick leave, etc."
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800 transition-colors duration-200 resize-none"
              rows={4}
            />

            {/* Modal Footer */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => {
                  setShowReasonDialog(false);
                  setReasonInput('');
                  setEditingReason(false);
                }}
                variant="outline"
                className="flex-1 border-2"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (reasonInput.trim() || editingReason) {
                    handleMarkAttendance(reasonDialogEmployee, 'absent', reasonInput);
                    setShowReasonDialog(false);
                    setReasonInput('');
                    setEditingReason(false);
                  } else {
                    alert('Please enter a reason');
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {editingReason ? 'Update' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModuleAccessComponent>
  );
}
