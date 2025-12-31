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
}

export function VehicleList({
  companyId,
  serviceId,
  vehicles,
  isLoading,
  onRefresh,
  onServiceTotalCalculated,
}: VehicleListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteVehicleMutation = useDeleteVehicle();
  const { toast } = useToast();

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
    try {
      await deleteVehicleMutation.mutateAsync({
        companyId,
        serviceId,
        vehicleId,
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
        <VehicleForm companyId={companyId} serviceId={serviceId} onSuccess={onRefresh} />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate Number</TableHead>
                <TableHead>Brand / Model</TableHead>
                <TableHead>Vehicle Type</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Total Service Cost</TableHead>
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
                vehicles.map((vehicle) => {
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
                      <TableCell className="font-mono font-semibold">{vehicle.plateNumber}</TableCell>
                      <TableCell>
                        {vehicle.brand} {vehicle.model}
                      </TableCell>
                      <TableCell className="text-sm">
                        {vehicle.vehicleType ? (
                          <Badge variant="outline" className="capitalize">
                            {vehicle.vehicleType}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{vehicle.year || '-'}</TableCell>
                      <TableCell className="font-semibold">
                        AED {displayCost.toLocaleString('en-AE')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className={statusConfig.className}>
                          {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1).replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <VehicleForm
                            companyId={companyId}
                            serviceId={serviceId}
                            vehicle={vehicle}
                            onSuccess={onRefresh}
                            trigger={
                              <Button size="sm" variant="outline" className="gap-1">
                                <Pencil size={14} />
                                Edit
                              </Button>
                            }
                          />
                          <Link
                            href={`/admin/b2b-booking/companies/${companyId}/services/${serviceId}/vehicles/${vehicle.id}`}
                          >
                            <Button size="sm" variant="outline" className="gap-1">
                              Details
                              <ArrowRight size={14} />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirmId(vehicle.id)}
                            className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
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
