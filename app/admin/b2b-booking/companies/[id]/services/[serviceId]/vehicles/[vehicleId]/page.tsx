'use client';

import { use, useState, useEffect } from 'react';
import { useVehicleById, usePreInspections, useUpdateVehicle, useServiceById } from '@/hooks/useB2B';
import { useUser } from '@/lib/userContext';
import { activityService } from '@/lib/firestore/activity-service';
import { PreInspectionList } from '@/components/admin/b2b/PreInspectionList';
import { ActivityHistoryModal } from '@/components/ActivityHistoryModal';
import { ActivityHistoryButton } from '@/components/ActivityHistoryButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Trash2, Plus, Edit2, UserPlus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, onSnapshot, addDoc, Timestamp, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface VehicleDetailPageProps {
  params: Promise<{
    id: string;
    serviceId: string;
    vehicleId: string;
  }>;
}

const STATUS_BADGE_CONFIG = {
  pending: { variant: 'outline' as const, color: 'text-yellow-600' },
  'in-progress': { variant: 'secondary' as const, color: 'text-blue-600' },
  completed: { variant: 'secondary' as const, color: 'text-green-600' },
  cancelled: { variant: 'destructive' as const, color: 'text-red-600' },
};

export default function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { id, serviceId, vehicleId } = use(params);
  const { role, user } = useUser();
  const isEmployeeRole = role === 'employee';
  const [showActivityHistory, setShowActivityHistory] = useState(false);

  const { data: vehicle, isLoading: vehicleLoading } = useVehicleById(
    id,
    serviceId,
    vehicleId
  );
  const { data: service } = useServiceById(id, serviceId);
  const { preInspections, isLoading: preInspectionsLoading } = usePreInspections(
    id,
    serviceId,
    vehicleId
  );
  const updateVehicleMutation = useUpdateVehicle();
  const { toast } = useToast();

  const [status, setStatus] = useState<string>('');
  const [services, setServices] = useState<Array<{ id: string; description: string; amount: number }>>([]);
  const [newService, setNewService] = useState({ description: '', amount: 0 });
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<{ id: string; description: string; amount: number } | null>(null);
  const [draggedServiceId, setDraggedServiceId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showCompletionWarning, setShowCompletionWarning] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);

  // Task management states
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [observerUsers, setObserverUsers] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState<string>('N/A');
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '',
  });
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'service' as 'maintenance' | 'service' | 'inspection' | 'other',
    assignedTo: [] as string[],
    observedByUserId: '',
    observedByRole: '',
    observedByName: '',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Update status and services when vehicle data loads
  useEffect(() => {
    if (vehicle?.status) {
      setStatus(vehicle.status);
    }
    if (vehicle?.services && Array.isArray(vehicle.services)) {
      setServices(vehicle.services);
    }
  }, [vehicle]);

  // Fetch tasks for this vehicle
  useEffect(() => {
    if (!serviceId || !vehicleId) return;
    const taskQuery = query(
      collection(db, 'tasks'),
      where('serviceBookingId', '==', serviceId),
      where('vehicleId', '==', vehicleId)
    );
    const unsubscribe = onSnapshot(taskQuery, (snap) => {
      const fetchedTasks = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(fetchedTasks);
    });
    return () => unsubscribe();
  }, [serviceId, vehicleId]);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const empSnapshot = await getDocs(collection(db, 'employees'));
        const empList = empSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEmployees(empList);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch company name
  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        if (!id) return;
        const companySnapshot = await getDocs(collection(db, 'companies'));
        const company = companySnapshot.docs.find(doc => doc.id === id);
        if (company) {
          setCompanyName(company.data()?.name || 'N/A');
        }
      } catch (error) {
        console.error('Error fetching company name:', error);
      }
    };
    fetchCompanyName();
  }, [id]);

  // Fetch observer users from users collection
  useEffect(() => {
    const fetchObserverUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const usersList = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.displayName || data.name || 'User',
              role: data.role || '',
            };
          })
          .filter(user => ['admin', 'manager', 'sales', 'accounts'].includes(user.role))
          .sort((a, b) => a.name.localeCompare(b.name));
        setObserverUsers(usersList);
      } catch (error) {
        console.error('Error fetching observer users:', error);
      }
    };
    fetchObserverUsers();
  }, []);

  const handleOpenEmployeeDialog = (employee?: any) => {
    if (employee) {
      setEditingEmployee(employee);
      const joiningDate = employee.joiningDate?.toDate?.() || new Date(employee.joiningDate);
      setEmployeeFormData({
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
      setEmployeeFormData({
        name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        joiningDate: new Date().toISOString().split('T')[0],
        salary: '',
      });
    }
    setIsEmployeeDialogOpen(true);
  };

  const handleCloseEmployeeDialog = () => {
    setIsEmployeeDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeFormData.name || !employeeFormData.department || !employeeFormData.position || !employeeFormData.salary) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setEmployeeSubmitting(true);

    try {
      const employeeData = {
        name: employeeFormData.name,
        email: employeeFormData.email || null,
        phone: employeeFormData.phone || null,
        department: employeeFormData.department,
        position: employeeFormData.position,
        joiningDate: Timestamp.fromDate(new Date(employeeFormData.joiningDate)),
        salary: parseFloat(employeeFormData.salary),
        status: 'active' as const,
        updatedAt: Timestamp.now(),
      };

      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id!), employeeData);
        toast({
          title: 'Success',
          description: 'Employee updated successfully',
        });

        // Log activity
        await activityService.logActivity({
          companyId: id,
          activityType: 'service_updated',
          description: `Employee updated - ${employeeFormData.name} (${employeeFormData.position} in ${employeeFormData.department})`,
          userId: user?.uid || 'unknown',
          userName: user?.displayName || 'Unknown User',
          userEmail: user?.email || 'unknown@email.com',
          userRole: role || 'unknown',
          metadata: {
            employeeId: editingEmployee.id,
            employeeName: employeeFormData.name,
            position: employeeFormData.position,
            department: employeeFormData.department,
            email: employeeFormData.email,
            phone: employeeFormData.phone,
          },
        });
      } else {
        const newEmployeeDoc = await addDoc(collection(db, 'employees'), {
          ...employeeData,
          createdAt: Timestamp.now(),
        });
        
        // Immediately add the new employee to the state so it appears in the list
        const newEmployee = {
          id: newEmployeeDoc.id,
          ...employeeData,
          createdAt: Timestamp.now(),
        };
        setEmployees([...employees, newEmployee]);
        
        toast({
          title: 'Success',
          description: 'Employee added successfully',
        });

        // Log activity
        await activityService.logActivity({
          companyId: id,
          activityType: 'service_updated',
          description: `New employee added - ${employeeFormData.name} (${employeeFormData.position} in ${employeeFormData.department})`,
          userId: user?.uid || 'unknown',
          userName: user?.displayName || 'Unknown User',
          userEmail: user?.email || 'unknown@email.com',
          userRole: role || 'unknown',
          metadata: {
            employeeName: employeeFormData.name,
            position: employeeFormData.position,
            department: employeeFormData.department,
            email: employeeFormData.email,
            phone: employeeFormData.phone,
            joiningDate: employeeFormData.joiningDate,
            salary: employeeFormData.salary,
          },
        });
        
        // Reset form but keep dialog open
        setEmployeeFormData({
          name: '',
          email: '',
          phone: '',
          department: '',
          position: '',
          joiningDate: new Date().toISOString().split('T')[0],
          salary: '',
        });
      }
    } catch (error: any) {
      console.error('Error saving employee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save employee',
        variant: 'destructive',
      });
    } finally {
      setEmployeeSubmitting(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskData.title || newTaskData.assignedTo.length === 0 || !newTaskData.observedByUserId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const assignedToNames = newTaskData.assignedTo
        .map(empId => employees.find(e => e.id === empId)?.name)
        .filter(Boolean);

      const taskData = {
        title: newTaskData.title,
        description: newTaskData.description,
        priority: newTaskData.priority,
        category: newTaskData.category,
        assignedTo: newTaskData.assignedTo,
        assignedToNames,
        observedByUserId: newTaskData.observedByUserId,
        observedByRole: newTaskData.observedByRole,
        observedByName: newTaskData.observedByName,
        status: 'notStarted',
        deadline: new Date(newTaskData.deadline),
        serviceBookingId: serviceId,
        vehicleId: vehicleId,
        companyId: id,
        jobCardNo: service?.jobCardNo,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'tasks'), taskData);
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });

      // Log activity
      await activityService.logActivity({
        companyId: id,
        activityType: 'service_updated',
        description: `Task created - "${newTaskData.title}" assigned to ${newTaskData.assignedTo.length} employee(s)`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          vehicleId: vehicleId,
          vehiclePlate: vehicle?.plateNumber,
          taskTitle: newTaskData.title,
          assignedToCount: newTaskData.assignedTo.length,
          priority: newTaskData.priority,
          category: newTaskData.category,
          deadline: newTaskData.deadline,
        },
      });

      setShowAddTaskModal(false);
      setNewTaskData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'service',
        assignedTo: [],
        observedByUserId: '',
        observedByRole: '',
        observedByName: '',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    // Check if trying to mark as completed without services
    if (newStatus === 'completed' && services.length === 0) {
      setShowCompletionWarning(true);
      setPendingStatusChange(newStatus);
      return;
    }

    try {
      setStatus(newStatus);
      await updateVehicleMutation.mutateAsync({
        companyId: id,
        serviceId,
        vehicleId,
        data: { status: newStatus },
      });

      // Log activity
      await activityService.logActivity({
        companyId: id,
        activityType: 'service_updated',
        description: `Vehicle ${vehicle?.plateNumber} status changed to "${newStatus}"`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          vehicleId: vehicleId,
          vehiclePlate: vehicle?.plateNumber,
          newStatus: newStatus,
        },
      });

      toast({
        title: 'Success',
        description: `Vehicle status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update vehicle status',
        variant: 'destructive',
      });
      // Revert status
      if (vehicle?.status) {
        setStatus(vehicle.status);
      }
    }
  };

  const handleForceCompletion = async () => {
    if (!pendingStatusChange) return;
    try {
      setStatus(pendingStatusChange);
      await updateVehicleMutation.mutateAsync({
        companyId: id,
        serviceId,
        vehicleId,
        data: { status: pendingStatusChange },
      });
      toast({
        title: 'Success',
        description: `Vehicle status updated to ${pendingStatusChange}`,
      });
      setShowCompletionWarning(false);
      setPendingStatusChange(null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update vehicle status',
        variant: 'destructive',
      });
      if (vehicle?.status) {
        setStatus(vehicle.status);
      }
    }
  };

  const handleAddService = async () => {
    if (!newService.description || newService.amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter service description and amount',
        variant: 'destructive',
      });
      return;
    }

    const serviceToAdd = {
      id: `service-${Date.now()}`,
      description: newService.description,
      amount: newService.amount,
    };

    const updatedServices = [...services, serviceToAdd];
    setServices(updatedServices);
    setNewService({ description: '', amount: 0 });
    setShowAddService(false);

    // Persist to Firebase
    try {
      await updateVehicleMutation.mutateAsync({
        companyId: id,
        serviceId,
        vehicleId,
        data: { services: updatedServices },
      });

      // Log activity
      await activityService.logActivity({
        companyId: id,
        activityType: 'service_updated',
        description: `Service added to vehicle ${vehicle?.plateNumber} - ${newService.description} (AED ${newService.amount})`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          vehicleId: vehicleId,
          vehiclePlate: vehicle?.plateNumber,
          serviceDescription: newService.description,
          serviceAmount: newService.amount,
        },
      });

      toast({
        title: 'Success',
        description: 'Service added successfully',
      });
    } catch (error) {
      console.error('Error saving service:', error);
      // Revert on error
      setServices(services);
      toast({
        title: 'Error',
        description: 'Failed to save service',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteService = async (itemServiceId: string) => {
    const deletedService = services.find(s => s.id === itemServiceId);
    const updatedServices = services.filter(s => s.id !== itemServiceId);
    setServices(updatedServices);
    setDeleteConfirmId(null);

    // Persist to Firebase
    try {
      await updateVehicleMutation.mutateAsync({
        companyId: id,
        serviceId,
        vehicleId,
        data: { services: updatedServices },
      });

      // Log activity
      await activityService.logActivity({
        companyId: id,
        activityType: 'service_updated',
        description: `Service deleted from vehicle ${vehicle?.plateNumber} - ${deletedService?.description} (AED ${deletedService?.amount})`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          vehicleId: vehicleId,
          vehiclePlate: vehicle?.plateNumber,
          deletedServiceDescription: deletedService?.description,
          deletedServiceAmount: deletedService?.amount,
        },
      });

      toast({
        title: 'Success',
        description: 'Service removed',
      });
    } catch (error) {
      console.error('Error removing service:', error);
      // Revert on error
      setServices(services);
      toast({
        title: 'Error',
        description: 'Failed to remove service',
        variant: 'destructive',
      });
    }
  };

  const handleEditService = (service: { id: string; description: string; amount: number }) => {
    setEditingService({ ...service });
  };

  const handleUpdateService = async () => {
    if (!editingService || !editingService.description || editingService.amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter service description and amount',
        variant: 'destructive',
      });
      return;
    }

    const updatedServices = services.map(s =>
      s.id === editingService.id
        ? { ...s, description: editingService.description, amount: editingService.amount }
        : s
    );
    setServices(updatedServices);
    setEditingService(null);

    // Persist to Firebase
    try {
      await updateVehicleMutation.mutateAsync({
        companyId: id,
        serviceId,
        vehicleId,
        data: { services: updatedServices },
      });

      // Log activity
      await activityService.logActivity({
        companyId: id,
        activityType: 'service_updated',
        description: `Service updated for vehicle ${vehicle?.plateNumber} - ${editingService.description} (AED ${editingService.amount})`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          vehicleId: vehicleId,
          vehiclePlate: vehicle?.plateNumber,
          serviceDescription: editingService.description,
          serviceAmount: editingService.amount,
        },
      });

      toast({
        title: 'Success',
        description: 'Service updated successfully',
      });
    } catch (error) {
      console.error('Error updating service:', error);
      // Revert on error
      setServices(services);
      toast({
        title: 'Error',
        description: 'Failed to update service',
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, serviceId: string) => {
    setDraggedServiceId(serviceId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetServiceId: string) => {
    e.preventDefault();
    if (!draggedServiceId || draggedServiceId === targetServiceId) {
      setDraggedServiceId(null);
      return;
    }

    const draggedIndex = services.findIndex(s => s.id === draggedServiceId);
    const targetIndex = services.findIndex(s => s.id === targetServiceId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedServiceId(null);
      return;
    }

    const newServices = [...services];
    const [draggedItem] = newServices.splice(draggedIndex, 1);
    newServices.splice(targetIndex, 0, draggedItem);

    setServices(newServices);
    setDraggedServiceId(null);

    // Persist to Firebase
    try {
      await updateVehicleMutation.mutateAsync({
        companyId: id,
        serviceId,
        vehicleId,
        data: { services: newServices },
      });
      toast({
        title: 'Success',
        description: 'Service order updated',
      });
    } catch (error) {
      console.error('Error reordering services:', error);
      // Revert on error
      setServices(services);
      toast({
        title: 'Error',
        description: 'Failed to reorder services',
        variant: 'destructive',
      });
    }
  };

  const totalServiceAmount = services.reduce((sum, s) => sum + s.amount, 0);
  const displayServiceCost = status === 'completed' ? totalServiceAmount : 0;

  if (vehicleLoading) {
    return <div className="p-8 text-center">Loading vehicle details...</div>;
  }

  if (!vehicle) {
    return <div className="p-8 text-center text-red-600">Vehicle not found</div>;
  }

  return (
    <div className="container mx-auto pb-4 px-2 md:px-4">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row  items-center gap-4">

        <div className='flex justify-between md:justify-start gap-2 w-full items-center'>

          {!isEmployeeRole && (
            <Link
              href={`/admin/b2b-booking/companies/${id}/services/${serviceId}`}
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ChevronLeft size={16} />
                Back
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-3xl font-bold">{vehicle.brand} {vehicle.model} </h1>
            <p className="text-gray-600">Plate: {vehicle.plateNumber}</p>
          </div>
        </div>

        <div className="bg-blue-100 flex justify-center items-center dark:bg-gray-800 rounded-lg px-4 py-2  md:ml-auto">
          {service?.jobCardNo && (
            <p className="text-sm sm:text-base">Job Card: <span className='font-semibold'>{service?.jobCardNo || '-'}</span></p>
          )}
        </div>
      </div>

      {/* Service Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Service Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold text-purple-500">{service?.title || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{service?.type || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Company Name</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{companyName}</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plate Number</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-mono font-semibold">{vehicle.plateNumber}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{vehicle.brand}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Model</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{vehicle.model}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Year</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{vehicle.year || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Service Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-green-600">
              AED {displayServiceCost.toLocaleString('en-AE')}
            </p>
            {status !== 'completed' && (
              <p className="text-xs text-gray-500 mt-1">
                Will calculate when status is Completed
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status and Other Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">


        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Color: <p className="text-lg font-semibold">{vehicle.color || '-'}</p></CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-xs'>Notes: <span className="text-xs font-semibold"> {vehicle.notes || '-'}</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">VIN Number</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono">{vehicle.vin || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fuel Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{vehicle.fuelType || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Status</CardTitle>

              {status !== 'completed' && (

                <div className="group relative cursor-help">
                  <div className="w-4 h-4 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold">!</div>
                  <div className="absolute -top-3 -left-2 md:left-1/3 transform translate-x-1/2  px-3 py-2 bg-yellow-600 text-white text-xs rounded-lg whitespace-nowrap  transition-opacity pointer-events-none z-50 animate-pulse">
                    Select 'Completed' when done
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Select value={status} onValueChange={handleStatusChange} disabled={updateVehicleMutation.isPending || isEmployeeRole}>
              <SelectTrigger className={`w-full ${isEmployeeRole ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                {/* <SelectItem value="in-progress">In Progress</SelectItem> */}
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>


      </div>



      {/* Services Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Services</CardTitle>
              <CardDescription>Service description and amounts</CardDescription>
            </div>
            {!showAddService && (
              <Button
                size="sm"
                onClick={() => setShowAddService(true)}
                className="gap-2"
                disabled={isEmployeeRole}
              >
                <Plus size={16} />
                Add Service
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showAddService && (
            <div className="mb-6 p-4 border rounded-lg bg-blue-50">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Service Description
                  </label>
                  <Textarea
                    placeholder="Enter service description (e.g., Car Wash, Polishing, etc.)"
                    value={newService.description}
                    onChange={(e) =>
                      setNewService({ ...newService, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Amount (AED)
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={newService.amount || ''}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddService}>
                    Add Service
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddService(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {services.length > 0 ? (
            <div className="space-y-3">
              {services.map((service, index) => (
                <div
                  key={service.id}
                  draggable={!isEmployeeRole}
                  onDragStart={(e) => !isEmployeeRole && handleDragStart(e, service.id)}
                  onDragOver={!isEmployeeRole ? handleDragOver : undefined}
                  onDrop={(e) => !isEmployeeRole && handleDrop(e, service.id)}
                  className={`flex items-start justify-between p-3 border rounded-lg transition-all ${isEmployeeRole ? 'cursor-not-allowed ' : 'cursor-move'} ${draggedServiceId === service.id
                    ? 'opacity-90 bg-blue-100'
                    : 'hover:bg-gray-50'
                    }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {service.description}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Amount: <span className="font-semibold text-green-600">AED {service.amount.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditService(service)}
                      disabled={isEmployeeRole}
                      className={`text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${isEmployeeRole ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(service.id)}
                      disabled={isEmployeeRole}
                      className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${isEmployeeRole ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Total Services Amount:</span>
                  <span className="text-lg font-bold text-green-600">
                    AED {totalServiceAmount.toFixed(2)}
                  </span>
                </div>
                {status !== 'completed' && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Amount will be reflected in Service Cost once status is marked as Completed
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>No services added yet</p>
              <p className="text-sm mt-1">Click "Add Service" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Tasks Card */}
      <Card className="mb-6 p-3 md:p-6 border-2 border-blue-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-blue-700">Assigned Tasks ({tasks.length})</h2>
          </div>
          {!isEmployeeRole && service?.status !== 'cancelled' && service?.status !== 'completed' && (
            <Button
              onClick={() => {
                if (services.length === 0) {
                  alert('⚠️ Please add at least 1 service before creating a task');
                  return;
                }
                setShowAddTaskModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-sm w-full sm:w-auto"
              size="sm"
            >
              + Add Task
            </Button>
          )}
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500">No tasks assigned yet</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="p-3 sm:p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-base text-gray-900 break-words">{task.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{task.jobCardNo}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-gray-600">Assigned To:</span>
                    <p className="font-medium text-gray-900">{task.assignedToNames?.join(', ') || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Observed By:</span>
                    <p className="font-medium text-gray-900">{task.observedByName ? `${task.observedByName} (${task.observedByRole})` : '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p className={`font-medium ${task.status === 'notStarted' ? 'text-red-800 bg-red-200 mx-2 px-2 py-1 rounded inline-block' :
                      task.status === 'completed' ? 'text-yellow-800 bg-yellow-200 mx-2 px-2 py-1 rounded inline-block' :
                        task.status === 'inProgress' ? 'text-blue-800 bg-blue-200 mx-2 px-2 py-1 rounded inline-block' :
                          'text-green-800 bg-green-300 mx-2 px-2 py-1 rounded inline-block'
                      }`}>
                      {task.status === 'notStarted' ? 'Not Started' :
                        task.status === 'inProgress' ? 'In Progress' :
                          task.status === 'completed' ? 'Completed' :
                            'Verified'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Deadline:</span>
                    <p className="font-medium text-gray-900">
                      {(() => {
                        const date = new Date(task.deadline.seconds ? task.deadline.seconds * 1000 : task.deadline);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()}
                    </p>
                  </div>
                </div>

                {task.description && (
                  <p className="text-xs text-gray-600 mb-2 break-words">Description: {task.description}</p>
                )}

                {!isEmployeeRole && (
                  <div className="flex gap-2">
                    <Link href={`/admin/tasks/${task.id}`} target="_blank">
                      <Button variant="ghost" size="sm" className="text-xs bg-black/5 hover:bg-black/10 text-black">
                        View Task
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pre-Inspections Section */}
      <div className="mb-6">
        <PreInspectionList
          companyId={id}
          serviceId={serviceId}
          vehicleId={vehicleId}
          preInspections={preInspections}
          isLoading={preInspectionsLoading}
          onRefresh={() => window.location.reload()}
        />
      </div>



      {/* Add Task Modal */}
      {showAddTaskModal && (
        <Dialog open={showAddTaskModal} onOpenChange={setShowAddTaskModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Task for {service?.jobCardNo}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title</label>
                <Input
                  type="text"
                  placeholder="Enter task title"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData(prev => ({
                    ...prev,
                    title: e.target.value,
                  }))}
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
              </div>

              {/* Employees */}
              <div>
                <div className='flex justify-between items-center'>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assign To</label>
                  <Button onClick={() => handleOpenEmployeeDialog()} className="bg-indigo-600 hover:bg-indigo-700 mb-3">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Employee
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                  {employees.length === 0 ? (
                    <p className="text-sm text-gray-500 col-span-2">No employees found</p>
                  ) : (
                    employees.map(emp => (
                      <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTaskData.assignedTo.includes(emp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTaskData(prev => ({
                                ...prev,
                                assignedTo: [...prev.assignedTo, emp.id],
                              }));
                            } else {
                              setNewTaskData(prev => ({
                                ...prev,
                                assignedTo: prev.assignedTo.filter(id => id !== emp.id),
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">{emp.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Observer User */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Observed By</label>
                <select
                  value={newTaskData.observedByUserId}
                  onChange={(e) => {
                    const selectedUser = observerUsers.find(u => u.id === e.target.value);
                    setNewTaskData(prev => ({
                      ...prev,
                      observedByUserId: e.target.value,
                      observedByRole: (selectedUser?.role as 'admin' | 'manager' | 'sales' | 'accounts') || '',
                      observedByName: selectedUser?.name || '',
                    }));
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select Observer...</option>
                  {observerUsers.length === 0 ? (
                    <option disabled>No users found with admin roles</option>
                  ) : (
                    observerUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user?.name || 'Unknown User'} - {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </option>
                    ))
                  )}
                </select>
                {newTaskData.observedByName && (
                  <p className="text-xs text-gray-600 mt-1">
                    Selected: {newTaskData?.observedByName || 'Unknown'}
                  </p>
                )}
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    value={newTaskData.priority}
                    onChange={(e) => setNewTaskData(prev => ({
                      ...prev,
                      priority: e.target.value as any,
                    }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    value={newTaskData.category}
                    onChange={(e) => setNewTaskData(prev => ({
                      ...prev,
                      category: e.target.value as any,
                    }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="service">Service</option>
                    <option value="inspection">Inspection</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData(prev => ({
                    ...prev,
                    description: e.target.value,
                  }))}
                  placeholder="Enter task details and instructions..."
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline</label>
                <Input
                  type="date"
                  value={newTaskData.deadline}
                  onChange={(e) => setNewTaskData(prev => ({
                    ...prev,
                    deadline: e.target.value,
                  }))}
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddTaskModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTask}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Completion Warning Dialog */}
      <AlertDialog open={showCompletionWarning} onOpenChange={(open) => !open && (setShowCompletionWarning(false), setPendingStatusChange(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">⚠️ No Services Added</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You're trying to mark this vehicle as <span className="font-semibold">Completed</span> without adding any services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 my-4">
            <p className="text-sm text-orange-900 mb-3">
              <span className="font-semibold">⚠️ Warning:</span> It's recommended to add at least one service before marking as completed. Services define the work performed and the cost associated with this vehicle.
            </p>
            <ul className="text-sm text-orange-800 space-y-2 ml-4">
              <li>• <span className="font-semibold">Service Cost Calculation:</span> Total service cost will be $0 if no services are added</li>
              <li>• <span className="font-semibold">Record Keeping:</span> Services help document the work performed</li>
              <li>• <span className="font-semibold">Billing:</span> Services are required for accurate billing</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel className="flex-1">
              Cancel & Add Services
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceCompletion}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Mark as Completed Anyway
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? 'Update employee information' : 'Add a new employee to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEmployeeSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Employee name"
                  value={employeeFormData.name}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
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
                    value={employeeFormData.email}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+971 50 454 1234"
                    value={employeeFormData.phone}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select value={employeeFormData.department} onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, department: value })}>
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
                  value={employeeFormData.position}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, position: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Joining Date *</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    value={employeeFormData.joiningDate}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, joiningDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary (Monthly) *</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="50000"
                    value={employeeFormData.salary}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, salary: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseEmployeeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={employeeSubmitting}>
                {employeeSubmitting ? 'Saving...' : editingEmployee ? 'Update' : 'Add Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-gray-50 p-3 rounded-lg my-2">
            {services.find(s => s.id === deleteConfirmId) && (
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {services.find(s => s.id === deleteConfirmId)?.description}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Amount: AED {services.find(s => s.id === deleteConfirmId)?.amount.toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteService(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Service Dialog */}
      <AlertDialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Service</AlertDialogTitle>
          </AlertDialogHeader>
          {editingService && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Service Description
                </label>
                <Textarea
                  placeholder="Enter service description"
                  value={editingService.description}
                  onChange={(e) =>
                    setEditingService({ ...editingService, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Amount (AED)
                </label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={editingService.amount || ''}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="1"
                />
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={handleUpdateService}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Update Service
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity History Button */}
      <ActivityHistoryButton onClick={() => setShowActivityHistory(true)} />

      {/* Activity History Modal */}
      <ActivityHistoryModal
        companyId={id}
        isOpen={showActivityHistory}
        onClose={() => setShowActivityHistory(false)}
      />
    </div>
  );
}
