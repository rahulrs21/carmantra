"use client";

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, where, getDocs } from 'firebase/firestore';
import { safeConsoleError } from '@/lib/safeConsole';
import { formatDateTime } from '@/lib/utils';

interface Lead {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  message?: string;
  createdAt?: { seconds: number } | { toDate: () => Date };
  bookingStatus?: string;
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
    formatDateTime(l.createdAt)
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
  const [sortField, setSortField] = useState<'name' | 'service' | 'status' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const handleSort = (field: 'name' | 'service' | 'status' | 'date') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: 'name' | 'service' | 'status' | 'date' }) => {
    if (sortField !== field) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    return sortDirection === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  useEffect(() => {
    const q = query(collection(db, 'crm-leads'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async snap => {
      const leadsData = snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Lead));
      
      // Fetch booking status for each lead
      const leadsWithStatus = await Promise.all(
        leadsData.map(async (lead) => {
          try {
            const bookingsQuery = query(
              collection(db, 'bookedServices'),
              where('sourceLeadId', '==', lead.id)
            );
            const bookingsSnap = await getDocs(bookingsQuery);
            
            if (!bookingsSnap.empty) {
              const booking = bookingsSnap.docs[0].data();
              return { ...lead, bookingStatus: booking.status || 'pending' };
            }
            return { ...lead, bookingStatus: 'not-booked' };
          } catch (err) {
            return { ...lead, bookingStatus: 'not-booked' };
          }
        })
      );
      
      setLeads(leadsWithStatus);
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

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'service':
          aVal = (a.service || '').toLowerCase();
          bVal = (b.service || '').toLowerCase();
          break;
        case 'status':
          aVal = a.bookingStatus || 'not-booked';
          bVal = b.bookingStatus || 'not-booked';
          break;
        case 'date':
          aVal = (a.createdAt as any)?.seconds || 0;
          bVal = (b.createdAt as any)?.seconds || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filtered, sortField, sortDirection]);

  const paginated = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sorted.slice(startIndex, endIndex);
  }, [sorted, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [queryText, itemsPerPage]);

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
            onClick={() => downloadCSV(sorted)}
            disabled={loading || sorted.length === 0}
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
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                  <div className="flex items-center">
                    Name
                    <SortIcon field="name" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('service')}>
                  <div className="flex items-center">
                    Service
                    <SortIcon field="service" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Email</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                  <div className="flex items-center">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                  <div className="flex items-center">
                    Date
                    <SortIcon field="date" />
                  </div>
                </th>
                <th className="px-4 py-3 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500">No leads found</td></tr>
              )}
              {paginated.map(l => (
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
                  <td className="px-4 py-3 align-top">
                    <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                      l.bookingStatus === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : l.bookingStatus === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : l.bookingStatus === 'pending'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                    }`}>
                      {l.bookingStatus === 'not-booked' ? 'Not Booked' : l.bookingStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-gray-500">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-2">
                      <a href={`/admin/leads/${l.id}`}>
                        <button className="text-white bg-blue-500 box-border border border-transparent hover:bg-blue-600 focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded text-sm px-4 py-2.5 focus:outline-none">
                          View
                        </button>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && sorted.length > 0 && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} leads
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Items per page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="sm:col-span-2 text-sm text-gray-500">Received: {formatDateTime(selected.createdAt)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}