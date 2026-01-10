'use client';

import { useState, useCallback, useEffect } from 'react';
import * as React from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { B2BService } from '@/lib/types/b2b.types';
import { ServiceForm } from './ServiceForm';
import Link from 'next/link';
import { ArrowRight, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { useUpdateServiceStatus, useVehicles, useReferrals, useCalculateTotals } from '@/hooks/useB2B';
import { BulkQuotationModal } from '@/components/admin/b2b';
import { useUser } from '@/lib/userContext';
import { activityService } from '@/lib/firestore/activity-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ServiceListProps {
  companyId: string;
  services: B2BService[];
  company?: any;
  isLoading: boolean;
  onRefresh: () => void;
  onGenerateQuotation?: (serviceId: string) => void;
  onGenerateInvoice?: (serviceId: string) => void;
  serviceTotals?: Record<string, number>; // Map of serviceId to subtotal amount
}

const STATUS_BADGE_CONFIG = {
  pending: { variant: 'outline' as const, color: 'text-yellow-600' },
  completed: { variant: 'secondary' as const, color: 'text-green-600' },
  cancelled: { variant: 'destructive' as const, color: 'text-red-600' },
};

// Utility function to format date as DD/MM/YYYY
const formatDateDDMMYYYY = (date: any) => {
  const d = date instanceof Date ? date : (date?.toDate?.() || new Date());
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

function ServiceRow({
  service,
  companyId,
  selectedServices,
  onSelectService,
  onGenerateQuotation,
  onGenerateInvoice,
  onSubtotalCalculated,
  onReferralCalculated,
  onDeleteService,
}: {
  service: B2BService;
  companyId: string;
  selectedServices: Set<string>;
  onSelectService: (serviceId: string) => void;
  onGenerateQuotation?: (serviceId: string) => void;
  onGenerateInvoice?: (serviceId: string) => void;
  onSubtotalCalculated?: (serviceId: string, subtotal: number) => void;
  onReferralCalculated?: (serviceId: string, referralTotal: number) => void;
  onDeleteService?: (serviceId: string) => void;
}) {
  const { vehicles = [] } = useVehicles(companyId, service.id);
  const { referrals = [] } = useReferrals(companyId, service.id);
  const totals = useCalculateTotals(vehicles, referrals);

  // Calculate service subtotal from completed vehicles only
  const serviceSubtotal = vehicles.reduce((sum, vehicle: any) => {
    if (vehicle.status === 'completed') {
      const vehicleTotal = vehicle.services?.reduce((s: number, svc: any) => s + svc.amount, 0) || 0;
      return sum + vehicleTotal;
    }
    return sum;
  }, 0);

  // Notify parent when subtotal is calculated
  React.useEffect(() => {
    onSubtotalCalculated?.(service.id, serviceSubtotal);
  }, [serviceSubtotal, service.id, onSubtotalCalculated]);

  // Notify parent when referral total is calculated
  React.useEffect(() => {
    onReferralCalculated?.(service.id, totals.referralTotal);
  }, [totals.referralTotal, service.id, onReferralCalculated]);

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell>
        <Checkbox
          checked={selectedServices.has(service.id)}
          onCheckedChange={() => onSelectService(service.id)}
        />
      </TableCell>
      <TableCell className="font-mono font-semibold text-blue-600">{service.jobCardNo || 'N/A'}</TableCell>
      <TableCell className="font-medium">{service.title}</TableCell>
      <TableCell className="text-sm">{service.type}</TableCell>
      <TableCell className="text-sm">
        {formatDateDDMMYYYY(
          service.serviceDate instanceof Date
            ? service.serviceDate
            : (service.serviceDate as any).toDate()
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {vehicles && vehicles.length > 0 ? (
            vehicles.map((vehicle: any) => (
              <Badge key={vehicle.id} variant="outline" className="text-xs w-fit">
                {vehicle.plateNumber}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {service.status === 'completed' ? (
            <Badge className="bg-green-300 text-green-800 font-semibold">
              {service.status}
            </Badge>
          ) : (
            <Badge
              variant={
                STATUS_BADGE_CONFIG[service.status as keyof typeof STATUS_BADGE_CONFIG]
                  ?.variant || 'outline'
              }
            >
              {service.status}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {vehicles && vehicles.length > 0 ? (
            vehicles
              .filter((vehicle: any) => vehicle.status === 'completed')
              .map((vehicle: any) => {
                const vehicleServiceCost = vehicle.services?.reduce((s: number, svc: any) => s + svc.amount, 0) || 0;
                return (
                  <div key={vehicle.id} className="text-sm">
                    <span className="font-mono text-gray-600">{vehicle.plateNumber}:</span>
                    <span className="font-semibold ml-2">AED {vehicleServiceCost.toLocaleString('en-AE')}</span>
                  </div>
                );
              })
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </div>
        {serviceSubtotal > 0 && (
          <div className="text-sm font-bold mt-2 pt-2 border-t border-gray-200">
            Total: AED {serviceSubtotal.toLocaleString('en-AE')}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right font-semibold">
        AED {totals.referralTotal.toLocaleString('en-AE')}
      </TableCell>
      <TableCell className="text-right font-bold">
        AED {totals.totalAmount.toLocaleString('en-AE')}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/admin/b2b-booking/companies/${companyId}/services/${service.id}`} target='_blank'>
            <Button size="sm" variant="outline" className="gap-1">
              View
              <ArrowRight size={14} />
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDeleteService?.(service.id)}
            disabled={service.status === 'completed'}
            className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ServiceList({
  companyId,
  services,
  company,
  isLoading,
  onRefresh,
  onGenerateQuotation,
  onGenerateInvoice,
  serviceTotals = {},
}: ServiceListProps) {
  const { user, role } = useUser();
  const updateServiceStatus = useUpdateServiceStatus();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [showBulkQuotationModal, setShowBulkQuotationModal] = useState(false);
  const [calculatedTotals, setCalculatedTotals] = useState<Record<string, number>>({});
  const [calculatedReferrals, setCalculatedReferrals] = useState<Record<string, number>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSubtotalCalculated = useCallback((serviceId: string, subtotal: number) => {
    setCalculatedTotals((prev) => ({
      ...prev,
      [serviceId]: subtotal,
    }));
  }, []);

  const handleReferralCalculated = useCallback((serviceId: string, referralTotal: number) => {
    setCalculatedReferrals((prev) => ({
      ...prev,
      [serviceId]: referralTotal,
    }));
  }, []);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handleDeleteService = async (serviceId: string) => {
    try {
      // Find the service being deleted
      const serviceToDelete = services.find(s => s.id === serviceId);
      
      // Delete the service document from Firestore
      const serviceRef = doc(db, 'companies', companyId, 'services', serviceId);
      await deleteDoc(serviceRef);
      
      // Log activity for service deletion
      await activityService.logActivity({
        companyId: companyId,
        activityType: 'service_deleted',
        description: `Service "${serviceToDelete?.title}" (Job Card: ${serviceToDelete?.jobCardNo}) deleted`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          serviceTitle: serviceToDelete?.title || 'N/A',
          jobCardNo: serviceToDelete?.jobCardNo || 'N/A',
          serviceType: serviceToDelete?.type || 'N/A',
        },
      });
      
      onRefresh();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  // Filter services by date range
  const filteredServices = services.filter((service) => {
    const serviceDate = new Date(
      service.serviceDate instanceof Date ? service.serviceDate : (service.serviceDate as any).toDate()
    );

    if (startDate && new Date(startDate) > serviceDate) return false;
    if (endDate && new Date(endDate) < serviceDate) return false;
    return true;
  });

  const handleSelectService = (serviceId: string) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId);
    } else {
      newSelected.add(serviceId);
    }
    setSelectedServices(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedServices.size === filteredServices.length) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(filteredServices.map((s) => s.id)));
    }
  };

  const handleStatusChange = async (serviceId: string, newStatus: string) => {
    try {
      // Find the service being updated
      const serviceToUpdate = services.find(s => s.id === serviceId);
      
      await updateServiceStatus.mutateAsync({
        companyId,
        serviceId,
        status: newStatus,
      });

      // Log activity for service status change
      await activityService.logActivity({
        companyId: companyId,
        activityType: 'service_status_changed',
        description: `Service status changed to "${newStatus}" - ${serviceToUpdate?.title} (Job Card: ${serviceToUpdate?.jobCardNo})`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role || 'unknown',
        metadata: {
          serviceId: serviceId,
          serviceTitle: serviceToUpdate?.title || 'N/A',
          jobCardNo: serviceToUpdate?.jobCardNo || 'N/A',
          previousStatus: serviceToUpdate?.status || 'N/A',
          newStatus: newStatus,
        },
      });

      onRefresh();
    } catch (error) {
      console.error('Error updating service status:', error);
    }
  };

  // Sort and paginate services
  const sortedServices = [...filteredServices].sort((a, b) => {
    const dateA = a.serviceDate instanceof Date ? a.serviceDate : (a.serviceDate as any).toDate?.() || new Date();
    const dateB = b.serviceDate instanceof Date ? b.serviceDate : (b.serviceDate as any).toDate?.() || new Date();
    return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
  });

  const totalPages = Math.ceil(sortedServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServices = sortedServices.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Services</CardTitle>
            <CardDescription>All services performed for this company</CardDescription>
          </div>
          <ServiceForm companyId={companyId} onSuccess={onRefresh} />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Filter */}
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Filter by date:</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Bulk Quotation Button */}
          {selectedServices.size > 0 && (
            <div className="flex gap-2 items-center bg-blue-50 p-3 rounded-lg">
              <span className="text-sm font-medium">
                {selectedServices.size} service(s) selected
              </span>
              <Button
                size="sm"
                onClick={() => setShowBulkQuotationModal(true)}
                className="gap-1"
              >
                <CheckCircle2 size={16} />
                Create Quotation from Selected
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filteredServices.length > 0 &&
                        selectedServices.size === filteredServices.length
                      }
                      onCheckedChange={() => handleSelectAll()}
                    />
                  </TableHead>
                  <TableHead>Job Card</TableHead>
                  <TableHead>Service Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      Date
                      <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'} />
                    </button>
                  </TableHead>
                  <TableHead>Vehicles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-64">Sub Total (AED)</TableHead>
                  <TableHead className="text-right">Referral Fee (AED)</TableHead>
                  <TableHead className="text-right">Amount (AED)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      Loading services...
                    </TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      {services.length === 0
                        ? 'No services added yet. Create your first service!'
                        : 'No services match the selected date range.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedServices.map((service) => (
                    <ServiceRow
                      key={service.id}
                      service={service}
                      companyId={companyId}
                      selectedServices={selectedServices}
                      onSelectService={handleSelectService}
                      onGenerateQuotation={onGenerateQuotation}
                      onGenerateInvoice={onGenerateInvoice}
                      onSubtotalCalculated={handleSubtotalCalculated}
                      onReferralCalculated={handleReferralCalculated}
                      onDeleteService={(serviceId) => setDeleteConfirmId(serviceId)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Items per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(parseInt(val))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} • Total: {sortedServices.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Quotation Modal */}
      {showBulkQuotationModal && (
        <BulkQuotationModal
          companyId={companyId}
          selectedServiceIds={Array.from(selectedServices)}
          services={filteredServices.map(service => ({
            ...service,
            // Include jobCardNo from the service for each selected service
            jobCardNo: service.jobCardNo,
          }))}
          company={company}
          serviceTotals={calculatedTotals}
          referralTotals={calculatedReferrals}
          isOpen={showBulkQuotationModal}
          onClose={() => setShowBulkQuotationModal(false)}
          onSuccess={() => {
            setShowBulkQuotationModal(false);
            setSelectedServices(new Set());
            onRefresh();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteConfirmId && (
            <div className="bg-gray-50 p-3 rounded-lg my-2">
              {filteredServices.find(s => s.id === deleteConfirmId) && (
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {filteredServices.find(s => s.id === deleteConfirmId)?.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Date: {formatDateDDMMYYYY(
                      filteredServices.find(s => s.id === deleteConfirmId)?.serviceDate instanceof Date
                        ? filteredServices.find(s => s.id === deleteConfirmId)?.serviceDate
                        : (filteredServices.find(s => s.id === deleteConfirmId)?.serviceDate as any)?.toDate()
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
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
    </>
  );
}
