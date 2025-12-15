"use client";

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';

interface Item { description: string; qty: number; price: number }

export default function InvoiceForm({ onCreated, onCancel }: { onCreated?: (id: string) => void; onCancel?: () => void; }) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [items, setItems] = useState<Item[]>([{ description: '', qty: 1, price: 0 }]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const total = items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0);

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setMessage(null);
    if (!customerName) return setMessage('Enter customer name');
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'invoices'), {
        customerName,
        customerEmail,
        items,
        notes,
        total,
        createdAt: serverTimestamp(),
      });
      setMessage(`Invoice created: ${docRef.id}`);
      setCustomerName(''); setCustomerEmail(''); setItems([{ description: '', qty: 1, price: 0 }]); setNotes('');
      if (onCreated) onCreated(docRef.id);
    } catch (err) {
      safeConsoleError('Create invoice error', err);
      setMessage('Failed to create invoice');
    } finally { setLoading(false); }
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
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

      <div>
        <label className="block text-sm text-gray-600 mb-2">Items</label>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2">
              <input className="col-span-3 border p-2 rounded" placeholder="Description" value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} />
              <input type="number" className="col-span-1 border p-2 rounded" value={it.qty} min={1} onChange={e => updateItem(idx, { qty: parseInt(e.target.value || '0', 10) })} />
              <input type="number" className="col-span-1 border p-2 rounded" value={it.price} step="0.01" onChange={e => updateItem(idx, { price: parseFloat(e.target.value || '0') })} />
              <button type="button" className="col-span-1 text-red-600" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>Remove</button>
            </div>
          ))}
          <div>
            <button type="button" className="text-sm text-blue-600" onClick={() => setItems(prev => [...prev, { description: '', qty: 1, price: 0 }])}>Add item</button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600">Notes</label>
        <textarea className="w-full border p-2 rounded" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Total: ₹{total.toFixed(2)}</div>
        <div className="flex gap-2">
          {onCancel && <button type="button" className="px-3 py-1 rounded border" onClick={onCancel}>Cancel</button>}
          <button className="bg-indigo-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Creating…' : 'Create Invoice'}</button>
        </div>
      </div>
    </form>
  );
}
