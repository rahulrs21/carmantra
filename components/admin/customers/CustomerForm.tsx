"use client";

import { useState } from 'react';
import type { Customer } from '@/lib/types';
import { createCustomer, updateCustomer } from '@/lib/firestore/customers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function CustomerForm({
  initial,
  onSaved,
}: {
  initial?: Partial<Customer>;
  onSaved?: () => void;
}) {
  const [data, setData] = useState<Partial<Customer>>({
    firstName: initial?.firstName || '',
    lastName: initial?.lastName || '',
    email: initial?.email || '',
    mobile: initial?.mobile || '',
    status: (initial?.status as any) || 'active',
    address: initial?.address || '',
    city: initial?.city || '',
    country: initial?.country || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      if (!data.firstName || !data.email || !data.mobile) {
        setError('First name, email and mobile are required');
        return;
      }
      if (initial?.id) {
        await updateCustomer(initial.id, data as any);
      } else {
        await createCustomer(data as any);
      }
      onSaved?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name*</Label>
          <Input id="firstName" value={data.firstName as string} onChange={e => setData({ ...data, firstName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" value={data.lastName as string} onChange={e => setData({ ...data, lastName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="email">Email*</Label>
          <Input id="email" type="email" value={data.email as string} onChange={e => setData({ ...data, email: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="mobile">Mobile*</Label>
          <Input id="mobile" value={data.mobile as string} onChange={e => setData({ ...data, mobile: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select id="status" className="w-full border rounded px-3 py-2" value={data.status as any} onChange={e => setData({ ...data, status: e.target.value as any })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input id="country" value={data.country as string} onChange={e => setData({ ...data, country: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" value={data.city as string} onChange={e => setData({ ...data, city: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={data.address as string} onChange={e => setData({ ...data, address: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={saving}>{saving ? 'Saving…' : 'Save Customer'}</Button>
      </div>
    </form>
  );
}
