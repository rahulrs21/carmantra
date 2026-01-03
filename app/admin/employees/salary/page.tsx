"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, Timestamp, getDocs, where } from 'firebase/firestore';
import { SalaryRecord, Employee } from '@/lib/types';
import { useUser } from '@/lib/userContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { DollarSign, Plus, Download, Eye, Shield } from 'lucide-react';
import { ModuleAccess, PermissionGate, ModuleAccessComponent } from '@/components/PermissionGate';

export default function SalaryPage() {
  const { role: currentRole } = useUser();
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    employeeId: '',
    month: '',
    baseSalary: '',
    daAllowance: '',
    hraAllowance: '',
    otherAllowance: '',
    incomeTax: '',
    providentFund: '',
    otherDeduction: '',
  });

  const isAuthorized = currentRole === 'admin' || currentRole === 'manager';

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

  // Fetch salaries
  useEffect(() => {
    const q = query(collection(db, 'salaryRecords'), orderBy('month', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SalaryRecord[];
      setSalaries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenDialog = (salary?: SalaryRecord) => {
    if (salary) {
      setSelectedSalary(salary);
      setFormData({
        employeeId: salary.employeeId,
        month: salary.month,
        baseSalary: salary.baseSalary.toString(),
        daAllowance: (salary.allowances?.DA || '').toString(),
        hraAllowance: (salary.allowances?.HRA || '').toString(),
        otherAllowance: (salary.allowances?.Other || '').toString(),
        incomeTax: (salary.deductions?.IncomeTax || '').toString(),
        providentFund: (salary.deductions?.PF || '').toString(),
        otherDeduction: (salary.deductions?.Other || '').toString(),
      });
    } else {
      setSelectedSalary(null);
      setFormData({
        employeeId: '',
        month: new Date().toISOString().slice(0, 7),
        baseSalary: '',
        daAllowance: '',
        hraAllowance: '',
        otherAllowance: '',
        incomeTax: '',
        providentFund: '',
        otherDeduction: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSalary(null);
  };

  const calculateNetSalary = () => {
    const base = parseFloat(formData.baseSalary) || 0;
    const da = parseFloat(formData.daAllowance) || 0;
    const hra = parseFloat(formData.hraAllowance) || 0;
    const other = parseFloat(formData.otherAllowance) || 0;
    const tax = parseFloat(formData.incomeTax) || 0;
    const pf = parseFloat(formData.providentFund) || 0;
    const otherDed = parseFloat(formData.otherDeduction) || 0;

    return base + da + hra + other - tax - pf - otherDed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthorized) {
      toast.error('You do not have permission to manage salaries');
      return;
    }

    if (!formData.employeeId || !formData.month || !formData.baseSalary) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);

    try {
      const baseSalary = parseFloat(formData.baseSalary);
      const allowances = {
        DA: parseFloat(formData.daAllowance) || 0,
        HRA: parseFloat(formData.hraAllowance) || 0,
        Other: parseFloat(formData.otherAllowance) || 0,
      };
      const deductions = {
        IncomeTax: parseFloat(formData.incomeTax) || 0,
        PF: parseFloat(formData.providentFund) || 0,
        Other: parseFloat(formData.otherDeduction) || 0,
      };

      const netSalary = calculateNetSalary();

      const salaryData = {
        employeeId: formData.employeeId,
        month: formData.month,
        baseSalary,
        allowances,
        deductions,
        netSalary,
        status: 'pending' as const,
        updatedAt: Timestamp.now(),
      };

      if (selectedSalary) {
        await updateDoc(doc(db, 'salaryRecords', selectedSalary.id!), salaryData);
        toast.success('Salary updated successfully');
      } else {
        await addDoc(collection(db, 'salaryRecords'), {
          ...salaryData,
          createdAt: Timestamp.now(),
        });
        toast.success('Salary record created');
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving salary:', error);
      toast.error('Failed to save salary record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (salaryId: string) => {
    if (!isAuthorized) {
      toast.error('You do not have permission to approve salaries');
      return;
    }

    try {
      await updateDoc(doc(db, 'salaryRecords', salaryId), {
        status: 'approved',
      });
      toast.success('Salary approved');
    } catch (error: any) {
      console.error('Error approving salary:', error);
      toast.error('Failed to approve salary');
    }
  };

  const handleMarkPaid = async (salaryId: string) => {
    if (!isAuthorized) {
      toast.error('You do not have permission to mark salaries as paid');
      return;
    }

    try {
      await updateDoc(doc(db, 'salaryRecords', salaryId), {
        status: 'paid',
        paidDate: Timestamp.now(),
      });
      toast.success('Salary marked as paid');
    } catch (error: any) {
      console.error('Error marking salary as paid:', error);
      toast.error('Failed to mark salary as paid');
    }
  };

  const filteredSalaries = salaries.filter((salary) => {
    if (filterMonth && salary.month !== filterMonth) return false;
    if (filterEmployee !== 'all' && salary.employeeId !== filterEmployee) return false;
    if (filterStatus !== 'all' && salary.status !== filterStatus) return false;
    return true;
  });

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to access salary management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ModuleAccessComponent module={ModuleAccess.EMPLOYEE_SALARY}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              <DollarSign className="w-8 h-8" />
              Salary Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage employee salaries and slips</p>
          </div>
          <PermissionGate module="salary" action="create">
            <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Salary
            </Button>
          </PermissionGate>
        </header>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Month</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Employee</Label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id!}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Salary Records */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-lg text-center text-gray-500">
              Loading salary records...
            </div>
          ) : filteredSalaries.length === 0 ? (
            <div className="bg-white p-8 rounded-lg text-center text-gray-500">
              No salary records found
            </div>
          ) : (
            filteredSalaries.map((salary) => (
              <div key={salary.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{getEmployeeName(salary.employeeId)}</h3>
                    <p className="text-sm text-gray-600">{salary.month}</p>
                  </div>
                  <Badge className={getStatusColor(salary.status)}>
                    {salary.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600">Base Salary</p>
                    <p className="font-semibold text-lg">AED {salary.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Allowances</p>
                    <p className="font-semibold text-lg">
                      AED {Object.values(salary.allowances || {}).reduce((a, b) => a + b, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Deductions</p>
                    <p className="font-semibold text-lg">
                      AED {Object.values(salary.deductions || {}).reduce((a, b) => a + b, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded">
                    <p className="text-gray-600 text-xs">Net Salary</p>
                    <p className="font-bold text-lg text-indigo-600">AED {salary.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedSalary(salary);
                      setIsViewDialogOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  <PermissionGate module="salary" action="edit">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(salary)}
                    >
                      Edit
                    </Button>
                  </PermissionGate>
                  {salary.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(salary.id!)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Approve
                    </Button>
                  )}
                  {salary.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkPaid(salary.id!)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Mark as Paid
                    </Button>
                  )}
                 
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSalary ? 'Edit Salary' : 'Add Salary Record'}</DialogTitle>
              <DialogDescription>
                {selectedSalary ? 'Update salary information' : 'Create a new salary record'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee *</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                      disabled={!!selectedSalary}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id!}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="month">Month *</Label>
                    <Input
                      id="month"
                      type="month"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      required
                      disabled={!!selectedSalary}
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-semibold text-sm">Earnings</h4>
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Base Salary *</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      placeholder="0"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="daAllowance">DA Allowance</Label>
                      <Input
                        id="daAllowance"
                        type="number"
                        placeholder="0"
                        value={formData.daAllowance}
                        onChange={(e) => setFormData({ ...formData, daAllowance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hraAllowance">HRA Allowance</Label>
                      <Input
                        id="hraAllowance"
                        type="number"
                        placeholder="0"
                        value={formData.hraAllowance}
                        onChange={(e) => setFormData({ ...formData, hraAllowance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otherAllowance">Other Allowance</Label>
                      <Input
                        id="otherAllowance"
                        type="number"
                        placeholder="0"
                        value={formData.otherAllowance}
                        onChange={(e) => setFormData({ ...formData, otherAllowance: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-semibold text-sm">Deductions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="incomeTax">Income Tax</Label>
                      <Input
                        id="incomeTax"
                        type="number"
                        placeholder="0"
                        value={formData.incomeTax}
                        onChange={(e) => setFormData({ ...formData, incomeTax: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="providentFund">Provident Fund</Label>
                      <Input
                        id="providentFund"
                        type="number"
                        placeholder="0"
                        value={formData.providentFund}
                        onChange={(e) => setFormData({ ...formData, providentFund: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otherDeduction">Other Deduction</Label>
                      <Input
                        id="otherDeduction"
                        type="number"
                        placeholder="0"
                        value={formData.otherDeduction}
                        onChange={(e) => setFormData({ ...formData, otherDeduction: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 bg-indigo-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Net Salary</p>
                  <p className="text-2xl font-bold text-indigo-600">AED {calculateNetSalary().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : selectedSalary ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Salary Slip</DialogTitle>
            </DialogHeader>
            {selectedSalary && (
              <div className="space-y-4 py-4 max-h-[80vh] overflow-y-auto">
                <div className="text-center border-b pb-4">
                  <h3 className="text-lg font-bold">{getEmployeeName(selectedSalary.employeeId)}</h3>
                  <p className="text-sm text-gray-600">{selectedSalary.month}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Earnings</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Base Salary</span>
                        <span>AED {selectedSalary.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {Object.entries(selectedSalary.allowances || {}).map(([key, value]) => (
                        value > 0 && (
                          <div key={key} className="flex justify-between">
                            <span>{key} Allowance</span>
                            <span>AED {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )
                      ))}
                      <div className="border-t pt-1 flex justify-between font-semibold">
                        <span>Total Earnings</span>
                        <span>
                          AED {(selectedSalary.baseSalary + Object.values(selectedSalary.allowances || {}).reduce((a, b) => a + b, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Deductions</h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(selectedSalary.deductions || {}).map(([key, value]) => (
                        value > 0 && (
                          <div key={key} className="flex justify-between">
                            <span>{key}</span>
                            <span>AED {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )
                      ))}
                      <div className="border-t pt-1 flex justify-between font-semibold">
                        <span>Total Deductions</span>
                        <span>AED {Object.values(selectedSalary.deductions || {}).reduce((a, b) => a + b, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Net Salary</span>
                      <span className="text-2xl font-bold text-indigo-600">AED {selectedSalary.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ModuleAccessComponent>
  );
}
