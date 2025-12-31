'use client';

import { useState } from 'react';
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
import { useCreateService } from '@/hooks/useB2B';
import { ServiceFormData } from '@/lib/types/b2b.types';
import { useContext } from 'react';
import { UserContext } from '@/lib/userContext';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const serviceSchema = z.object({
  title: z.string().min(1, 'Service title is required'),
  type: z.string().min(1, 'Service type is required'),
  serviceDate: z.date({
    errorMap: () => ({ message: 'Service date is required' }),
  }),
  dateRangeStart: z.date().optional(),
  dateRangeEnd: z.date().optional(),
  notes: z.string().optional(),
});

type ServiceSchemaType = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  companyId: string;
  onSuccess?: () => void;
}

const SERVICE_TYPES = [
  { value: 'car-wash', label: 'Car Wash' },
  { value: 'detailing', label: 'Detailing' },
  { value: 'ppf', label: 'PPF Wrapping' },
  { value: 'ceramic-coating', label: 'Ceramic Coating' },
  { value: 'tinting', label: 'Car Tinting' },
  { value: 'polishing', label: 'Polishing' },
  { value: 'pre-inspection', label: 'Pre-Purchase Inspection' },
  { value: 'custom', label: 'Custom Service' },
];

export function ServiceForm({ companyId, onSuccess }: ServiceFormProps) {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const createService = useCreateService();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ServiceSchemaType>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      type: '',
      serviceDate: new Date(),
      notes: '',
    },
  });

  async function onSubmit(data: ServiceSchemaType) {
    try {
      setError(null);
      
      // Validate user authentication
      if (!user?.uid) {
        setError('User not authenticated. Please log in again.');
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive',
        });
        return;
      }

      // Validate company ID
      if (!companyId) {
        setError('Company ID is missing. Please select a company.');
        toast({
          title: 'Error',
          description: 'Company ID missing',
          variant: 'destructive',
        });
        return;
      }

      console.log('[ServiceForm] Submitting form with data:', {
        title: data.title,
        type: data.type,
        serviceDate: data.serviceDate,
        dateRangeStart: data.dateRangeStart,
        dateRangeEnd: data.dateRangeEnd,
        notes: data.notes,
        companyId,
        userId: user.uid,
      });

      const formData: ServiceFormData = {
        title: data.title,
        type: data.type,
        serviceDate: data.serviceDate,
        dateRangeStart: data.dateRangeStart,
        dateRangeEnd: data.dateRangeEnd,
        notes: data.notes,
      };

      console.log('[ServiceForm] Calling createService.mutateAsync with:', {
        companyId,
        data: formData,
        userId: user.uid,
      });

      const result = await createService.mutateAsync({
        companyId,
        data: formData,
        userId: user.uid,
      });

      console.log('[ServiceForm] Service created successfully:', result);
      
      toast({
        title: 'Success',
        description: 'Service created successfully',
      });

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('[ServiceForm] Error creating service:', error);
      const errorMessage = error?.message || 'Failed to create service';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }

  const isLoading = createService.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={18} />
          Add New Service
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Full Car Wash" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Date *</FormLabel>
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
                name="dateRangeStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Range Start (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateRangeEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Range End (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this service..."
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
                {isLoading ? 'Creating...' : 'Create Service'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
