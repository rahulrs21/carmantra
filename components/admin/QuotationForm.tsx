"use client";

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';

export default function QuotationForm({ onCreated, onCancel }: { onCreated?: (id: string) => void; onCancel?: () => void; }) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [service, setService] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setMessage(null);
    if (!customerName || !service || price === '') return setMessage('Fill required fields');
    setLoading(true);

    try {
      const auth = getAuth();
      if (!auth.currentUser) throw new Error('Not authenticated');

      const docRef = await addDoc(collection(db, 'quotations'), {
        ownerId: auth.currentUser.uid, // <-- required for Firestore rules
        customerName,
        customerEmail,
        service,
        price: Number(price),
        notes,
        createdAt: serverTimestamp(),
      });

      setMessage(`Quotation created: ${docRef.id}`);
      setCustomerName(''); setCustomerEmail(''); setService(''); setPrice(''); setNotes('');
      if (onCreated) onCreated(docRef.id);
    } catch (err) {
      safeConsoleError('Create quotation error', err);
      setMessage('Failed to create quotation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      {message && <div className="p-2 rounded bg-green-50 text-green-700">{message}</div>}

      <div>
        <label className="block text-sm text-gray-600">Customer name</label>
        <input className="w-full border p-2 rounded" value={customerName} onChange={e => setCustomerName(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm text-gray-600">Customer email</label>
        <input className="w-full border p-2 rounded" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600">Service</label>
          <input className="w-full border p-2 rounded" value={service} onChange={e => setService(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Price</label>
          <input type="number" className="w-full border p-2 rounded" value={price as any} onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600">Notes</label>
        <textarea className="w-full border p-2 rounded" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && <button type="button" className="px-3 py-1 rounded border" onClick={onCancel}>Cancel</button>}
        <button className="bg-indigo-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Creating…' : 'Create Quotation'}</button>
      </div>
    </form>
  );
}
