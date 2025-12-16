"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import SendFormForm from '@/components/admin/SendFormForm';
import { formatDateTime } from '@/lib/utils';

export default function SendFormPage() {
  const [sentForms, setSentForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'sentForms'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setSentForms(snap.docs.map(d => ({ ...(d.data() as any), id: d.id })));
      setLoading(false);
    }, err => {
      safeConsoleError('Sent forms snapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sent Forms</h1>
        <div>
          <button className="bg-indigo-600 text-white px-3 py-2 rounded" onClick={() => setShowCreate(true)}>Send new form</button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        {loading ? <div className="p-6">Loading…</div> : (
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left text-sm text-gray-600">Customer</th>
              <th className="px-4 py-3 text-left text-sm text-gray-600">Service</th>
              <th className="px-4 py-3 text-left text-sm text-gray-600">Email</th>
              <th className="px-4 py-3 text-left text-sm text-gray-600">Date</th>
            </tr></thead>
            <tbody>
              {sentForms.map(s => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">{s.service}</td>
                  <td className="px-4 py-3">{s.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(s.createdAt)}</td>
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
              <h3 className="text-lg font-semibold">Send Form</h3>
              <button className="text-gray-500" onClick={() => setShowCreate(false)}>Close</button>
            </div>
            <SendFormForm onCreated={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
