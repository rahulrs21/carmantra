"use client";

import { useEffect, useState } from 'react';
import { listNotes, addNote, deleteNote } from '@/lib/firestore/customers';
import type { Note } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';

export default function NotesSection({ customerId }: { customerId: string; }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function refresh() {
    setLoading(true);
    const rows = await listNotes(customerId);
    setNotes(rows);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [customerId]);

  async function handleAdd() {
    if (!message.trim()) return;
    await addNote(customerId, message.trim());
    setMessage('');
    refresh();
  }

  async function handleDelete(id?: string) {
    if (!id) return;
    await deleteNote(customerId, id);
    refresh();
  }

  return (
    <div className="space-y-3">
      <PermissionGate module="customers" action="create">
        <div className="flex gap-2">
          <Input placeholder="Add a note" value={message} onChange={e => setMessage(e.target.value)} />
          <Button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700">Add</Button>
        </div>
      </PermissionGate>
      <div className="bg-white rounded border divide-y">
        {loading ? (
          <div className="p-4">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No notes yet</div>
        ) : (
          notes.map(n => (
            <div key={n.id} className="p-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm">{n.message}</div>
                <div className="text-xs text-gray-500 mt-1">{formatDateTime(n.createdAt)}</div>
              </div>
              <PermissionGate module="customers" action="delete">
                <button className="text-xs text-red-600" onClick={() => handleDelete(n.id)}>Delete</button>
              </PermissionGate>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
