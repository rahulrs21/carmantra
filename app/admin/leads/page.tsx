"use client";

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { safeConsoleError } from '@/lib/safeConsole';

interface Lead {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  message?: string;
  createdAt?: { seconds: number } | { toDate: () => Date };
}

function formatDate(ts?: Lead['createdAt']) {
  if (!ts) return '-';
  try {
    if ('toDate' in ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
    if ((ts as any).seconds) return new Date((ts as any).seconds * 1000).toLocaleString();
  } catch { }
  return '-';
}

function downloadCSV(leads: Lead[]) {
  const headers = ['id', 'name', 'email', 'phone', 'service', 'message', 'createdAt'];
  const rows = leads.map(l => [
    l.id,
    l.name || '',
    l.email || '',
    l.phone || '',
    l.service || '',
    (l.message || '').replace(/\n/g, ' '),
    formatDate(l.createdAt)
  ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'crm-leads'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setLeads(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Lead)));
      setLoading(false);
    }, err => {
      safeConsoleError('Leads snapshot error', err);
      setError(err?.message || 'Unable to load leads');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!queryText) return leads;
    const t = queryText.toLowerCase();
    return leads.filter(l => (
      (l.name || '').toLowerCase().includes(t) ||
      (l.email || '').toLowerCase().includes(t) ||
      (l.phone || '').toLowerCase().includes(t) ||
      (l.service || '').toLowerCase().includes(t) ||
      (l.message || '').toLowerCase().includes(t)
    ));
  }, [leads, queryText]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-gray-500">Manage contact requests and inquiries</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search name, email, service or message"
            className="border px-3 py-2 rounded w-80"
          />
          <button
            className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
            onClick={() => downloadCSV(filtered)}
            disabled={loading || filtered.length === 0}
          >Export CSV</button>
        </div>
      </header>

      {error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>
      ) : null}

      <div className="bg-white rounded shadow overflow-auto">
        {loading ? (
          <div className="p-6">Loading…</div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Name</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Service</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Email</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Date</th>
                <th className="px-4 py-3 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No leads found</td></tr>
              )}
              {filtered.map(l => (
                <tr key={l.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{l.name || '—'}</div>
                    <div className="text-xs text-gray-400">{(l.message || '').slice(0, 80)}{(l.message||'').length>80?'…':''}</div>
                  </td>
                  <td className="px-4 py-3 align-top">{l.service || '—'}</td>
                  <td className="px-4 py-3 align-top">{l.phone || '—'}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-sm">{l.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-gray-500">{formatDate(l.createdAt)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-2">
                      {/* {l.email && <a className="text-sm text-blue-600 hover:underline" href={`mailto:${l.email}`}>Email</a>} */}
                      <a href={`/admin/leads/${l.id}`} ><button  className="text-white bg-blue-500 box-border border border-transparent hover:bg-blue-600 focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded text-sm px-4 py-2.5 focus:outline-none">View</button></a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full z-10 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">Lead details</h3>
              <button className="text-gray-500" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400">Name</div>
                <div className="font-medium">{selected.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Phone</div>
                <div className="font-medium">{selected.phone || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Contact</div>
                <div className="font-medium">{selected.email || selected.phone || '—'}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-gray-400">Service</div>
                <div className="font-medium">{selected.service || '—'}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-gray-400">Message</div>
                <div className="whitespace-pre-wrap mt-1">{selected.message || '—'}</div>
              </div>
              <div className="sm:col-span-2 text-sm text-gray-500">Received: {formatDate(selected.createdAt)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}