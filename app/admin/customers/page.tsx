"use client";

import { useEffect, useMemo, useState } from 'react';
import { listCustomers, deleteCustomer } from '@/lib/firestore/customers';
import { syncExistingBookingsToCustomers } from '@/lib/firestore/syncExistingBookings';
import type { Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import CustomerForm from '@/components/admin/customers/CustomerForm';
import { useRouter } from 'next/navigation';
import { ModuleAccess, PermissionGate } from '@/components/PermissionGate';

export default function CustomersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all'|'active'|'inactive'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [rangeType, setRangeType] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'>('all');
  const [selectedRange, setSelectedRange] = useState<any>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  function toDate(value: Customer['createdAt']): Date | null {
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

  async function refresh() {
    setLoading(true);
    const data = await listCustomers({ search: q, status });
    setRows(data);
    setLoading(false);
  }

  async function handleSyncExisting() {
    if (!confirm('Sync all customers from Leads, Bookings, Invoices, and Quotations? This may take a moment.')) return;
    setSyncing(true);
    setSyncStatus('Syncing all modules...');
    try {
      const result = await syncExistingBookingsToCustomers();
      setSyncStatus(`✓ Synced ${result.synced} customers from all modules`);
      setTimeout(() => setSyncStatus(null), 5000);
      refresh();
    } catch (err: any) {
      setSyncStatus('Error syncing: ' + err.message);
      setTimeout(() => setSyncStatus(null), 5000);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => { const t = setTimeout(refresh, 200); return () => clearTimeout(t); }, [q, status]);
  useEffect(() => { setCurrentPage(1); }, [q, status, itemsPerPage, rangeType, selectedRange]);

  const filteredRows = useMemo(() => {
    if (!range) return rows;
    return rows.filter((r) => {
      const d = toDate(r.createdAt);
      if (!d) return false;
      return d >= range.start && d <= range.end;
    });
  }, [rows, range]);

  const paginated = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm('Delete this customer? This action cannot be undone.')) return;
    await deleteCustomer(id);
    refresh();
  }

  return (
    <ModuleAccess module="customers">
    <div className="space-y-6 max-w-full w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight break-words">Customers</h1>
          <p className="text-sm text-gray-500">Manage your CRM customers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <PermissionGate module="customers" action="create">
            <Button variant="outline" onClick={handleSyncExisting} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync All Modules'}
            </Button>
          </PermissionGate>
          <PermissionGate module="customers" action="create">
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowCreate(true)}>New Customer</Button>
          </PermissionGate>
        </div>
      </div>

      {syncStatus && (
        <div className="p-4 rounded bg-blue-50 text-blue-800 text-sm">
          {syncStatus}
        </div>
      )}

      <Card className="p-4 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
          <div className="flex flex-col sm:flex-row gap-3 w-full min-w-0">
            <Input placeholder="Search name, email, mobile" value={q} onChange={e => setQ(e.target.value)} className="w-full sm:max-w-xs" />
            <select className="border rounded px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full sm:w-auto min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {([
              { key: 'all', label: 'All' },
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: '7d', label: 'Last 7d' },
              { key: '30d', label: 'Last 30d' },
            ] as const).map((item) => (
              <button
                key={item.key}
                onClick={() => { setRangeType(item.key); setSelectedRange(undefined); }}
                className={`px-3 py-2 text-xs sm:text-sm rounded border flex-shrink-0 whitespace-nowrap ${
                  rangeType === item.key ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}

            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => setRangeType('custom')}
                  className={`px-3 py-2 text-xs sm:text-sm rounded border flex-shrink-0 whitespace-nowrap ${
                    rangeType === 'custom' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
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
                    onClick={() => setIsPopoverOpen(false)}
                    disabled={!selectedRange?.from || !selectedRange?.to}
                  >
                    Apply
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      <div className="bg-white rounded shadow overflow-hidden md:overflow-auto">
        {loading ? (
          <div className="p-6">Loading…</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No customers found</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 p-4 md:hidden">
              {paginated.map((c) => (
                <div key={c.id} className="rounded-lg border bg-white shadow-sm p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm break-words">{c.firstName} {c.lastName}</div>
                      <div className="text-xs text-gray-500 break-all">{c.email}</div>
                      <div className="text-xs text-gray-500 break-words">{c.mobile}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[11px] font-medium inline-block whitespace-nowrap ${
                      c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-white bg-blue-500 border border-transparent hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 shadow-xs font-medium rounded text-xs px-3 py-2 focus:outline-none whitespace-nowrap" onClick={() => router.push(`/admin/customers/${c.id}`)}>
                      View
                    </button>
                    <PermissionGate module="customers" action="delete">
                      <button className="text-red-600 border border-red-200 hover:bg-red-50 font-medium rounded text-xs px-3 py-2" onClick={() => remove(c.id)}>
                        Delete
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Mobile</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(c => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{c.firstName} {c.lastName}</td>
                      <td className="px-4 py-3 text-sm break-all">{c.email}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{c.mobile}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-1 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button className="px-2 py-1 border rounded" onClick={() => router.push(`/admin/customers/${c.id}`)}>View</button>
                          <PermissionGate module="customers" action="delete">
                            <button className="px-2 py-1 border rounded text-red-600" onClick={() => remove(c.id)}>Delete</button>
                          </PermissionGate>
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
      {!loading && filteredRows.length > 0 && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRows.length)} of {filteredRows.length} customers
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">Items per page:</label>
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
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
              >
                Previous
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
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Customer</h3>
              <button className="text-gray-500" onClick={() => setShowCreate(false)}>Close</button>
            </div>
            <CustomerForm onSaved={() => { setShowCreate(false); refresh(); }} />
          </div>
        </div>
      )}
    </div>
    </ModuleAccess>
  );
}
