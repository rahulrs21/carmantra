"use client";

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';

export default function sssSendFormForm({ onCreated, onCancel }: { onCreated?: (id: string) => void; onCancel?: () => void; }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setStatus(null);
    if (!email) return setStatus('Enter customer email');
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'sentForms'), { name, email, phone, service, message, createdAt: serverTimestamp() });

      // Convert attachment to base64 if present
      let attachmentData = null;
      if (attachment) {
        const reader = new FileReader();
        attachmentData = await new Promise((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({
              name: attachment.name,
              data: base64,
              type: attachment.type,
            });
          };
          reader.readAsDataURL(attachment);
        });
      }

      // send email via existing API
      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, service, message, attachment: attachmentData }),
      });
      const json = await resp.json();
      if (json?.success) {
        setStatus('Form sent to customer successfully');
        setName(''); setEmail(''); setPhone(''); setService(''); setMessage(''); setAttachment(null);
        if (onCreated) onCreated(docRef.id);
      } else {
        setStatus('Failed to send email');
      }
    } catch (err) {
      safeConsoleError('Send form error', err);
      setStatus('Failed to send form');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSend} className="space-y-4">
      {status && <div className="p-2 rounded bg-green-50 text-green-700">{status}</div>}

      <div>
        <label className="block text-sm text-gray-600">Name</label>
        <input className="w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm text-gray-600">Email</label>
        <input className="w-full border p-2 rounded" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600">Phone</label>
          <input className="w-full border p-2 rounded" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Service</label>
          <input className="w-full border p-2 rounded" value={service} onChange={e => setService(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600">Message</label>
        <textarea className="w-full border p-2 rounded" value={message} onChange={e => setMessage(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm text-gray-600">Attachment (Optional)</label>
        <input type="file" className="w-full border p-2 rounded" onChange={handleFileChange} />
        {attachment && <p className="text-xs text-gray-500 mt-1">📎 {attachment.name}</p>}
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && <button type="button" className="px-3 py-1 rounded border" onClick={onCancel}>Cancel</button>}
        <button className="bg-indigo-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Sending…' : 'Send'}</button>
      </div>
    </form>
  );
}
