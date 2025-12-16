"use client";

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import QuotationForm from '@/components/admin/QuotationForm';
import { formatDateTime } from '@/lib/utils';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<any | null>(null);
  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
    const q = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setQuotations(snap.docs.map(d => ({ ...(d.data() as any), id: d.id })));
      setLoading(false);
    }, err => {
      safeConsoleError('Quotations snapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let result = quotations;
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(qt => qt.status === statusFilter);
    }
    
    // Filter by search text
    if (queryText) {
      const t = queryText.toLowerCase();
      result = result.filter(qt => (
        (qt.customerName || '').toLowerCase().includes(t) ||
        (qt.customerEmail || '').toLowerCase().includes(t) ||
        (qt.customerMobile || '').toLowerCase().includes(t) ||
        (qt.quotationNumber || '').toLowerCase().includes(t)
      ));
    }
    
    return result;
  }, [quotations, queryText, statusFilter]);

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
          aVal = a.status || 'pending';
          bVal = b.status || 'pending';
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
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  }, [sorted, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [queryText, statusFilter]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this quotation?')) return;
    
    try {
      await deleteDoc(doc(db, 'quotations', id));
    } catch (err: any) {
      safeConsoleError('Delete quotation error', err);
      alert('Error deleting quotation: ' + err.message);
    }
  }

  function handleEdit(quotation: any) {
    setEditingQuotation(quotation);
    setShowCreate(true);
  }

  function handleCloseModal() {
    setShowCreate(false);
    setEditingQuotation(null);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotations</h1>
          <p className="text-sm text-gray-500">Manage customer quotations and estimates</p>
        </div>
        <button className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700" onClick={() => setShowCreate(true)}>
          Create new quotation
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex gap-4 items-center">
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search customer, email, mobile or quotation#"
            className="border px-3 py-2 rounded flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
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
                    Status <SortIcon field="status" />
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
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No quotations found</td></tr>
              )}
              {paginated.map(qt => (
                <tr key={qt.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{qt.customerName}</div>
                    <div className="text-xs text-gray-500">{qt.quotationNumber}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">AED {(qt.total || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                      qt.status === 'accepted' 
                        ? 'bg-green-100 text-green-800' 
                        : qt.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {(qt.status || 'pending').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(qt.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="text-sm text-green-600 hover:underline"
                        onClick={() => window.location.href = `/admin/quotation/${qt.id}`}
                      >
                        View
                      </button>
                      <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => handleEdit(qt)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => handleDelete(qt.id)}
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

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, sorted.length)} to {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} quotations
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Items per page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border px-2 py-1 rounded text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else {
                    pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded text-sm hover:bg-gray-50 ${
                        currentPage === pageNum ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={handleCloseModal} />
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingQuotation ? 'Edit Quotation' : 'Create Quotation'}
              </h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={handleCloseModal}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <QuotationForm 
                quotation={editingQuotation} 
                onCreated={handleCloseModal} 
                onCancel={handleCloseModal} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
