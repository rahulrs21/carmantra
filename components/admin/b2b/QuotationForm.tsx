'use client';

import { useEffect, useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateQuotation } from '@/hooks/useB2B';
import { useToast } from '@/hooks/use-toast';
import { activityService } from '@/lib/firestore/activity-service';
import { UserContext } from '@/lib/userContext';

const quotationSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']),
  notes: z.string().optional(),
  validityDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  showReferralCommission: z.boolean().optional(),
});

type QuotationFormData = z.infer<typeof quotationSchema>;

interface QuotationFormProps {
  companyId: string;
  serviceId: string;
  quotation: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuotationForm({
  companyId,
  serviceId,
  quotation,
  isOpen,
  onClose,
  onSuccess,
}: QuotationFormProps) {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const role = userContext?.role || 'unknown';
  const updateQuotation = useUpdateQuotation();
  const { toast } = useToast();
  const [displayData, setDisplayData] = useState(quotation);
  const [editedCosts, setEditedCosts] = useState<Record<number, number>>({})
  const [jobCardNo, setJobCardNo] = useState('')

  // Use serviceId from quotation if not provided as prop
  const actualServiceId = serviceId || quotation?.serviceId;

  useEffect(() => {
    setDisplayData(quotation);
    // Reset edited costs when quotation changes to avoid stale data
    setEditedCosts({});
  }, [quotation]);

  // Reset edited costs when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEditedCosts({});
    }
  }, [isOpen]);

  // Fetch service data to get Job Card Number
  useEffect(() => {
    const fetchJobCardNo = async () => {
      if (!companyId || !actualServiceId) return;

      try {
        const serviceRef = doc(
          db,
          'companies',
          companyId,
          'services',
          actualServiceId
        );
        const serviceDoc = await getDoc(serviceRef);

        if (serviceDoc.exists()) {
          const serviceData = serviceDoc.data();
          setJobCardNo(serviceData?.jobCardNo || 'N/A');
        }
      } catch (error) {
        console.warn('Could not fetch job card number:', error);
        setJobCardNo('N/A');
      }
    };

    if (isOpen) {
      fetchJobCardNo();
    }
  }, [companyId, actualServiceId, isOpen]);

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      status: quotation?.status || 'draft',
      notes: quotation?.notes || '',
      validityDate: quotation?.validityDate || '',
      paymentTerms: quotation?.paymentTerms || '',
      showReferralCommission: quotation?.showReferralCommission || false,
    },
  });

  // Watch the showReferralCommission field to update total dynamically
  const showReferralCommission = form.watch('showReferralCommission');
  const calculateSubtotal = () => {
    const costs = displayData?.vehicles?.map((v: any, idx: number) => {
      // Check if cost has been edited
      if (editedCosts[idx] !== undefined) {
        return editedCosts[idx];
      }
      let vehicleServiceCost = 0;
      // Prioritize serviceAmount field (saved value from previous edits)
      if (v.serviceAmount !== undefined && v.serviceAmount !== null) {
        vehicleServiceCost = v.serviceAmount;
      } else if (v.services && Array.isArray(v.services) && v.services.length > 0) {
        vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
      } else {
        vehicleServiceCost = v.serviceCost || 0;
      }
      return vehicleServiceCost;
    }) || [];
    return costs.reduce((sum: number, cost: number) => sum + cost, 0);
  };
  const subtotal = calculateSubtotal();
  const calculatedTotal = showReferralCommission
    ? subtotal + (displayData?.referralTotal || 0)
    : subtotal;

  async function onSubmit(data: QuotationFormData) {
    try {
      // Calculate updated totals with edited costs
      const updatedVehicles = displayData?.vehicles?.map((vehicle: any, idx: number) => {
        const updatedServiceAmount = editedCosts[idx] !== undefined ? editedCosts[idx] : (vehicle.serviceAmount || 0);
        return {
          ...vehicle,
          serviceAmount: updatedServiceAmount,
        };
      }) || [];

      // Calculate subtotal from all vehicle costs
      const newSubtotal = updatedVehicles.reduce((sum: number, v: any) => sum + (v.serviceAmount || 0), 0);

      // Calculate total: if showReferralCommission is true, add referral total, otherwise just subtotal
      const referralAmount = data.showReferralCommission ? (displayData?.referralTotal || 0) : 0;
      const newTotal = newSubtotal + referralAmount;

      console.log('Submitting quotation update:', {
        vehicles: updatedVehicles.map((v: any, i: number) => ({
          plate: v.plateNumber,
          cost: v.serviceAmount,
          wasEdited: editedCosts[i] !== undefined,
        })),
        newSubtotal,
        referralAmount,
        showReferralCommission: data.showReferralCommission,
        newTotal,
      });

      // Filter out undefined and empty string values to prevent Firebase errors
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined && value !== '')
      ) as Partial<QuotationFormData>;

      await updateQuotation.mutateAsync({
        companyId,
        serviceId: actualServiceId,
        quotationId: quotation.id,
        data: {
          ...cleanData,
          vehicles: updatedVehicles,
          subtotal: newSubtotal,
          totalAmount: newTotal,
        },
      });

      // Log activity
      await activityService.logActivity({
        companyId,
        activityType: 'quotation_updated',
        description: `Quotation updated - ${quotation.quotationNumber}`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: role,
        metadata: {
          serviceId: actualServiceId,
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          status: data.status,
          validityDate: data.validityDate,
          paymentTerms: data.paymentTerms,
          newTotal: newTotal,
        },
      });

      toast({
        title: 'Success',
        description: 'Quotation updated successfully',
      });

      // Clear edited costs after successful save
      setEditedCosts({});

      // Close form and trigger parent refresh
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error updating quotation:', error);

      // Handle auth errors separately
      if (error instanceof Error && error.message.includes('auth')) {
        toast({
          title: 'Session Error',
          description: 'Your session may have expired. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to update quotation',
          variant: 'destructive',
        });
      }
    }
  }

  const isLoading = updateQuotation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Quotation - {quotation?.quotationNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Company</label>
              <p className="text-gray-700">{displayData?.companyName}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Contact Person</label>
              <p className="text-gray-700">{displayData?.contactPerson}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-gray-700">{displayData?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <p className="text-gray-700">{displayData?.phone || 'N/A'}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Contact Information</label>
            <p className="text-gray-700 text-sm">{displayData?.email || 'N/A'} | {displayData?.phone || 'N/A'}</p>
          </div>

          <div>
            <label className="text-sm font-medium">Vehicles</label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left">Job Card No.</th>
                    <th className="px-2 py-1 text-left">Plate No.</th>
                    <th className="px-2 py-1 text-left">Brand</th>
                    <th className="px-2 py-1 text-left">Model</th>
                    <th className="px-2 py-1 text-left">Service</th>
                    <th className="px-2 py-1 text-right">Cost (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  {console.log('Display DATA', displayData)}
                  {displayData?.vehicles?.map((vehicle: any, idx: number) => {
                    // Calculate vehicle service cost - prioritize serviceAmount field (updated from form)
                    let vehicleServiceCost = 0;
                    if (vehicle.serviceAmount !== undefined && vehicle.serviceAmount !== null) {
                      vehicleServiceCost = vehicle.serviceAmount;
                    } else if (vehicle.services && Array.isArray(vehicle.services) && vehicle.services.length > 0) {
                      vehicleServiceCost = vehicle.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
                    } else {
                      vehicleServiceCost = vehicle.serviceCost || 0;
                    }
                    // Use edited cost if available, otherwise use database value
                    const displayCost = editedCosts[idx] !== undefined ? editedCosts[idx] : vehicleServiceCost;
                    return (
                      <tr key={idx} className="border-t">
                        <td className="px-2 py-1 font-mono font-semibold text-blue-600">{jobCardNo || 'N/A'}</td>
                        <td className="px-2 py-1">{vehicle.plateNumber}</td>
                        <td className="px-2 py-1">{vehicle.brand}</td>
                        <td className="px-2 py-1">{vehicle.model}</td>
                        <td className="px-2 py-1">{vehicle.services.map((svc: any) => svc.description).join(', ') || 'N/A'}</td>
                        <td className="px-2 py-1 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={displayCost}
                            onChange={(e) => setEditedCosts({ ...editedCosts, [idx]: parseFloat(e.target.value) || 0 })}
                            className="w-full text-right"
                            disabled={form.getValues('status') === 'accepted' || form.getValues('status') === 'rejected' || form.getValues('status') === 'sent'}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-md text-gray-800 mt-1">
                  <span className="font-medium">Subtotal: </span>
                  <b className='font-bold'>AED {subtotal.toLocaleString('en-AE')}</b>
                </div>
              </div>
              <div className={showReferralCommission ? '' : 'line-through text-gray-400'}>
                <span className="font-medium">Referral Total:</span> AED{' '}
                {displayData?.referralTotal?.toLocaleString('en-AE')}
              </div>
              <div className="font-semibold text-lg text-right  ">
                Total: AED {calculatedTotal.toLocaleString('en-AE')}
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status 

                      {form.getValues('status') === 'draft' ? ( 
                        <span className="text-xs text-gray-500"> (Change status to <b>Draft</b> to make any changes in the pricing)</span>
                      ) : (
                        <span className="text-xs text-gray-500"> (Change the status to <b>Accepted</b>, if customer has approved the quotation)</span>
                      )}

                    </FormLabel>

                    {form.getValues('status') === 'draft' && (

                      <div className="group relative cursor-help"> 
                        <div className="absolute top-1  transform translate-x-1/2  px-3 py-2 bg-yellow-600 text-white text-xs rounded-lg whitespace-nowrap  transition-opacity pointer-events-none z-50 animate-pulse">
                          Change the status to either <b>Sent</b> or <b>Accepted</b>
                        </div>
                      </div>
                    )}

                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validityDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quotation Validity (Valid Until)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cash, Credit Card, Bank Transfer, etc." className="resize-none" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Internal notes..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showReferralCommission"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </FormControl>
                  <FormLabel className="mb-0">Show Referral Commission in Quotation</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
