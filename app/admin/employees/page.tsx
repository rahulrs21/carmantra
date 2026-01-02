"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Employee } from '@/lib/types';
import { useUser } from '@/lib/userContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2, Edit2, Search, Shield, Eye } from 'lucide-react';
import { ModuleAccess, PermissionGate, ModuleAccessComponent } from '@/components/PermissionGate';

export default function EmployeesPage() {
  const { role: currentRole, user } = useUser();
  const uid = user?.uid;
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '',
  });

  const isAdmin = currentRole === 'admin' || currentRole === 'manager';
  const isEmployee = currentRole === 'employee';
  const isAuthorized = isAdmin;

  useEffect(() => {
    if (isEmployee && uid) {
      // For employees, fetch only their own employee record
      const fetchCurrentEmployee = async () => {
        try {
          const { getDoc, doc: firebaseDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(firebaseDoc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.employeeId) {
              setCurrentEmployeeId(userData.employeeId);
              const empDoc = await getDoc(firebaseDoc(db, 'employees', userData.employeeId));
              if (empDoc.exists()) {
                const empData = empDoc.data() as Employee;
                empData.id = empDoc.id;
                setEmployees([empData]);
              }
            }
          }
          setLoading(false);
        } catch (error) {
          console.error('Error fetching employee data:', error);
          setLoading(false);
        }
      };
      fetchCurrentEmployee();
    } else if (isAdmin) {
      // For admins, fetch all employees
      const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Employee[];
        setEmployees(data);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching employees:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [isEmployee, isAdmin, uid]);

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      const joiningDate = employee.joiningDate?.toDate?.() || new Date(employee.joiningDate);
      setFormData({
        name: employee.name,
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department,
        position: employee.position,
        joiningDate: joiningDate.toISOString().split('T')[0],
        salary: employee.salary.toString(),
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        joiningDate: new Date().toISOString().split('T')[0],
        salary: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('You do not have permission to manage employees');
      return;
    }

    if (!formData.name || !formData.department || !formData.position || !formData.salary) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const employeeData = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        department: formData.department,
        position: formData.position,
        joiningDate: Timestamp.fromDate(new Date(formData.joiningDate)),
        salary: parseFloat(formData.salary),
        status: 'active' as const,
        updatedAt: Timestamp.now(),
      };

      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id!), employeeData);
        toast.success('Employee updated successfully');
      } else {
        await addDoc(collection(db, 'employees'), {
          ...employeeData,
          createdAt: Timestamp.now(),
        });
        toast.success('Employee added successfully');
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      toast.error(error.message || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!isAuthorized) {
      toast.error('You do not have permission to delete employees');
      return;
    }

    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await deleteDoc(doc(db, 'employees', employeeId));
      toast.success('Employee deleted successfully');
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin && !isEmployee) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to access employee information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ModuleAccessComponent module={ModuleAccess.EMPLOYEES}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              <Users className="w-8 h-8" />
              {isEmployee ? 'My Information' : 'Employees'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEmployee ? 'View your employee information' : 'Manage employee information'}
            </p>
          </div>
          {isAdmin && (
            <PermissionGate module="employees" action="create">
              <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </PermissionGate>
          )}
        </header>

        {/* Stats - Only for Admin */}
        {isAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-2xl font-bold text-indigo-600">{employees.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Active</div>
              <div className="text-2xl font-bold text-green-600">
                {employees.filter(e => e.status === 'active').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Inactive</div>
              <div className="text-2xl font-bold text-gray-600">
                {employees.filter(e => e.status === 'inactive').length}
              </div>
            </div>
          </div>
        )}

        {/* Search - Only for Admin */}
        {isAdmin && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, email, position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Employees List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading employees...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No employees found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Position</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Department</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-xs text-gray-500 sm:hidden">{employee.position}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{employee.position}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">{employee.department}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{employee.email || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            employee.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {employee.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-2">
                            <PermissionGate module="employees" action="view">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/admin/employees/${employee.id}`, '_blank')}
                                className="text-blue-600 hover:text-blue-700 bg-gray-50 hover:bg-gray-200"
                                title="View Employee Details (opens in new tab)"
                              >
                                View &nbsp; <Eye className="w-4 h-4" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate module="employees" action="edit">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(employee)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate module="employees" action="delete">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(employee.id!)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </PermissionGate>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Dialog - Only for Admin */}
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Update employee information' : 'Add a new employee to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Employee name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+971 50 454 1234"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    type="text"
                    placeholder="e.g., Sales Executive, Service Manager"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="joiningDate">Joining Date *</Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary (Monthly) *</Label>
                    <Input
                      id="salary"
                      type="number"
                      placeholder="50000"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingEmployee ? 'Update' : 'Add Employee'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        )}
      </div>
    </ModuleAccessComponent>
  );
}
