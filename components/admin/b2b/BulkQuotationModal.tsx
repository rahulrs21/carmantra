'use client';

import { useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateQuotation } from '@/hooks/useB2B';
import { useToast } from '@/hooks/use-toast';
import { UserContext } from '@/lib/userContext';
import { Loader2 } from 'lucide-react';

interface BulkQuotationModalProps {
  companyId: string;
  selectedServiceIds: string[];
  services: any[];
  company: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  serviceTotals?: Record<string, number>;
}

export function BulkQuotationModal({
  companyId,
  selectedServiceIds,
  services,
  company,
  isOpen,
  onClose,
  onSuccess,
  serviceTotals = {},
}: BulkQuotationModalProps) {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const createQuotation = useCreateQuotation();
  const { toast } = useToast();

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));

  const handleCreateQuotation = async () => {
    if (!user?.uid) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    if (!company) {
      toast({
        title: 'Error',
        description: 'Company information not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createQuotation.mutateAsync({
        companyId,
        serviceIds: selectedServiceIds,
        company,
        services: selectedServices,
        serviceTotals,
        userId: user.uid,
      });

      // Store the newly created quotation ID in sessionStorage
      if (result?.id) {
        sessionStorage.setItem('newQuotationId', result.id);
      }

      toast({
        title: 'Success',
        description: 'Quotation created successfully',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create quotation',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Bulk Quotation</DialogTitle>
          <DialogDescription>
            Create a quotation for multiple selected services
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Services included:</label>
            <div className="mt-2 space-y-2">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-sm">{service.title}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(
                        service.serviceDate instanceof Date
                          ? service.serviceDate
                          : (service.serviceDate as any).toDate()
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-semibold text-sm">
                    AED {service.totalAmount.toLocaleString('en-AE')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm">
              <p className="text-gray-600">Total Amount:</p>
              <p className="text-2xl font-bold">
                AED{' '}
                {selectedServices
                  .reduce((sum, s) => sum + s.totalAmount, 0)
                  .toLocaleString('en-AE')}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={createQuotation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuotation} disabled={createQuotation.isPending}>
              {createQuotation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Quotation'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
