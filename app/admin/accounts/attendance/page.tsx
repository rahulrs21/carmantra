"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, setDoc, doc, onSnapshot, Timestamp, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate, ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';

interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: { seconds: number };
  checkIn?: { seconds: number };
  checkOut?: { seconds: number };
  status: 'present' | 'absent' | 'half_day' | 'leave';
  workingHours?: number;
  notes?: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  position?: string;
}

export default function StaffAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    // Fetch staff members
    const fetchStaff = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'staff'));
        const staff = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || '',
          email: doc.data().email || '',
          position: doc.data().position || '',
        }));
        setStaffMembers(staff);
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };

    fetchStaff();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'attendance'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AttendanceRecord[];
      setAttendance(data.sort((a, b) => b.date.seconds - a.date.seconds));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleMarkAttendance = async (staffId: string, status: string) => {
    const dateObj = new Date(selectedDate);
    const dateKey = selectedDate;

    try {
      const docId = `${staffId}_${dateKey}`;
      const checkIn = status === 'absent' ? undefined : Timestamp.fromDate(new Date());

      await setDoc(doc(db, 'attendance', docId), {
        staffId,
        staffName: staffMembers.find((s) => s.id === staffId)?.name || '',
        date: Timestamp.fromDate(dateObj),
        status,
        checkIn: status === 'absent' ? undefined : checkIn,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance');
    }
  };

  const getTodayAttendance = () => {
    return attendance.filter((a) => {
      const aDate = new Date(a.date.seconds * 1000).toISOString().split('T')[0];
      return aDate === selectedDate;
    });
  };

  const getMonthAttendance = () => {
    return attendance.filter((a) => {
      const aDate = new Date(a.date.seconds * 1000).toISOString().slice(0, 7);
      return aDate === selectedMonth;
    });
  };

  const todayRecords = getTodayAttendance();
  const monthRecords = getMonthAttendance();

  const markedStaffToday = new Set(todayRecords.map((a) => a.staffId));
  const presentToday = todayRecords.filter((a) => a.status === 'present').length;
  const absentToday = todayRecords.filter((a) => a.status === 'absent').length;

  return (
    <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Staff Attendance</h1>
            <p className="text-sm text-gray-500 mt-1">Track staff daily attendance and working hours</p>
          </div>
        </div>

        {/* Date Picker */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-10 max-w-xs"
          />
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Staff</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{staffMembers.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 font-medium">Present Today</div>
            <div className="text-2xl font-bold text-green-900 mt-1">{presentToday}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-sm text-red-600 font-medium">Absent Today</div>
            <div className="text-2xl font-bold text-red-900 mt-1">{absentToday}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Not Marked</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">{staffMembers.length - markedStaffToday.size}</div>
          </div>
        </div>

        {/* Attendance Marking */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Mark Attendance for {new Date(selectedDate).toLocaleDateString()}</h2>
          </div>

          {loading ? (
            <div className="p-6">Loading...</div>
          ) : staffMembers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No staff members found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Staff Name</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Position</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map((staff) => {
                    const record = todayRecords.find((a) => a.staffId === staff.id);
                    return (
                      <tr key={staff.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{staff.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{staff.position || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          {record ? (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                record.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : record.status === 'absent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {record.status.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Not marked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <PermissionGate module="accounts" action="create">
                            <button
                              onClick={() => handleMarkAttendance(staff.id, 'present')}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                record?.status === 'present'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              ✓ Present
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(staff.id, 'absent')}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                record?.status === 'absent' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              ✕ Absent
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(staff.id, 'half_day')}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                record?.status === 'half_day'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              }`}
                            >
                              ⊘ Half
                            </button>
                          </PermissionGate>
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Monthly Summary</h2>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded px-3 py-2 text-sm h-10 dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded border border-green-200">
              <div className="text-2xl font-bold text-green-900">{monthRecords.filter((a) => a.status === 'present').length}</div>
              <div className="text-sm text-green-600 mt-1">Present Days</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded border border-red-200">
              <div className="text-2xl font-bold text-red-900">{monthRecords.filter((a) => a.status === 'absent').length}</div>
              <div className="text-sm text-red-600 mt-1">Absent Days</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-900">{monthRecords.filter((a) => a.status === 'half_day').length}</div>
              <div className="text-sm text-yellow-600 mt-1">Half Days</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{monthRecords.filter((a) => a.status === 'leave').length}</div>
              <div className="text-sm text-blue-600 mt-1">Leaves</div>
            </div>
          </div>
        </div>
      </div>
    </ModuleAccessComponent>
  );
}
