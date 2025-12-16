"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { safeConsoleError } from '@/lib/safeConsole';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Service {
  id: string;
  jobCardNo: string;
  category: string;
  firstName: string;
  lastName: string;
  mobileNo: string;
  email: string;
  vehicleType: string;
  vehicleBrand: string;
  modelName: string;
  numberPlate: string;
  status: string;
  scheduledDate?: { seconds: number } | { toDate: () => Date };
  createdAt?: { seconds: number } | { toDate: () => Date };
  updatedAt?: { seconds: number } | { toDate: () => Date };
  preInspection?: {
    message?: string;
    images?: string[];
    videos?: string[];
  };
}

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'jobCardNo' | 'category' | 'customerName' | 'status' | 'scheduledDate' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    const q = query(collection(db, 'bookedServices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...(doc.data() as any),
          id: doc.id
        })) as Service[];
        setServices(data);
        setLoading(false);
      },
      (err) => {
        safeConsoleError('Services snapshot error', err);
        setError(err?.message || 'Unable to load services');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    return sortDirection === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  const filtered = useMemo(() => {
    let result = services;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.jobCardNo || '').toLowerCase().includes(query) ||
        (s.firstName || '').toLowerCase().includes(query) ||
        (s.lastName || '').toLowerCase().includes(query) ||
        (s.mobileNo || '').toLowerCase().includes(query) ||
        (s.email || '').toLowerCase().includes(query) ||
        (s.category || '').toLowerCase().includes(query) ||
        (s.numberPlate || '').toLowerCase().includes(query) ||
        (s.vehicleBrand || '').toLowerCase().includes(query) ||
        (s.modelName || '').toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(s => s.category === categoryFilter);
    }

    return result;
  }, [services, searchQuery, statusFilter, categoryFilter]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'jobCardNo':
          aVal = (a.jobCardNo || '').toLowerCase();
          bVal = (b.jobCardNo || '').toLowerCase();
          break;
        case 'category':
          aVal = (a.category || '').toLowerCase();
          bVal = (b.category || '').toLowerCase();
          break;
        case 'customerName':
          aVal = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
          bVal = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'scheduledDate':
          aVal = (a.scheduledDate as any)?.seconds || 0;
          bVal = (b.scheduledDate as any)?.seconds || 0;
          break;
        case 'createdAt':
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
  }, [searchQuery, statusFilter, categoryFilter, itemsPerPage]);

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [services]);

  const statuses = useMemo(() => {
    const stats = new Set(services.map(s => s.status).filter(Boolean));
    return Array.from(stats).sort();
  }, [services]);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      await deleteDoc(doc(db, 'bookedServices', id));
    } catch (err: any) {
      safeConsoleError('Delete booking error', err);
      alert('Error deleting booking: ' + err.message);
    }
  }

  function handleViewDetails(id: string) {
    router.push(`/admin/book-service/${id}`);
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }

  function downloadCSV() {
    const headers = ['Job Card No', 'Customer Name', 'Mobile', 'Email', 'Category', 'Vehicle', 'Number Plate', 'Status', 'Scheduled Date', 'Created At'];
    const rows = sorted.map(s => [
      s.jobCardNo || '',
      `${s.firstName || ''} ${s.lastName || ''}`.trim(),
      s.mobileNo || '',
      s.email || '',
      s.category || '',
      `${s.vehicleBrand || ''} ${s.modelName || ''}`.trim(),
      s.numberPlate || '',
      s.status || '',
      formatDateTime(s.scheduledDate),
      formatDateTime(s.createdAt)
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-bookings-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services History</h1>
          <p className="text-sm text-gray-500 mt-1">All service bookings and history from Book Service module</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadCSV} disabled={loading || sorted.length === 0}>
            Export CSV
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => router.push('/admin/book-service')}>
            + New Booking
          </Button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="col-span-1 md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Services Table */}
      <div className="bg-white rounded shadow overflow-auto">
        {loading ? (
          <div className="p-6">Loading…</div>
        ) : (
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('jobCardNo')}>
                  <div className="flex items-center">
                    Job Card No
                    <SortIcon field="jobCardNo" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('customerName')}>
                  <div className="flex items-center">
                    Customer
                    <SortIcon field="customerName" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('category')}>
                  <div className="flex items-center">
                    Service Type
                    <SortIcon field="category" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                  <div className="flex items-center">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('scheduledDate')}>
                  <div className="flex items-center">
                    Scheduled
                    <SortIcon field="scheduledDate" />
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center">
                    Created
                    <SortIcon field="createdAt" />
                  </div>
                </th>
                <th className="px-4 py-3 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-gray-500">No service bookings found</td></tr>
              )}
              {paginated.map(service => (
                <tr key={service.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-blue-600">{service.jobCardNo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{service.firstName} {service.lastName}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{service.mobileNo}</div>
                    <div className="text-xs text-gray-400">{service.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      {service.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="font-medium">{service.vehicleBrand} {service.modelName}</div>
                    <div className="text-xs text-gray-400">{service.numberPlate}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDateTime(service.scheduledDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDateTime(service.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => handleViewDetails(service.id)}
                      >
                        View
                      </button>
                      <button
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => handleDelete(service.id)}
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
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} bookings
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
    </div>
  );
}
