"use client";

import { useEffect, useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import InvoiceForm from '@/components/admin/InvoiceForm';
import { formatDateTime } from '@/lib/utils';
import { ModuleAccess, PermissionGate } from '@/components/PermissionGate';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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

  function toDate(ts?: { seconds?: number } | { toDate?: () => Date } | null) {
    if (!ts) return null;
    if ('toDate' in ts && typeof ts.toDate === 'function') return ts.toDate();
    if (typeof (ts as any).seconds === 'number') return new Date((ts as any).seconds * 1000);
    return null;
  }

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function endOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  const filtered = useMemo(() => {
    let result = invoices;
    
    if (paymentFilter !== 'all') {
      result = result.filter(inv => inv.paymentStatus === paymentFilter);
    }
    
    if (queryText) {
      const t = queryText.toLowerCase();
      result = result.filter(inv => (
        (inv.customerName || '').toLowerCase().includes(t) ||
        (inv.customerEmail || '').toLowerCase().includes(t) ||
        (inv.customerMobile || '').toLowerCase().includes(t) ||
        (inv.invoiceNumber || '').toLowerCase().includes(t)
      ));
    }

    if (dateRange?.from && dateRange?.to) {
      const start = startOfDay(dateRange.from);
      const end = endOfDay(dateRange.to);
      result = result.filter((inv) => {
        const d = toDate(inv.createdAt as any);
        if (!d) return false;
        return d >= start && d <= end;
      });
    }
    
    return result;
  }, [invoices, queryText, paymentFilter, dateRange]);

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
  }, [queryText, paymentFilter, itemsPerPage, dateRange]);

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
    <ModuleAccess module="invoices">
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-gray-500">Manage customer invoices and payments</p>
        </div>
        <PermissionGate module="invoices" action="create">
          <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowCreate(true)}>
            Create new invoice
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between md:hidden">
          <div className="text-sm font-medium text-gray-700">Filters</div>
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded hover:bg-gray-50"
            onClick={() => setShowMobileFilters((v) => !v)}
          >
            <span className="text-gray-600">{showMobileFilters ? 'Hide' : 'Show'}</span>
            <span className="text-gray-400">⋮</span>
          </button>
        </div>

        {/* Desktop filters */}
        <div className="hidden md:grid grid-cols-3 gap-3 items-center">
          <Input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search customer, email, mobile or invoice#"
            className="h-11"
          />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm h-11"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <div className="flex flex-col gap-1">
            <Popover
              open={isDatePopoverOpen}
              onOpenChange={(open) => {
                setIsDatePopoverOpen(open);
                if (open) setTempDateRange(dateRange);
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between h-11">
                  <span className="text-sm">
                    {dateRange?.from && dateRange?.to
                      ? `${dateRange.from.toLocaleDateString()} — ${dateRange.to.toLocaleDateString()}`
                      : 'Date Filter'}
                  </span>
                  <span className="text-xs text-gray-500">Change</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="flex flex-col gap-3">
                  <Calendar
                    mode="range"
                    selected={tempDateRange}
                    onSelect={(range) => setTempDateRange(range || undefined)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateRange(undefined);
                        setTempDateRange(undefined);
                        setIsDatePopoverOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (tempDateRange?.from && tempDateRange?.to) {
                          setDateRange({ from: tempDateRange.from, to: tempDateRange.to });
                        }
                        setIsDatePopoverOpen(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Mobile filters */}
        {showMobileFilters && (
          <div className="md:hidden grid grid-cols-1 gap-3">
            <Input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search customer, email, mobile or invoice#"
              className="h-11"
            />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm h-11"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <div className="flex flex-col gap-1">
              <Popover
                open={isDatePopoverOpen}
                onOpenChange={(open) => {
                  setIsDatePopoverOpen(open);
                  if (open) setTempDateRange(dateRange);
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between h-11">
                    <span className="text-sm">
                      {dateRange?.from && dateRange?.to
                        ? `${dateRange.from.toLocaleDateString()} — ${dateRange.to.toLocaleDateString()}`
                        : 'Date Filter'}
                    </span>
                    <span className="text-xs text-gray-500">Change</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="flex flex-col gap-3">
                    <Calendar
                      mode="range"
                      selected={tempDateRange}
                      onSelect={(range) => setTempDateRange(range || undefined)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDateRange(undefined);
                          setTempDateRange(undefined);
                          setIsDatePopoverOpen(false);
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (tempDateRange?.from && tempDateRange?.to) {
                            setDateRange({ from: tempDateRange.from, to: tempDateRange.to });
                          }
                          setIsDatePopoverOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </Card>

      <div className="bg-white rounded shadow">
        {loading ? <div className="p-6">Loading…</div> : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {paginated.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No invoices found</div>
              )}
              {paginated.map((inv) => (
                <div key={inv.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Invoice</div>
                      <div className="font-semibold text-blue-600 break-words">{inv.invoiceNumber || '—'}</div>
                      <div className="text-sm font-medium mt-1 break-words">{inv.customerName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 break-words">{inv.customerEmail}</div>
                      <div className="text-xs text-gray-400 break-words">{inv.customerMobile}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                      inv.paymentStatus === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(inv.paymentStatus || 'unpaid').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <div className="text-gray-500">Total</div>
                      <div className="font-medium">AED {(inv.total || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Created</div>
                      <div className="font-medium">{formatDateTime(inv.createdAt)}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      className="text-sm text-green-600 hover:underline"
                      onClick={() => window.location.href = `/admin/invoice/${inv.id}`}
                    >
                      View
                    </button>
                    <PermissionGate module="invoices" action="edit">
                      <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => handleEdit(inv)}
                      >
                        Edit
                      </button>
                    </PermissionGate>
                    <PermissionGate module="invoices" action="delete">
                      <button
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => handleDelete(inv.id, inv.customerName)}
                      >
                        Delete
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-auto">
              <table className="w-full min-w-[900px]">
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
                          <PermissionGate module="invoices" action="edit">
                            <button
                              className="text-sm text-blue-600 hover:underline"
                              onClick={() => handleEdit(inv)}
                            >
                              Edit
                            </button>
                          </PermissionGate>
                          <PermissionGate module="invoices" action="delete">
                            <button
                              className="text-sm text-red-600 hover:underline"
                              onClick={() => handleDelete(inv.id, inv.customerName)}
                            >
                              Delete
                            </button>
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
      {!loading && sorted.length > 0 && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-600">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, sorted.length)} to {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} invoices
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
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

              <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
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
                      className={`px-3 py-1 border rounded text-sm hover:bg-gray-50 ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : ''
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
    </ModuleAccess>
  );
}
