"use client";

import { useEffect, useMemo, useState } from 'react';
import { listCustomers, deleteCustomer } from '@/lib/firestore/customers';
import { syncExistingBookingsToCustomers } from '@/lib/firestore/syncExistingBookings';
import type { Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import CustomerForm from '@/components/admin/customers/CustomerForm';
import { useRouter } from 'next/navigation';

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
  useEffect(() => { setCurrentPage(1); }, [q, status, itemsPerPage]);

  const paginated = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return rows.slice(startIndex, endIndex);
  }, [rows, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(rows.length / itemsPerPage);

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm('Delete this customer?')) return;
    await deleteCustomer(id);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-gray-500">Manage your CRM customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncExisting} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync All Modules'}
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowCreate(true)}>New Customer</Button>
        </div>
      </div>

      {syncStatus && (
        <div className="p-4 rounded bg-blue-50 text-blue-800 text-sm">
          {syncStatus}
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Input placeholder="Search name, email, mobile" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
          <select className="border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value as any)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      <div className="bg-white rounded shadow overflow-auto">
        {loading ? (
          <div className="p-6">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No customers found</div>
        ) : (
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
                  <td className="px-4 py-3 text-sm">{c.email}</td>
                  <td className="px-4 py-3 text-sm">{c.mobile}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`px-2 py-1 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 border rounded" onClick={() => router.push(`/admin/customers/${c.id}`)}>View</button>
                      <button className="px-2 py-1 border rounded text-red-600" onClick={() => remove(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && rows.length > 0 && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, rows.length)} of {rows.length} customers
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
                  let pageNum;
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
  );
}
