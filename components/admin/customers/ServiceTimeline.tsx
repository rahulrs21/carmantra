"use client";

import { useEffect, useState } from 'react';
import type { Customer, ServiceBooking } from '@/lib/types';
import { listServiceHistoryForCustomer } from '@/lib/firestore/customers';

export default function ServiceTimeline({ customer }: { customer: Customer; }) {
  const [items, setItems] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const rows = await listServiceHistoryForCustomer(customer);
      setItems(rows);
      setLoading(false);
    })();
  }, [customer.id]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (!items.length) return <div className="p-4 text-sm text-gray-500">No service history</div>;

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />
      <ul className="space-y-4">
        {items.map(it => {
          const date = it.scheduledDate?.toDate ? it.scheduledDate.toDate().toLocaleString() : '';
          return (
            <li key={it.id} className="relative">
              <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-orange-500" />
              <div className="bg-white rounded border p-3">
                <div className="text-sm font-semibold">{it.category || 'Service'}</div>
                <div className="text-xs text-gray-500">{date}</div>
                <div className="text-xs mt-1">Status: <span className="font-medium">{it.status || 'pending'}</span></div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
