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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePreInspection } from '@/hooks/useB2B';
import { PreInspectionFormData, ChecklistItem } from '@/lib/types/b2b.types';
import { Plus, Upload, X } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card } from '@/components/ui/card';
import { UserContext } from '@/lib/userContext';

const preInspectionSchema = z.object({
  notes: z.string().min(1, 'Notes are required'),
  inspectionType: z.enum(['before', 'after', 'followup']).optional(),
});

type PreInspectionSchemaType = z.infer<typeof preInspectionSchema>;

interface PreInspectionFormProps {
  companyId: string;
  serviceId: string;
  vehicleId: string;
  onSuccess?: () => void;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { item: 'Paint condition', status: 'pending' },
  { item: 'Dents / Scratches', status: 'pending' },
  { item: 'Windows / Mirrors', status: 'pending' },
  { item: 'Tires condition', status: 'pending' },
  { item: 'Interior cleanliness', status: 'pending' },
  { item: 'Engine bay', status: 'pending' },
];

export function PreInspectionForm({
  companyId,
  serviceId,
  vehicleId,
  onSuccess,
}: PreInspectionFormProps) {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const createPreInspection = useCreatePreInspection();
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [uploading, setUploading] = useState(false);

  const form = useForm<PreInspectionSchemaType>({
    resolver: zodResolver(preInspectionSchema),
    defaultValues: {
      notes: '',
      inspectionType: 'before',
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages([...images, ...Array.from(e.target.files)]);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setVideos([...videos, ...Array.from(e.target.files)]);
    }
  };

  const handleChecklistChange = (index: number, status: string) => {
    const updated = [...checklist];
    updated[index].status = status as any;
    setChecklist(updated);
  };

  async function onSubmit(data: PreInspectionSchemaType) {
    try {
      if (!user?.uid) {
        console.error('User not authenticated');
        return;
      }

      setUploading(true);

      // Upload images to Firebase Storage
      const imagePaths: string[] = [];
      for (const image of images) {
        const imagePath = `companies/${companyId}/services/${serviceId}/vehicles/${vehicleId}/inspections/images/${Date.now()}_${image.name}`;
        const imageRef = ref(storage, imagePath);
        await uploadBytes(imageRef, image);
        imagePaths.push(imagePath);
      }

      // Upload videos to Firebase Storage
      const videoPaths: string[] = [];
      for (const video of videos) {
        const videoPath = `companies/${companyId}/services/${serviceId}/vehicles/${vehicleId}/inspections/videos/${Date.now()}_${video.name}`;
        const videoRef = ref(storage, videoPath);
        await uploadBytes(videoRef, video);
        videoPaths.push(videoPath);
      }

      // Create pre-inspection record
      const formData: any = {
        notes: data.notes,
        inspectionType: data.inspectionType,
        inspectionDate: new Date(),
        checklist,
        images: imagePaths,
        videos: videoPaths,
      };

      await createPreInspection.mutateAsync({
        companyId,
        serviceId,
        vehicleId,
        data: formData,
        userId: user.uid,
      });

      // Reset form
      form.reset();
      setImages([]);
      setVideos([]);
      setChecklist(DEFAULT_CHECKLIST);
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating pre-inspection:', error);
    } finally {
      setUploading(false);
    }
  }

  const isLoading = createPreInspection.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus size={16} />
          Add Pre-Inspection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Pre-Inspection</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Inspection Type */}
            <FormField
              control={form.control}
              name="inspectionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspection Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="before">Before Service</SelectItem>
                      <SelectItem value="after">After Service</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Images */}
            <div>
              <FormLabel>Images</FormLabel>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="images"
                  disabled={isLoading}
                />
                <label htmlFor="images" className="cursor-pointer">
                  <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload images</p>
                </label>
              </div>
              {images.length > 0 && (
                <div className="mt-2 space-y-1">
                  {images.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-blue-50 p-2 rounded">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
                        className="text-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Videos */}
            <div>
              <FormLabel>Videos</FormLabel>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition">
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                  id="videos"
                  disabled={isLoading}
                />
                <label htmlFor="videos" className="cursor-pointer">
                  <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload videos</p>
                </label>
              </div>
              {videos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {videos.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-blue-50 p-2 rounded">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setVideos(videos.filter((_, i) => i !== idx))}
                        className="text-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div>
              <FormLabel className="mb-2 block">Inspection Checklist</FormLabel>
              <div className="space-y-2">
                {checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 bg-gray-50 p-2 rounded">
                    <span className="text-sm font-medium flex-1">{item.item}</span>
                    <Select
                      value={item.status}
                      onValueChange={(val) => handleChecklistChange(idx, val)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok">OK</SelectItem>
                        <SelectItem value="issue">Issue</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspection Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed inspection notes, observations, issues found..."
                      className="resize-none h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Uploading & Saving...' : 'Create Pre-Inspection'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
