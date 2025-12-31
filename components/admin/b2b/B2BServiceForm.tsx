"use client";

import { useState } from 'react';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';
import { B2BService } from '@/lib/types';
import { addB2BService, updateB2BService } from '@/lib/firestore/b2b';

export default function B2BServiceForm({
  service,
  vehicleId,
  onSuccess,
  onCancel,
}: {
  service?: B2BService;
  vehicleId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [formData, setFormData] = useState({
    category: service?.category || '',
    description: service?.description || '',
    status: service?.status || 'pending',
    amount: service?.amount || 0,
    scheduledDate: service?.scheduledDate ? new Date(service.scheduledDate.seconds * 1000).toISOString().slice(0, 16) : '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.category) {
        setError('Please fill in all required fields (Service Category)');
        setLoading(false);
        return;
      }

      if (!vehicleId) {
        setError('Vehicle ID is missing');
        setLoading(false);
        return;
      }

      console.log('Submitting service form:', {
        isEdit: !!service?.id,
        serviceId: service?.id,
        vehicleId,
        formData,
      });

      const serviceData: any = {
        ...formData,
        vehicleId,
        companyId: '', // Will be set from vehicle data
      };

      if (formData.scheduledDate) {
        serviceData.scheduledDate = new Date(formData.scheduledDate);
      }

      if (service?.id) {
        console.log('Updating existing service:', service.id);
        await updateB2BService(service.id, serviceData);
        console.log('Service updated successfully');
      } else {
        console.log('Adding new service');
        const newServiceId = await addB2BService(serviceData);
        console.log('Service added successfully with ID:', newServiceId);
      }

      console.log('Service form submission completed, calling onSuccess');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Service form submission error:', err);
      safeConsoleError('Form submission error:', err);
      setError(err?.message || 'An error occurred while saving the service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-800 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Category *</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="e.g., Car Wash, Ceramic Coating, etc."
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter service description"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED)</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter amount"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
          <input
            type="datetime-local"
            name="scheduledDate"
            value={formData.scheduledDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-md disabled:opacity-50"
        >
          {loading ? 'Saving...' : service ? 'Update Service' : 'Add Service'}
        </button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
