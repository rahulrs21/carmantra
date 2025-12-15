"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import QuotationForm from '@/components/admin/QuotationForm';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setQuotations(snap.docs.map(d => ({ ...(d.data() as any), id: d.id })));
      setLoading(false);
    }, err => {
      safeConsoleError('Quotations snapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quotations</h1>
        <div>
          <button className="bg-indigo-600 text-white px-3 py-2 rounded" onClick={() => setShowCreate(true)}>Create new quotation</button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        {loading ? <div className="p-6">Loading…</div> : (
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left text-sm text-gray-600">Customer</th>
              <th className="px-4 py-3 text-left text-sm text-gray-600">Service</th>
              <th className="px-4 py-3 text-left text-sm text-gray-600">Price</th>
              <th className="px-4 py-3 text-left text-sm text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-sm text-gray-600">Action</th>
            </tr></thead>
            <tbody>
              {quotations.map(qt => (
                <tr key={qt.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{qt.customerName}</td>
                  <td className="px-4 py-3">{qt.service}</td>
                  <td className="px-4 py-3">{qt.price}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{qt.createdAt?.toDate ? qt.createdAt.toDate().toLocaleString() : ''}</td>
                  <td className="px-4 py-3">
                    <a className="text-indigo-600 hover:underline" href={`/admin/quotation/${qt.id}`}>View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Quotation</h3>
              <button className="text-gray-500" onClick={() => setShowCreate(false)}>Close</button>
            </div>
            <QuotationForm onCreated={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
