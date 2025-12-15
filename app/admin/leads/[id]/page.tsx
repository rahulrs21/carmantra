"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'crm-leads', id));
        if (!snap.exists()) {
          setError('Lead not found');
          setLead(null);
        } else {
          setLead({ ...(snap.data() as any), id: snap.id });
        }
      } catch (err: any) {
        safeConsoleError('Lead fetch error', err);
        setError(err?.message || 'Unable to fetch lead');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Lead details</h1>
          <p className="text-sm text-gray-500">{id}</p>
        </div>
        <div>
          <button className="text-sm text-gray-600 hover:underline" onClick={() => router.push('/admin/leads')}>Back to leads</button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded shadow">Loading…</div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded">{error}</div>
      ) : lead ? (
        <div className="bg-white rounded shadow p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400">Name</div>
              <div className="font-medium">{lead.name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Contact</div>
              <div className="font-medium">{lead.email || lead.phone || '—'}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-400">Service</div>
              <div className="font-medium">{lead.service || '—'}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-400">Message</div>
              <div className="whitespace-pre-wrap mt-1">{lead.message || '—'}</div>
            </div>
            <div className="sm:col-span-2 text-sm text-gray-500">Received: {formatDate(lead.createdAt)}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
