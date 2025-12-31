"use client";

import { useState } from 'react';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';
import { B2BCompany } from '@/lib/types';
import { addB2BCompany, updateB2BCompany } from '@/lib/firestore/b2b';

export default function B2BCompanyForm({
  company,
  onSuccess,
  onCancel,
}: {
  company?: B2BCompany;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [formData, setFormData] = useState({
    companyName: company?.companyName || '',
    companyEmail: company?.companyEmail || '',
    companyPhone: company?.companyPhone || '',
    contactPerson: company?.contactPerson || '',
    companyVat: company?.companyVat || '',
    companyCode: company?.companyCode || '',
    address: company?.address || '',
    city: company?.city || '',
    state: company?.state || '',
    country: company?.country || '',
    status: company?.status || 'active',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.companyName || !formData.companyEmail || !formData.companyPhone || !formData.contactPerson) {
        setError('Please fill in all required fields (Name, Email, Phone, Contact Person)');
        setLoading(false);
        return;
      }

      console.log('Submitting company form:', {
        isEdit: !!company?.id,
        companyId: company?.id,
        formData,
      });

      if (company?.id) {
        console.log('Updating existing company:', company.id);
        await updateB2BCompany(company.id, formData);
        console.log('Company updated successfully');
      } else {
        console.log('Adding new company');
        const newCompanyId = await addB2BCompany(formData);
        console.log('Company added successfully with ID:', newCompanyId);
      }

      console.log('Company form submission completed, calling onSuccess');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Company form submission error:', err);
      safeConsoleError('Form submission error:', err);
      setError(err?.message || 'An error occurred while saving the company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-800 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter company name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
          <input
            type="text"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter contact person"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            name="companyEmail"
            value={formData.companyEmail}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input
            type="tel"
            name="companyPhone"
            value={formData.companyPhone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter phone"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company VAT</label>
          <input
            type="text"
            name="companyVat"
            value={formData.companyVat}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter VAT number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Code</label>
          <input
            type="text"
            name="companyCode"
            value={formData.companyCode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter company code"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter city"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter state"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter country"
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
          {loading ? 'Saving...' : company ? 'Update Company' : 'Add Company'}
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
