'use client';

import { useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddVehicle, useUpdateVehicle } from '@/hooks/useB2B';
import { VehicleFormData } from '@/lib/types/b2b.types';
import { Plus, Edit } from 'lucide-react';
import { UserContext } from '@/lib/userContext';
import { useToast } from '@/hooks/use-toast';
import { activityService } from '@/lib/firestore/activity-service';

const vehicleSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce.number().int().optional(),
  color: z.string().optional(),
  vin: z.string().optional(),
  vehicleType: z.string().optional(),
  fuelType: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

type VehicleSchemaType = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  companyId: string;
  serviceId: string;
  vehicle?: any; // For edit mode
  onSuccess?: () => void;
  trigger?: React.ReactNode; // Custom trigger for edit button
  disabled?: boolean; // Disable add/edit for employee role
}

export function VehicleForm({ companyId, serviceId, vehicle, onSuccess, trigger, disabled = false }: VehicleFormProps) {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const role = userContext?.role || 'unknown';
  const addVehicle = useAddVehicle();
  const updateVehicle = useUpdateVehicle();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const isEditMode = !!vehicle;

  const form = useForm<VehicleSchemaType>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: isEditMode
      ? {
          plateNumber: vehicle?.plateNumber || '',
          brand: vehicle?.brand || '',
          model: vehicle?.model || '',
          year: vehicle?.year || new Date().getFullYear(),
          color: vehicle?.color || '',
          vin: vehicle?.vin || '',
          vehicleType: vehicle?.vehicleType || '',
          fuelType: vehicle?.fuelType || '',
          notes: vehicle?.notes || '',
          status: vehicle?.status || 'pending',
        }
      : {
          plateNumber: '',
          brand: '',
          model: '',
          year: new Date().getFullYear(),
          color: '',
          vin: '',
          vehicleType: '',
          fuelType: '',
          notes: '',
          status: 'pending',
        },
  });

  async function onSubmit(data: VehicleSchemaType) {
    try {
      if (!user?.uid) {
        console.error('User not authenticated');
        return;
      }

      const formData: VehicleFormData = {
        plateNumber: data.plateNumber,
        brand: data.brand,
        model: data.model,
        year: data.year,
        color: data.color,
        serviceCost: 0,
        vin: data.vin,
        vehicleType: data.vehicleType,
        fuelType: data.fuelType,
        notes: data.notes,
      };

      if (isEditMode) {
        await updateVehicle.mutateAsync({
          companyId,
          serviceId,
          vehicleId: vehicle.id,
          data: { ...formData, status: data.status },
        });

        // Log activity for vehicle update
        await activityService.logActivity({
          companyId,
          activityType: 'service_updated',
          description: `Vehicle updated - ${data.brand} ${data.model} (${data.plateNumber})`,
          userId: user.uid,
          userName: user.displayName || 'Unknown User',
          userEmail: user.email || 'unknown@email.com',
          userRole: role,
          metadata: {
            serviceId: serviceId,
            vehicleId: vehicle.id,
            vehiclePlate: data.plateNumber,
            brand: data.brand,
            model: data.model,
            year: data.year,
            color: data.color,
            vin: data.vin,
            vehicleType: data.vehicleType,
            fuelType: data.fuelType,
          },
        });

        toast({ title: 'Vehicle updated successfully' });
      } else {
        await addVehicle.mutateAsync({
          companyId,
          serviceId,
          data: formData,
          userId: user.uid,
        });

        // Log activity for vehicle creation
        await activityService.logActivity({
          companyId,
          activityType: 'service_updated',
          description: `Vehicle added - ${data.brand} ${data.model} (${data.plateNumber})`,
          userId: user.uid,
          userName: user.displayName || 'Unknown User',
          userEmail: user.email || 'unknown@email.com',
          userRole: role,
          metadata: {
            serviceId: serviceId,
            vehiclePlate: data.plateNumber,
            brand: data.brand,
            model: data.model,
            year: data.year,
            color: data.color,
            vin: data.vin,
            vehicleType: data.vehicleType,
            fuelType: data.fuelType,
          },
        });

        toast({ title: 'Vehicle added successfully' });
      }

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error with vehicle:', error);
      toast({ title: 'Error', description: 'Failed to save vehicle', variant: 'destructive' });
    }
  }

  const isLoading = isEditMode ? updateVehicle.isPending : addVehicle.isPending;

  return (
    <Dialog open={open} onOpenChange={disabled ? undefined : setOpen}>
      <DialogTrigger asChild disabled={disabled}>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" className="gap-2" disabled={disabled}>
            <Plus size={16} />
            Add Vehicle
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Vehicle' : 'Add Vehicle to Service'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plate Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., DL-01-AB-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Camry" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 2023" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Silver" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="hatchback">Hatchback</SelectItem>
                        <SelectItem value="coupe">Coupe</SelectItem>
                        <SelectItem value="convertible">Convertible</SelectItem>
                        <SelectItem value="wagon">Wagon</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., WVWZZZ3CZ5E000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Petrol, Diesel, Hybrid" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditMode && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any specific notes about this vehicle..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
              <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Vehicle' : 'Add Vehicle')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

