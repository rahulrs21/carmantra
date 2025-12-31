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
import { useAddReferral, useUpdateReferral } from '@/hooks/useB2B';
import { ReferralFormData } from '@/lib/types/b2b.types';
import { Plus, Edit } from 'lucide-react';
import { UserContext } from '@/lib/userContext';
import { useToast } from '@/hooks/use-toast';

const referralSchema = z.object({
  personName: z.string().min(1, 'Person name is required'),
  contact: z.string().min(1, 'Contact is required'),
  commission: z.coerce.number().min(0, 'Commission must be >= 0'),
  referralDate: z.date({
    errorMap: () => ({ message: 'Referral date is required' }),
  }),
  status: z.enum(['pending', 'completed']),
  notes: z.string().optional(),
});

type ReferralSchemaType = z.infer<typeof referralSchema>;

interface ReferralFormProps {
  companyId: string;
  serviceId: string;
  vehicleIds?: string[];
  referral?: any; // For edit mode
  onSuccess?: () => void;
  trigger?: React.ReactNode; // Custom trigger for edit button
}

export function ReferralForm({
  companyId,
  serviceId,
  vehicleIds = [],
  referral,
  onSuccess,
  trigger,
}: ReferralFormProps) {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const addReferral = useAddReferral();
  const updateReferral = useUpdateReferral();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const isEditMode = !!referral;

  const form = useForm<ReferralSchemaType>({
    resolver: zodResolver(referralSchema),
    defaultValues: isEditMode
      ? {
          personName: referral?.personName || '',
          contact: referral?.contact || '',
          commission: referral?.commission || 0,
          referralDate: referral?.referralDate
            ? new Date(referral.referralDate instanceof Date ? referral.referralDate : (referral.referralDate as any).toDate())
            : new Date(),
          status: referral?.status || 'pending',
          notes: referral?.notes || '',
        }
      : {
          personName: '',
          contact: '',
          commission: 0,
          referralDate: new Date(),
          status: 'pending',
          notes: '',
        },
  });

  async function onSubmit(data: ReferralSchemaType) {
    try {
      console.log('[ReferralForm] Form submitted with data:', data);
      
      const formData: ReferralFormData = {
        personName: data.personName,
        contact: data.contact,
        commission: data.commission,
        referralDate: data.referralDate,
        notes: data.notes,
      };

      if (isEditMode) {
        // Update existing referral
        if (!referral?.id) {
          throw new Error('Referral ID not found');
        }
        
        await updateReferral.mutateAsync({
          companyId,
          serviceId,
          referralId: referral.id,
          data: {
            ...formData,
            status: data.status,
          },
        });
        
        toast({
          title: 'Success',
          description: 'Referral updated successfully',
        });
      } else {
        // Create new referral
        if (!user?.uid) {
          console.error('[ReferralForm] User not authenticated');
          toast({
            title: 'Error',
            description: 'You must be logged in to add a referral',
            variant: 'destructive',
          });
          return;
        }

        console.log('[ReferralForm] User authenticated:', user.uid);
        console.log('[ReferralForm] Calling addReferral.mutateAsync with:', {
          companyId,
          serviceId,
          data: formData,
          userId: user.uid,
          status: data.status,
        });

        await addReferral.mutateAsync({
          companyId,
          serviceId,
          data: {
            ...formData,
            status: data.status,
          },
          userId: user.uid,
        });

        console.log('[ReferralForm] Referral added successfully');
        
        toast({
          title: 'Success',
          description: 'Referral added successfully',
          variant: 'default',
        });
      }

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('[ReferralForm] Error:', error);
      toast({
        title: 'Error',
        description: `Failed to save referral: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  }

  const isLoading = isEditMode ? updateReferral.isPending : addReferral.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            Add Referral
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Referral' : 'Add Referral'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="personName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Referral person's name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact (Phone/Email) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone or email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Amount *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referralDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes field removed vehicle linking section */}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Referral details..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Referral' : 'Add Referral')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
