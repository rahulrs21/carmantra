"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, Timestamp, where, getDocs } from 'firebase/firestore';
import { LeaveRequest, LeaveBalance, Employee } from '@/lib/types';
import { useUser } from '@/lib/userContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Calendar, Check, X, Clock, Shield, Plus } from 'lucide-react';
import { ModuleAccess, PermissionGate, ModuleAccessComponent } from '@/components/PermissionGate';

export default function LeavesPage() {
  const { user: currentUser, role: currentRole } = useUser();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<Record<string, LeaveBalance>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    type: 'casual' as const,
    startDate: '',
    endDate: '',
    reason: '',
  });

  const isAdmin = currentRole === 'admin' || currentRole === 'manager';
  const isEmployee = currentRole === 'viewer' || !isAdmin;

  // Fetch all leaves
  useEffect(() => {
    const q = query(collection(db, 'leaves'), orderBy('appliedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LeaveRequest[];
      setLeaves(data);
    });

    return () => unsubscribe();
  }, []);

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

  // Fetch leave balances
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'leaveBalance'));
        const balances: Record<string, any> = {};
        snapshot.docs.forEach((doc) => {
          balances[doc.data().employeeId] = doc.data() as LeaveBalance;
        });
        setLeaveBalances(balances);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leave balances:', error);
        setLoading(false);
      }
    };

    fetchBalances();
  }, []);

  const handleOpenDialog = () => {
    setFormData({
      type: 'casual',
      startDate: '',
      endDate: '',
      reason: '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'leaves'), {
        employeeId: currentUser?.uid || '',
        type: formData.type,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        reason: formData.reason,
        status: 'pending',
        appliedAt: Timestamp.now(),
      });

      toast.success('Leave request submitted');
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      toast.error('Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
    if (!isAdmin) {
      toast.error('You do not have permission to approve leaves');
      return;
    }

    try {
      await updateDoc(doc(db, 'leaves', leaveId), {
        status: 'approved',
        approvedBy: currentUser?.uid,
        approvedAt: Timestamp.now(),
      });

      toast.success('Leave approved');
      setIsApprovalDialogOpen(false);
      setSelectedLeave(null);
    } catch (error: any) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave');
    }
  };

  const handleReject = async (leaveId: string) => {
    if (!isAdmin) {
      toast.error('You do not have permission to reject leaves');
      return;
    }

    if (!rejectReason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await updateDoc(doc(db, 'leaves', leaveId), {
        status: 'rejected',
        rejectionReason: rejectReason,
        approvedBy: currentUser?.uid,
        approvedAt: Timestamp.now(),
      });

      toast.success('Leave rejected');
      setIsApprovalDialogOpen(false);
      setSelectedLeave(null);
      setRejectReason('');
    } catch (error: any) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave');
    }
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (filterStatus !== 'all' && leave.status !== filterStatus) return false;
    if (isEmployee && leave.employeeId !== currentUser?.uid) return false;
    return true;
  });

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Unknown';
  };

  const getDaysDifference = (startDate: any, endDate: any) => {
    const start = startDate.toDate?.() || new Date(startDate);
    const end = endDate.toDate?.() || new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatDate = (date: any) => {
    const d = date.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-IN');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ModuleAccessComponent module={ModuleAccess.LEAVES}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              <Calendar className="w-8 h-8" />
              Leaves
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage leave requests</p>
          </div>
          {isEmployee && (
            <PermissionGate module="leaves" action="create">
              <Button onClick={handleOpenDialog} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Request Leave
              </Button>
            </PermissionGate>
          )}
        </header>

        {/* Filter */}
        {isAdmin && (
          <div className="bg-white p-4 rounded-lg shadow">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Leaves List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-lg text-center text-gray-500">
              Loading leave requests...
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="bg-white p-8 rounded-lg text-center text-gray-500">
              No leave requests found
            </div>
          ) : (
            filteredLeaves.map((leave) => (
              <div key={leave.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{getEmployeeName(leave.employeeId)}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(leave.startDate)} to {formatDate(leave.endDate)} ({getDaysDifference(leave.startDate, leave.endDate)} days)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadgeColor(leave.status)}>
                      {leave.status}
                    </Badge>
                    <Badge variant="outline">{leave.type}</Badge>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{leave.reason}</p>

                {leave.status === 'rejected' && leave.rejectionReason && (
                  <Alert className="mb-4 border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      <strong>Rejection Reason:</strong> {leave.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                {isAdmin && leave.status === 'pending' && (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedLeave(leave);
                        setIsApprovalDialogOpen(true);
                        setRejectReason('');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedLeave(leave);
                        setIsApprovalDialogOpen(true);
                        setRejectReason('');
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Leave Request Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Leave Type *</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="earned">Earned</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="maternity">Maternity</SelectItem>
                      <SelectItem value="paternity">Paternity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Input
                    id="reason"
                    type="text"
                    placeholder="Why are you taking leave?"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedLeave?.status === 'pending' ? 'Approve/Reject Leave' : 'Leave Details'}
              </DialogTitle>
            </DialogHeader>

            {selectedLeave && (
              <div className="space-y-4 py-4">
                <div>
                  <h3 className="font-semibold">{getEmployeeName(selectedLeave.employeeId)}</h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Reason:</strong> {selectedLeave.reason}
                  </p>
                </div>

                {selectedLeave.status === 'pending' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="rejectReason">Rejection Reason (if rejecting)</Label>
                      <Input
                        id="rejectReason"
                        type="text"
                        placeholder="Optional - provide reason for rejection"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsApprovalDialogOpen(false);
                          setSelectedLeave(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleReject(selectedLeave.id!)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Reject
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleApprove(selectedLeave.id!)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ModuleAccessComponent>
  );
}
