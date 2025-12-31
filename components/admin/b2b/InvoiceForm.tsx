'use client';

import { useEffect, useState } from 'react';
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
import { useUpdateInvoice } from '@/hooks/useB2B';
import { useToast } from '@/hooks/use-toast';

const invoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  amountStatus: z.enum(['pending', 'paid', 'cancelled']).optional(),
  cancellationReason: z.string().optional(),
  paymentMethod: z.string().optional(),
  dueDate: z.string().optional(),
  showReferralCommission: z.boolean().optional(),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  companyId: string;
  serviceId: string;
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceForm({
  companyId,
  serviceId,
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: InvoiceFormProps) {
  const updateInvoice = useUpdateInvoice();
  const { toast } = useToast();
  const [displayData, setDisplayData] = useState(invoice);
  const [quotationPaymentMethod, setQuotationPaymentMethod] = useState('');
  
  // Use serviceId from invoice if not provided as prop
  const actualServiceId = serviceId || invoice?.serviceId;

  useEffect(() => {
    setDisplayData(invoice);
  }, [invoice]);

  // Fetch quotation data to get payment method
  useEffect(() => {
    const fetchQuotationPaymentMethod = async () => {
      if (!invoice?.quotationId || !companyId || !actualServiceId) return;
      
      try {
        const quotationRef = doc(
          db,
          'companies',
          companyId,
          'services',
          actualServiceId,
          'quotations',
          invoice.quotationId
        );
        const quotationDoc = await getDoc(quotationRef);
        
        if (quotationDoc.exists()) {
          const quotationData = quotationDoc.data();
          setQuotationPaymentMethod(quotationData?.paymentTerms || '');
        }
      } catch (error) {
        console.warn('Could not fetch quotation payment method:', error);
      }
    };

    if (isOpen) {
      fetchQuotationPaymentMethod();
    }
  }, [invoice?.quotationId, companyId, actualServiceId, isOpen]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      status: invoice?.status || 'draft',
      amountStatus: invoice?.amountStatus || 'pending',
      cancellationReason: invoice?.cancellationReason || '',
      paymentMethod: invoice?.paymentMethod || quotationPaymentMethod || '',
      dueDate: invoice?.dueDate || '',
      showReferralCommission: invoice?.showReferralCommission || false,
      notes: invoice?.notes || '',
    },
  });

  // Watch the showReferralCommission field to update total dynamically
  const showReferralCommission = form.watch('showReferralCommission');
  const amountStatus = form.watch('amountStatus');
  
  // Auto-set Job Status to Paid when Amount Status is set to Paid
  useEffect(() => {
    if (amountStatus === 'paid') {
      form.setValue('status', 'paid');
    } else if(amountStatus === 'cancelled') {
      form.setValue('status', 'cancelled');
    } else if(amountStatus === 'pending') {
      form.setValue('status', 'draft');
    }
  }, [amountStatus, form]);

  const calculatedTotal = showReferralCommission 
    ? (displayData?.subtotal || 0) + (displayData?.referralTotal || 0)
    : (displayData?.subtotal || 0);

  async function onSubmit(data: InvoiceFormData) {
    try {
      await updateInvoice.mutateAsync({
        companyId,
        serviceId: actualServiceId,
        invoiceId: invoice.id,
        data,
      });
      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      });
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update invoice',
        variant: 'destructive',
      });
    }
  }

  const isLoading = updateInvoice.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Invoice - {invoice?.invoiceNumber}</DialogTitle>
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
              <p className="text-gray-700">{displayData?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <p className="text-gray-700">{displayData?.phone}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Service</label>
            <p className="text-gray-700">{displayData?.serviceTitle}</p>
          </div>

          <div>
            <label className="text-sm font-medium">Vehicles</label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left">Plate No.</th>
                    <th className="px-2 py-1 text-left">Brand</th>
                    <th className="px-2 py-1 text-left">Model</th>
                    <th className="px-2 py-1 text-right">Cost (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData?.vehicles?.map((vehicle: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">{vehicle.plateNumber}</td>
                      <td className="px-2 py-1">{vehicle.brand}</td>
                      <td className="px-2 py-1">{vehicle.model}</td>
                      <td className="px-2 py-1 text-right">
                        {(vehicle.serviceCost || 0).toLocaleString('en-AE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="font-medium">Subtotal:</span> AED{' '}
                {displayData?.subtotal?.toLocaleString('en-AE')}
              </div>
              <div>
                <span className="font-medium">Referral Total:</span> AED{' '}
                {displayData?.referralTotal?.toLocaleString('en-AE')}
              </div>
              <div className="font-semibold text-lg text-right">
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
                    <FormLabel>Job Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amountStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Bank Transfer, Cash, Check" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch('amountStatus') === 'cancelled' && (
              <FormField
                control={form.control}
                name="cancellationReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Reason</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Reason for cancellation..." className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="showReferralCommission"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </FormControl>
                  <FormLabel className="mb-0">Show Referral Commission in Invoice</FormLabel>
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
