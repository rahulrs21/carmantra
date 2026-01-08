"use client";

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, where, getDocs } from 'firebase/firestore';
import { safeConsoleError } from '@/lib/safeConsole';
import { formatDateTime } from '@/lib/utils';
import { ModuleAccess, PermissionGate, ModuleAccessComponent } from '@/components/PermissionGate';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

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
  const [rangeType, setRangeType] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'not-booked' | 'completed'>('all');
  const [selectedRange, setSelectedRange] = useState<any>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  function toDate(value: Lead['createdAt']): Date | null {
    if (!value) return null;
    if (typeof (value as any)?.toDate === 'function') return (value as any).toDate();
    if ((value as any)?.seconds) return new Date((value as any).seconds * 1000);
    return null;
  }

  function startOfDay(d: Date) {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  const range = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = new Date(todayStart.getTime() + 24 * 3600 * 1000 - 1);
    if (rangeType === 'today') return { start: todayStart, end: todayEnd };
    if (rangeType === 'yesterday') {
      const yStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
      const yEnd = new Date(todayEnd.getTime() - 24 * 3600 * 1000);
      return { start: yStart, end: yEnd };
    }
    if (rangeType === '7d') {
      const start = new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000);
      return { start, end: todayEnd };
    }
    if (rangeType === '30d') {
      const start = new Date(todayStart.getTime() - 29 * 24 * 3600 * 1000);
      return { start, end: todayEnd };
    }
    if (rangeType === 'custom' && selectedRange?.from && selectedRange?.to) {
      const start = startOfDay(selectedRange.from);
      const end = new Date(startOfDay(selectedRange.to).getTime() + 24 * 3600 * 1000 - 1);
      return { start, end };
    }
    return null;
  }, [rangeType, selectedRange]);

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
    const t = queryText.toLowerCase();
    return leads.filter((l) => {
      // text match
      const matchesText =
        !t ||
        (l.name || '').toLowerCase().includes(t) ||
        (l.email || '').toLowerCase().includes(t) ||
        (l.phone || '').toLowerCase().includes(t) ||
        (l.service || '').toLowerCase().includes(t) ||
        (l.message || '').toLowerCase().includes(t);

      if (!matchesText) return false;

      // status filter match
      if (statusFilter !== 'all') {
        const leadStatus = l.bookingStatus || 'not-booked';
        if (statusFilter === 'pending' && leadStatus !== 'pending') return false;
        if (statusFilter === 'not-booked' && leadStatus !== 'not-booked') return false;
        if (statusFilter === 'completed' && leadStatus !== 'completed') return false;
      }

      // date range match
      if (!range) return true;
      const d = toDate(l.createdAt);
      if (!d) return false;
      return d >= range.start && d <= range.end;
    });
  }, [leads, queryText, range, statusFilter]);

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
  }, [queryText, itemsPerPage, rangeType, selectedRange, statusFilter]);

  return (
    <ModuleAccessComponent module={ModuleAccess.LEADS}>
      <div className="space-y-4 sm:space-y-6 max-w-full w-full overflow-x-hidden">
        <header className="flex flex-col gap-3 sm:gap-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold">Leads</h1>
              <p className="text-xs sm:text-sm text-gray-500">Manage contact requests and inquiries</p>
            </div>
            <PermissionGate module="leads" action="create">
              <button
                className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 text-sm whitespace-nowrap self-start sm:self-auto"
                onClick={() => downloadCSV(sorted)}
                disabled={loading || sorted.length === 0}
              >Export CSV</button>
            </PermissionGate>
          </div>
          <div className="flex gap-3 items-center w-full min-w-0">
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search name, email, service or message"
              className="border px-3 py-2 rounded w-full text-sm"
            />
          </div>
        </header>

        {/* Date Range and Status Filters */}
        <div className="bg-white rounded shadow px-3 py-3 sm:px-4 sm:py-4 flex flex-col  gap-4 w-full min-w-0">
          {/* Filter Section */}
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6">

            {/* Date Range Filter */}
            <div className="w-full min-w-0">
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-700">Date range</span>
                {range && (
                  <span className="text-xs text-gray-500 whitespace-nowrap capitalize ml-2">
                    {rangeType === 'custom' && selectedRange?.from && selectedRange?.to
                      ? `${selectedRange.from.toLocaleDateString()} - ${selectedRange.to.toLocaleDateString()}`
                      : rangeType}
                  </span>
                )}
              </div>

              {/* Date Range Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full pr-1 min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: '7d', label: '7 Days' },
                    { key: '30d', label: '30 Days' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => { setRangeType(item.key); setCurrentPage(1); }}
                    className={`px-3 py-2 text-xs sm:text-sm rounded border flex-shrink-0 whitespace-nowrap ${rangeType === item.key ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className={`px-3 py-2 text-xs sm:text-sm rounded border flex-shrink-0 whitespace-nowrap ${rangeType === 'custom' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}>
                      Custom
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <Calendar
                      mode="range"
                      selected={selectedRange}
                      onSelect={(r: any) => setSelectedRange(r)}
                      numberOfMonths={1}
                      defaultMonth={selectedRange?.from}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <button
                        className="text-xs text-gray-600 hover:underline"
                        onClick={() => { setSelectedRange(undefined); setRangeType('all'); setIsPopoverOpen(false); }}
                      >
                        Clear
                      </button>
                      <button
                        className="text-xs bg-indigo-600 text-white px-3 py-1 rounded"
                        onClick={() => { setRangeType('custom'); setIsPopoverOpen(false); setCurrentPage(1); }}
                        disabled={!selectedRange?.from || !selectedRange?.to}
                      >
                        Apply
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full min-w-0">
              {/* Status Filter Section */}
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-700">Status Filter</span>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full pr-1 min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {(
                  [
                    { key: 'all', label: 'All Status' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'not-booked', label: 'Not Booked' },
                    { key: 'completed', label: 'Completed' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => { setStatusFilter(item.key); setCurrentPage(1); }}
                    className={`px-3 py-2 text-xs sm:text-sm rounded border flex-shrink-0 whitespace-nowrap ${statusFilter === item.key ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>
        ) : null}

        <div className="bg-white rounded shadow md:overflow-x-auto overflow-hidden">
          {loading ? (
            <div className="p-6">Loading…</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {paginated.length === 0 && (
                  <div className="p-4 rounded border text-sm text-gray-500">No leads found</div>
                )}
                {paginated.map((l) => (
                  <div key={l.id} className="rounded-lg border bg-white shadow-sm p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm break-words">{l.name || '—'}</div>
                        <div className="text-xs text-gray-500 break-words">{l.service || '—'}</div>
                        <div className="text-xs text-gray-500 break-words">{(l.message || '').slice(0, 80)}{(l.message || '').length > 80 ? '…' : ''}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-[11px] font-medium inline-block whitespace-nowrap ${l.bookingStatus === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : l.bookingStatus === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : l.bookingStatus === 'pending'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                        {l.bookingStatus === 'not-booked' ? 'Not Booked' : l.bookingStatus}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      <span className="whitespace-nowrap">{l.phone || '—'}</span>
                      <span className="text-gray-300">•</span>
                      <span className="break-all">{l.email || '—'}</span>
                    </div>
                    <div className="text-xs text-gray-500">{formatDateTime(l.createdAt)}</div>
                    <div className="flex gap-2">
                      <a href={`/admin/leads/${l.id}`}>
                        <button className="text-white bg-blue-500 border border-transparent hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 shadow-xs font-medium rounded text-xs px-3 py-2 focus:outline-none whitespace-nowrap">
                          View
                        </button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                        <div className="flex items-center">
                          Name
                          <SortIcon field="name" />
                        </div>
                      </th>
                      <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('service')}>
                        <div className="flex items-center">
                          Service
                          <SortIcon field="service" />
                        </div>
                      </th>
                      <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">Phone</th>
                      <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">Email</th>
                      <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                        <div className="flex items-center">
                          Status
                          <SortIcon field="status" />
                        </div>
                      </th>
                      <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                        <div className="flex items-center">
                          Date
                          <SortIcon field="date" />
                        </div>
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-sm text-gray-500">No leads found</td></tr>
                    )}
                    {paginated.map(l => (
                      <tr key={l.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top">
                          <div className="font-medium text-sm break-words">{l.name || '—'}</div>
                          <div className="text-xs text-gray-400 break-words">{(l.message || '').slice(0, 80)}{(l.message || '').length > 80 ? '…' : ''}</div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top text-sm whitespace-nowrap">{l.service || '—'}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top text-sm whitespace-nowrap">{l.phone || '—'}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top">
                          <div className="text-xs sm:text-sm break-all">{l.email || '—'}</div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top">
                          <span className={`px-2 py-1 rounded text-xs font-medium inline-block whitespace-nowrap ${l.bookingStatus === 'completed'
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
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top text-xs sm:text-sm text-gray-500 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top">
                          <div className="flex gap-2">
                            <a href={`/admin/leads/${l.id}`}>
                              <button className="text-white bg-blue-500 box-border border border-transparent hover:bg-blue-600 focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded text-xs sm:text-sm px-3 sm:px-4 py-2 focus:outline-none whitespace-nowrap">
                                View
                              </button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && sorted.length > 0 && (
          <div className="bg-white rounded shadow p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="text-xs sm:text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} leads
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Items per page:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border rounded px-2 py-1 text-xs sm:text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 sm:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
                >
                  Prev
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
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
                        className={`px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm flex-shrink-0 ${currentPage === pageNum
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
                  className="px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
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
    </ModuleAccessComponent>
  );
}