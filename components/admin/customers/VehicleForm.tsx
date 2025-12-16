"use client";

import { useState } from 'react';
import type { Vehicle } from '@/lib/types';
import { addVehicle, updateVehicle } from '@/lib/firestore/customers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function VehicleForm({
  customerId,
  initial,
  onSaved,
}: {
  customerId: string;
  initial?: Partial<Vehicle>;
  onSaved?: () => void;
}) {
  const [data, setData] = useState<Partial<Vehicle>>({
    make: initial?.make || '',
    model: initial?.model || '',
    plate: initial?.plate || '',
    year: initial?.year || undefined,
    vin: initial?.vin || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?.id) {
        await updateVehicle(customerId, initial.id, data as any);
      } else {
        await addVehicle(customerId, data as any);
      }
      onSaved?.();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="make">Make</Label>
          <Input id="make" value={data.make as string} onChange={e => setData({ ...data, make: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="model">Model</Label>
          <Input id="model" value={data.model as string} onChange={e => setData({ ...data, model: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="plate">Plate</Label>
          <Input id="plate" value={data.plate as string} onChange={e => setData({ ...data, plate: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="year">Year</Label>
          <Input id="year" type="number" value={(data.year as any) || ''} onChange={e => setData({ ...data, year: parseInt(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="vin">VIN</Label>
          <Input id="vin" value={data.vin as string} onChange={e => setData({ ...data, vin: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={saving}>{saving ? 'Saving…' : 'Save Vehicle'}</Button>
      </div>
    </form>
  );
}
