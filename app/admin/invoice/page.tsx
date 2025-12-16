"use client";

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import InvoiceForm from '@/components/admin/InvoiceForm';
import { formatDateTime } from '@/lib/utils';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [queryText, setQueryText] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'customer' | 'total' | 'status' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const handleSort = (field: 'customer' | 'total' | 'status' | 'date') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: 'customer' | 'total' | 'status' | 'date' }) => {
    if (sortField !== field) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    return sortDirection === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setInvoices(snap.docs.map(d => ({ ...(d.data() as any), id: d.id })));
      setLoading(false);
    }, err => {
      safeConsoleError('Invoices snapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let result = invoices;
    
    // Filter by payment status
    if (paymentFilter !== 'all') {
      result = result.filter(inv => inv.paymentStatus === paymentFilter);
    }
    
    // Filter by search text
    if (queryText) {
      const t = queryText.toLowerCase();
      result = result.filter(inv => (
        (inv.customerName || '').toLowerCase().includes(t) ||
        (inv.customerEmail || '').toLowerCase().includes(t) ||
        (inv.customerMobile || '').toLowerCase().includes(t) ||
        (inv.invoiceNumber || '').toLowerCase().includes(t)
      ));
    }
    
    return result;
  }, [invoices, queryText, paymentFilter]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'customer':
          aVal = (a.customerName || '').toLowerCase();
          bVal = (b.customerName || '').toLowerCase();
          break;
        case 'total':
          aVal = a.total || 0;
          bVal = b.total || 0;
          break;
        case 'status':
          aVal = a.paymentStatus || 'unpaid';
          bVal = b.paymentStatus || 'unpaid';
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
  }, [queryText, paymentFilter, itemsPerPage]);

  async function handleDelete(id: string, customerName: string) {
    if (!confirm(`Are you sure you want to delete invoice for ${customerName}?`)) return;
    
    try {
      await deleteDoc(doc(db, 'invoices', id));
    } catch (err: any) {
      safeConsoleError('Delete invoice error', err);
      alert('Error deleting invoice: ' + err.message);
    }
  }

  function handleEdit(invoice: any) {
    setEditingInvoice(invoice);
    setShowCreate(true);
  }

  function handleCloseModal() {
    setShowCreate(false);
    setEditingInvoice(null);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-gray-500">Manage customer invoices and payments</p>
        </div>
        <button className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700" onClick={() => setShowCreate(true)}>
          Create new invoice
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex gap-4 items-center">
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search customer, email, mobile or invoice#"
            className="border px-3 py-2 rounded flex-1"
          />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        {loading ? <div className="p-6">Loading…</div> : (
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100" 
                  onClick={() => handleSort('customer')}
                >
                  <div className="flex items-center">
                    Customer <SortIcon field="customer" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100" 
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center">
                    Total <SortIcon field="total" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100" 
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Payment Status <SortIcon field="status" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm text-gray-600 cursor-pointer hover:bg-gray-100" 
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Created At <SortIcon field="date" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No invoices found</td></tr>
              )}
              {paginated.map(inv => (
                <tr key={inv.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{inv.customerName}</div>
                    <div className="text-xs text-gray-500">{inv.invoiceNumber}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">AED {(inv.total || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                      inv.paymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(inv.paymentStatus || 'unpaid').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(inv.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="text-sm text-green-600 hover:underline"
                        onClick={() => window.location.href = `/admin/invoice/${inv.id}`}
                      >
                        View
                      </button>
                      <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => handleEdit(inv)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => handleDelete(inv.id, inv.customerName)}
                      >
                        Delete
                      </button>
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
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} invoices
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={handleCloseModal} />
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full z-10 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingInvoice ? 'Edit Invoice' : 'Create Invoice'}</h3>
              <button className="text-gray-500" onClick={handleCloseModal}>Close</button>
            </div>
            <InvoiceForm 
              invoice={editingInvoice} 
              onCreated={handleCloseModal} 
              onCancel={handleCloseModal} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
