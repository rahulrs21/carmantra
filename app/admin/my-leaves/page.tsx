"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useUser } from '@/lib/userContext';
import { LeaveRequest, Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Plus, AlertCircle } from 'lucide-react';
import { ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';

export default function MyLeavesPage() {
  const { role, user, displayName } = useUser();
  const uid = user?.uid;
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'casual' as const,
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Get employee ID from current user
  useEffect(() => {
    if (!uid) return;

    const fetchEmployeeData = async () => {
      try {
        // Get employee data from current user
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.employeeId) {
            // Fetch employee details
            const empDoc = await getDoc(doc(db, 'employees', userData.employeeId));
            if (empDoc.exists()) {
              const empData = empDoc.data() as Employee;
              empData.id = empDoc.id;
              setEmployee(empData);

              // Fetch leaves for this employee
              const leavesQuery = query(
                collection(db, 'leaveRequests'),
                where('employeeId', '==', userData.employeeId)
              );

              const unsubscribe = onSnapshot(leavesQuery, (snapshot) => {
                const leavesData = snapshot.docs.map(doc => ({
                  ...doc.data() as LeaveRequest,
                  id: doc.id,
                }));
                setLeaves(leavesData.sort((a, b) => {
                  const aDate = a.startDate?.toDate?.() || new Date(a.startDate);
                  const bDate = b.startDate?.toDate?.() || new Date(b.startDate);
                  return bDate.getTime() - aDate.getTime();
                }));
                setLoading(false);
              });

              return unsubscribe;
            }
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching employee data:', error);
        toast.error('Failed to load employee data');
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee) {
      toast.error('Employee data not found');
      return;
    }

    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (startDate > endDate) {
      toast.error('Start date must be before end date');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'leaveRequests'), {
        employeeId: employee.id,
        type: formData.type,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        reason: formData.reason,
        status: 'pending',
        appliedAt: Timestamp.now(),
      });

      toast.success('Leave request submitted successfully. Awaiting approval from admin/manager.');
      setFormData({ type: 'casual', startDate: '', endDate: '', reason: '' });
      setShowDialog(false);
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error('Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading your leave requests...
      </div>
    );
  }

  return (
    <ModuleAccessComponent module={ModuleAccess.LEAVES}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Leaves</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your leave requests</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Apply for Leave
          </Button>
        </div>

        {/* Apply Leave Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request. It will be sent for approval to your admin or manager.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Leave Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="earned">Earned Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date *
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date *
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Please provide a reason for your leave"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={4}
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Filter */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>

        {/* Leaves List */}
        <div className="space-y-4">
          {leaves.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You haven't applied for any leave yet. Click "Apply for Leave" to submit a request.
              </AlertDescription>
            </Alert>
          ) : (
            leaves.filter((leave) => {
              const leaveDate = leave.startDate?.toDate?.() || new Date(leave.startDate);
              const leaveMonthStr = leaveDate.toISOString().slice(0, 7);
              return leaveMonthStr === filterMonth;
            }).map((leave) => {
              const startDate = leave.startDate?.toDate?.() || new Date(leave.startDate);
              const endDate = leave.endDate?.toDate?.() || new Date(leave.endDate);
              const appliedDate = leave.appliedAt?.toDate?.() || new Date(leave.appliedAt);

              return (
                <div
                  key={leave.id}
                  className={`p-4 rounded-lg border ${getStatusColor(leave.status)} dark:bg-gray-800 dark:border-gray-700`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {leave.type.charAt(0).toUpperCase() + leave.type.slice(1)} Leave
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(leave.status)}`}>
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Reason:</strong> {leave.reason}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Applied on: {appliedDate.toLocaleDateString()}
                  </p>

                  {leave.rejectionReason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      <strong>Rejection Reason:</strong> {leave.rejectionReason}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </ModuleAccessComponent>
  );
}
