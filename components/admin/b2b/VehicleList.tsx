'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { B2BVehicle } from '@/lib/types/b2b.types';
import { VehicleForm } from './VehicleForm';
import Link from 'next/link';
import { ArrowRight, ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { useDeleteVehicle } from '@/hooks/useB2B';
import { useToast } from '@/hooks/use-toast';
import { activityService } from '@/lib/firestore/activity-service';
import { useUser } from '@/lib/userContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VehicleListProps {
  companyId: string;
  serviceId: string;
  vehicles: B2BVehicle[];
  isLoading: boolean;
  onRefresh: () => void;
  onServiceTotalCalculated?: (serviceId: string, total: number) => void;
  disabled?: boolean;
}

export function VehicleList({
  companyId,
  serviceId,
  vehicles,
  isLoading,
  onRefresh,
  onServiceTotalCalculated,
  disabled = false,
}: VehicleListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteVehicleMutation = useDeleteVehicle();
  const { toast } = useToast();
  const { user, role } = useUser();

  // Calculate total service cost for this service
  const totalServiceCost = vehicles.reduce((sum, vehicle) => {
    if (vehicle.status === 'completed') {
      const vehicleTotal = vehicle.services?.reduce((s, service) => s + service.amount, 0) || 0;
      return sum + vehicleTotal;
    }
    return sum;
  }, 0);

  // Notify parent of the calculated total
  React.useEffect(() => {
    onServiceTotalCalculated?.(serviceId, totalServiceCost);
  }, [totalServiceCost, serviceId, onServiceTotalCalculated]);

  const handleDeleteVehicle = async (vehicleId: string) => {
    const deletedVehicle = vehicles.find(v => v.id === vehicleId);
    try {
      await deleteVehicleMutation.mutateAsync({
        companyId,
        serviceId,
        vehicleId,
      });

      // Log activity
      await activityService.logActivity({
        companyId,
        activityType: 'vehicle_deleted',
        description: `Vehicle Deleted - ${deletedVehicle?.brand} ${deletedVehicle?.model} (${deletedVehicle?.plateNumber})`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          vehicleId: vehicleId,
          vehiclePlate: deletedVehicle?.plateNumber,
          brand: deletedVehicle?.brand,
          model: deletedVehicle?.model,
          year: deletedVehicle?.year,
        },
      });

      toast({
        title: 'Success',
        description: 'Vehicle deleted successfully',
      });
      onRefresh();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete vehicle',
        variant: 'destructive',
      });
    }
  };
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>Vehicles included in this service</CardDescription>
        </div>
        <VehicleForm companyId={companyId} serviceId={serviceId} onSuccess={onRefresh} disabled={disabled} />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate Number</TableHead>
                <TableHead>Brand / Model</TableHead>
                <TableHead className="text-xs">Vehicle Type</TableHead>
                <TableHead className="text-xs">VIN</TableHead>
                <TableHead className="text-xs">Fuel Type</TableHead>
                <TableHead className="text-xs">Year</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Status</TableHead> 
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Loading vehicles...
                  </TableCell>
                </TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No vehicles added yet. Add your first vehicle!
                  </TableCell>
                </TableRow>
              ) : (
                [...vehicles]
                  .sort((a, b) => {
                    const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any).toDate?.().getTime() || 0;
                    const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any).toDate?.().getTime() || 0;
                    return dateB - dateA; // Descending order (newest first)
                  })
                  .map((vehicle) => {
                  const totalServiceAmount = vehicle.services?.reduce((sum, s) => sum + s.amount, 0) || 0;
                  const displayCost = vehicle.status === 'completed' ? totalServiceAmount : 0;
                  
                  const STATUS_COLORS: Record<string, { variant: any; className: string }> = {
                    pending: { variant: 'outline' as const, className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                    'in-progress': { variant: 'secondary' as const, className: 'bg-blue-50 text-blue-700 border-blue-200' },
                    completed: { variant: 'secondary' as const, className: 'bg-green-50 text-green-700 border-green-200' },
                    cancelled: { variant: 'destructive' as const, className: 'bg-red-50 text-red-700 border-red-200' },
                  };

                  const statusConfig = STATUS_COLORS[vehicle.status] || STATUS_COLORS['pending'];

                  return (
                    <TableRow key={vehicle.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-semibold text-xs sm:text-sm">{vehicle.plateNumber}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {vehicle.brand} {vehicle.model}
                      </TableCell>
                      <TableCell className="text-sm">
                        {vehicle.vehicleType ? (
                          <Badge variant="outline" className="capitalize text-xs">
                            {vehicle.vehicleType}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {vehicle.vin ? (
                          <span className="text-gray-700 break-words">{vehicle.vin}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {vehicle.fuelType ? (
                          <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">
                            {vehicle.fuelType}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{vehicle.year || '-'}</TableCell>
                      <TableCell className="font-semibold text-xs sm:text-sm">
                        AED {displayCost.toLocaleString('en-AE')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className={`${statusConfig.className} text-xs`}>
                          {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1).replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <VehicleForm
                            companyId={companyId}
                            serviceId={serviceId}
                            vehicle={vehicle}
                            onSuccess={onRefresh}
                            disabled={disabled}
                            trigger={
                              <Button size="sm" variant="outline" className="gap-1" disabled={disabled}>
                                <Pencil size={14} />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            }
                          />
                          <div className="relative flex flex-col gap-1">
                            <Link
                              href={`/admin/b2b-booking/companies/${companyId}/services/${serviceId}/vehicles/${vehicle.id}`}
                              target='_blank'
                            >
                              <Button size="sm" variant="outline" className="gap-1 w-full">
                                <ArrowRight size={14} />
                                <span className="inline">Details</span>
                              </Button>
                            </Link>
                            {displayCost === 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-amber-900 font-medium text-center">
                                Add service and cost here
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirmId(vehicle.id)}
                            disabled={disabled}
                            className={`gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteConfirmId && (
            <div className="bg-gray-50 p-3 rounded-lg my-2">
              {vehicles.find(v => v.id === deleteConfirmId) && (
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {vehicles.find(v => v.id === deleteConfirmId)?.brand} {vehicles.find(v => v.id === deleteConfirmId)?.model}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Plate: {vehicles.find(v => v.id === deleteConfirmId)?.plateNumber}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteVehicle(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteVehicleMutation.isPending}
            >
              {deleteVehicleMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
