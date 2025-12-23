"use client";

import { useEffect, useState } from 'react';
import type { Customer } from '@/lib/types';
import { getCustomerActivityHistory } from '@/lib/firestore/customers';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';

export default function ActivityHistory({ customer }: { customer: Customer; }) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const rows = await getCustomerActivityHistory(customer);
      setItems(rows);
      setLoading(false);
    })();
  }, [customer.id]);

  if (loading) return <div className="p-4">Loading activity…</div>;
  if (!items.length) return <div className="p-4 text-sm text-gray-500">No activity yet</div>;

  const getIcon = (type: string) => {
    switch (type) {
      case 'service':
        return (
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'lead':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'invoice':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getActionButton = (item: any) => {
    switch (item.type) {
      case 'service':
        return (
          <PermissionGate module="services" action="view">
            <button
              onClick={() => router.push(`/admin/book-service/${item.id}`)}
              className="text-xs text-orange-600 hover:underline"
            >
              View Service
            </button>
          </PermissionGate>
        );
      case 'lead':
        return (
          <PermissionGate module="leads" action="view">
            <button
              onClick={() => router.push(`/admin/leads/${item.id}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              View Lead
            </button>
          </PermissionGate>
        );
      case 'invoice':
        return (
          <PermissionGate module="invoices" action="view">
            <button
              onClick={() => router.push(`/admin/invoice/${item.id}`)}
              className="text-xs text-green-600 hover:underline"
            >
              View Invoice
            </button>
          </PermissionGate>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
      <ul className="space-y-4">
        {items.map(it => {
          const date = formatDateTime(it.date ? new Date(it.date) : undefined);
          return (
            <li key={it.key} className="relative">
              <div className="absolute -left-5 top-1 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                {getIcon(it.type)}
              </div>
              <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{it.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        it.type === 'service' ? 'bg-orange-100 text-orange-700' :
                        it.type === 'lead' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {it.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{it.description}</p>
                    <div className="text-xs text-gray-400 mt-2">{date}</div>
                  </div>
                  <div>
                    {getActionButton(it)}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
