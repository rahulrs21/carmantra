'use client';

import { use, useState, useEffect } from 'react';
import { useVehicleById, usePreInspections, useUpdateVehicle } from '@/hooks/useB2B';
import { PreInspectionList } from '@/components/admin/b2b/PreInspectionList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Trash2, Plus, Edit2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const { data: vehicle, isLoading: vehicleLoading } = useVehicleById(
    id,
    serviceId,
    vehicleId
  );
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

  // Update status and services when vehicle data loads
  useEffect(() => {
    if (vehicle?.status) {
      setStatus(vehicle.status);
    }
    if (vehicle?.services && Array.isArray(vehicle.services)) {
      setServices(vehicle.services);
    }
  }, [vehicle]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setStatus(newStatus);
      await updateVehicleMutation.mutateAsync({
        companyId: id,
        serviceId,
        vehicleId,
        data: { status: newStatus },
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

  const handleDeleteService = async (serviceId: string) => {
    const updatedServices = services.filter(s => s.id !== serviceId);
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
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/admin/b2b-booking/companies/${id}/services/${serviceId}`}
        >
          <Button variant="outline" size="sm" className="gap-2">
            <ChevronLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{vehicle.brand} {vehicle.model}</h1>
          <p className="text-gray-600">Plate: {vehicle.plateNumber}</p>
        </div>
      </div>

      {/* Vehicle Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={status} onValueChange={handleStatusChange} disabled={updateVehicleMutation.isPending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Color</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{vehicle.color || '-'}</p>
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

        {/* <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pre-Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{vehicle.preInspectionCount || 0}</p>
          </CardContent>
        </Card> */}
      </div>

      {/* Vehicle Notes */}
      {vehicle.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vehicle Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{vehicle.notes}</p>
          </CardContent>
        </Card>
      )}

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
                  draggable
                  onDragStart={(e) => handleDragStart(e, service.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, service.id)}
                  className={`flex items-start justify-between p-3 border rounded-lg transition-all cursor-move ${
                    draggedServiceId === service.id
                      ? 'opacity-50 bg-blue-100'
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
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(service.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

      {/* Pre-Inspections Section */}
      <div>
        <PreInspectionList
          companyId={id}
          serviceId={serviceId}
          vehicleId={vehicleId}
          preInspections={preInspections}
          isLoading={preInspectionsLoading}
          onRefresh={() => window.location.reload()}
        />
      </div>

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
    </div>
  );
}
