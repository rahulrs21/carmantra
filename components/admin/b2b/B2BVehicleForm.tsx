"use client";

import { useState } from 'react';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';
import { B2BVehicle } from '@/lib/types';
import { addB2BVehicle, updateB2BVehicle } from '@/lib/firestore/b2b';

export default function B2BVehicleForm({
  vehicle,
  companyId,
  onSuccess,
  onCancel,
}: {
  vehicle?: B2BVehicle;
  companyId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [formData, setFormData] = useState({
    vehicleBrand: vehicle?.vehicleBrand || '',
    modelName: vehicle?.modelName || '',
    numberPlate: vehicle?.numberPlate || '',
    vin: vehicle?.vin || '',
    fuelType: vehicle?.fuelType || '',
    vehicleType: vehicle?.vehicleType || '',
    color: vehicle?.color || '',
    year: vehicle?.year || new Date().getFullYear(),
    status: vehicle?.status || 'active',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.vehicleBrand || !formData.modelName || !formData.numberPlate) {
        setError('Please fill in all required fields (Brand, Model, Number Plate)');
        setLoading(false);
        return;
      }

      if (!companyId) {
        setError('Company ID is missing');
        setLoading(false);
        return;
      }

      console.log('Submitting vehicle form:', {
        vehicle: !!vehicle?.id,
        vehicleId: vehicle?.id,
        companyId,
        formData,
      });

      if (vehicle?.id) {
        console.log('Updating existing vehicle:', vehicle.id);
        await updateB2BVehicle(vehicle.id, {
          ...formData,
          companyId,
        });
        console.log('Vehicle updated successfully');
      } else {
        console.log('Adding new vehicle with companyId:', companyId);
        const newVehicleId = await addB2BVehicle({
          ...formData,
          companyId,
        });
        console.log('Vehicle added successfully with ID:', newVehicleId);
      }

      console.log('Vehicle form submission completed, calling onSuccess');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Vehicle form submission error:', err);
      safeConsoleError('Form submission error:', err);
      setError(err?.message || 'An error occurred while saving the vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-800 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Brand *</label>
          <input
            type="text"
            name="vehicleBrand"
            value={formData.vehicleBrand}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="e.g., Toyota"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
          <input
            type="text"
            name="modelName"
            value={formData.modelName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="e.g., Camry"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number Plate *</label>
          <input
            type="text"
            name="numberPlate"
            value={formData.numberPlate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="e.g., ABC 123"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
          <input
            type="text"
            name="vin"
            value={formData.vin}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter VIN"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            min="1900"
            max={new Date().getFullYear()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
          <select
            name="fuelType"
            value={formData.fuelType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select fuel type</option>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Electric">Electric</option>
            <option value="CNG">CNG</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
          <select
            name="vehicleType"
            value={formData.vehicleType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select vehicle type</option>
            <option value="Sedan">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="Hatchback">Hatchback</option>
            <option value="Pickup">Pickup</option>
            <option value="Van">Van</option>
            <option value="Coupe">Coupe</option>
            <option value="Convertible">Convertible</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input
            type="text"
            name="color"
            value={formData.color}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="e.g., Silver"
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
          {loading ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
