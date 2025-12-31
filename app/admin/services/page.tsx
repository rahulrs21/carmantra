"use client";

import { useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { safeConsoleError } from '@/lib/safeConsole';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ModuleAccess, PermissionGate, ModuleAccessComponent } from '@/components/PermissionGate';

interface Service {
  id: string;
  jobCardNo: string;
  category: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  customerType?: 'b2b' | 'b2c';
  mobileNo: string;
  email: string;
  contactPhone?: string;
  contactEmail?: string;
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
  const [scheduledRange, setScheduledRange] = useState<DateRange | undefined>(undefined);
  const [tempScheduledRange, setTempScheduledRange] = useState<DateRange | undefined>(undefined);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortField, setSortField] = useState<'jobCardNo' | 'category' | 'customerName' | 'status' | 'scheduledDate' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCount, setDeletingCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

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

    if (scheduledRange?.from && scheduledRange?.to) {
      const start = startOfDay(scheduledRange.from);
      const end = endOfDay(scheduledRange.to);
      result = result.filter((s) => {
        const d = toDate(s.scheduledDate as any);
        if (!d) return false;
        return d >= start && d <= end;
      });
    }

    return result;
  }, [services, searchQuery, statusFilter, categoryFilter, scheduledRange]);

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
  }, [searchQuery, statusFilter, categoryFilter, scheduledRange, itemsPerPage]);

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [services]);

  const statuses = useMemo(() => {
    const stats = new Set(services.map(s => s.status).filter(Boolean));
    return Array.from(stats).sort();
  }, [services]);

  async function handleDelete(id: string) {
    try {
      await deleteDoc(doc(db, 'bookedServices', id));
      setDeleteStatus('Service booking deleted successfully!');
      
      // Auto-hide status message after 5 seconds
      setTimeout(() => setDeleteStatus(null), 5000);
    } catch (err: any) {
      safeConsoleError('Delete booking error', err);
      setDeleteStatus(`Error deleting booking: ${err.message}`);
      setTimeout(() => setDeleteStatus(null), 5000);
    }
  }

  async function handleBatchDelete() {
    const idsToDelete = Array.from(selectedIds);
    setDeletingCount(idsToDelete.length);
    
    try {
      await Promise.all(
        idsToDelete.map(id => deleteDoc(doc(db, 'bookedServices', id)))
      );
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      setConfirmDelete(false);
      setDeleteStatus(`Successfully deleted ${idsToDelete.length} booking${idsToDelete.length !== 1 ? 's' : ''}!`);
      
      // Auto-hide status message after 5 seconds
      setTimeout(() => setDeleteStatus(null), 5000);
    } catch (err: any) {
      safeConsoleError('Batch delete error', err);
      setDeleteStatus(`Error deleting bookings: ${err.message}`);
      setTimeout(() => setDeleteStatus(null), 5000);
    } finally {
      setDeletingCount(0);
    }
  }

  function toggleSelectId(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map(s => s.id)));
    }
  }

  function confirmAndDelete(service: Service) {
    const name = `${service.firstName || ''} ${service.lastName || ''}`.trim();
    const label = service.jobCardNo || service.numberPlate || 'this booking';
    const message = `Delete ${label}${name ? ` for ${name}` : ''}? This action cannot be undone.`;
    if (!confirm(message)) return;
    handleDelete(service.id);
  }

  function handleViewDetails(id: string) {
    window.open(`/admin/book-service/${id}`, '_blank');
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
    <ModuleAccessComponent module={ModuleAccess.SERVICES}>
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold break-words">Services History</h1>
          <p className="text-sm text-gray-500 mt-1">All service bookings and history from Book Service module</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto sm:justify-end">
          {selectedIds.size > 0 && (
            <PermissionGate module="services" action="delete">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors w-full sm:w-auto"
              >
                Delete {selectedIds.size} Selected
              </button>
            </PermissionGate>
          )}
          <PermissionGate module="services" action="create">
            <Button variant="outline" onClick={downloadCSV} disabled={loading || sorted.length === 0} className="w-full sm:w-auto">
              Export CSV
            </Button>
          </PermissionGate>
          <PermissionGate module="services" action="create">
            <Button className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto" onClick={() => router.push('/admin/book-service')}>
              + New Booking
            </Button>
          </PermissionGate>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      {deleteStatus && (
        <div className={`p-4 rounded ${deleteStatus.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {deleteStatus}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between md:hidden">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-100">Filters</div>
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded hover:bg-gray-50"
            onClick={() => setShowMobileFilters((v) => !v)}
          >
            <span className="text-gray-500">{showMobileFilters ? 'Hide' : 'Show'}</span>
            <span className="text-gray-400">⋮</span>
          </button>
        </div>

        {/* Desktop filters */}
        <div className="hidden md:grid grid-cols-5 gap-3 items-center">
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="col-span-1 md:col-span-2 h-11"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm h-11 dark:bg-gray-800"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm h-11 dark:bg-gray-800"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex flex-col gap-1">
            <Popover
              open={isDatePopoverOpen}
              onOpenChange={(open) => {
                setIsDatePopoverOpen(open);
                if (open) {
                  setTempScheduledRange(scheduledRange);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between h-11">
                  <span className="text-sm">
                    {scheduledRange?.from && scheduledRange?.to
                      ? `${scheduledRange.from.toLocaleDateString()} — ${scheduledRange.to.toLocaleDateString()}`
                      : 'Date Filter'}
                  </span>
                  <span className="text-xs text-gray-500">Change</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="flex flex-col gap-3">
                  <Calendar
                    mode="range"
                    selected={tempScheduledRange}
                    onSelect={(range) => setTempScheduledRange(range || undefined)}

                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScheduledRange(undefined);
                        setTempScheduledRange(undefined);
                        setIsDatePopoverOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (tempScheduledRange?.from && tempScheduledRange?.to) {
                          setScheduledRange({
                            from: tempScheduledRange.from,
                            to: tempScheduledRange.to,
                          });
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

        {/* Mobile filters (collapsible) */}
        {showMobileFilters && (
          <div className="md:hidden grid grid-cols-1 gap-3">
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm h-11 dark:bg-gray-800"
            >
              <option value="all">All Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm h-11 dark:bg-gray-800"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex flex-col gap-1">
              <Popover
                open={isDatePopoverOpen}
                onOpenChange={(open) => {
                  setIsDatePopoverOpen(open);
                  if (open) {
                    setTempScheduledRange(scheduledRange);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between h-11">
                    <span className="text-sm">
                      {scheduledRange?.from && scheduledRange?.to
                        ? `${scheduledRange.from.toLocaleDateString()} — ${scheduledRange.to.toLocaleDateString()}`
                        : 'Date Filter'}
                    </span>
                    <span className="text-xs text-gray-500">Change</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="flex flex-col gap-3">
                    <Calendar
                      mode="range"
                      selected={tempScheduledRange}
                      onSelect={(range) => setTempScheduledRange(range || undefined)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScheduledRange(undefined);
                          setTempScheduledRange(undefined);
                          setIsDatePopoverOpen(false);
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (tempScheduledRange?.from && tempScheduledRange?.to) {
                            setScheduledRange({
                              from: tempScheduledRange.from,
                              to: tempScheduledRange.to,
                            });
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

      {/* Services Table */}
      <div className="bg-white rounded shadow">
        {loading ? (
          <div className="p-6">Loading…</div>
        ) : (
          <div>
            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {paginated.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No service bookings found</div>
              )}
              {paginated.map((service) => (
                <div key={service.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(service.id)}
                      onChange={() => toggleSelectId(service.id)}
                      className="mt-1 rounded border-gray-300 cursor-pointer flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-500">Job Card</div>
                      <div className="font-semibold text-blue-600 break-words">{service.jobCardNo}</div>
                      <div className="text-sm font-medium mt-1 break-words flex items-center gap-2 dark:text-gray-800">
                        {service.firstName || service.lastName ? (
                          <>
                            {service.firstName} {service.lastName}
                          </>
                        ) : service.companyName ? (
                          <>{service.companyName}</>
                        ) : (
                          <span className="text-gray-400">No Name</span>
                        )}
                        {/* {service.customerType && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${service.customerType === 'b2b' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
                            {service.customerType.toUpperCase()}
                          </span>
                        )} */}
                      </div>
                      <div className="text-xs text-gray-500 break-words">{service.customerType === 'b2b' ? (service.contactPhone || service.mobileNo) : service.mobileNo}</div>
                      <div className="text-xs text-gray-400 break-all">{service.customerType === 'b2b' ? (service.contactEmail || service.email) : service.email}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    {service.category && (
                      <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">{service.category}</span>
                    )}
                    <span className="px-2 py-1 rounded bg-gray-50 text-gray-700">
                      {service.vehicleBrand} {service.modelName}
                    </span>
                    {service.numberPlate && (
                      <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">{service.numberPlate}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <div className="text-gray-500">Scheduled</div>
                      <div className="font-medium">{formatDateTime(service.scheduledDate)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Created</div>
                      <div className="font-medium">{formatDateTime(service.createdAt)}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => handleViewDetails(service.id)}
                    >
                      View
                    </button>
                    <PermissionGate module="services" action="delete">
                      <button
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => confirmAndDelete(service)}
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
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-sm text-gray-600 w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === paginated.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </th>
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
                      <td className="px-4 py-3 w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(service.id)}
                          onChange={() => toggleSelectId(service.id)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-blue-600">{service.jobCardNo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium flex items-center gap-2 dark:text-gray-800">
                          {service.firstName || service.lastName ? (
                            <>
                              {service.firstName} {service.lastName}
                            </>
                          ) : service.companyName ? (
                            <>{service.companyName}</>
                          ) : (
                            <span className="text-gray-400">No Name</span>
                          )}
                          {/* {service.customerType && (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${service.customerType === 'b2b' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
                              {service.customerType.toUpperCase()}
                            </span>
                          )} */}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{service.customerType === 'b2b' ? (service.contactPhone || service.mobileNo) : service.mobileNo}</div>
                        <div className="text-xs text-gray-400">{service.customerType === 'b2b' ? (service.contactEmail || service.email) : service.email}</div>
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
                          <PermissionGate module="services" action="delete">
                            <button
                              className="text-sm text-red-600 hover:underline"
                              onClick={() => confirmAndDelete(service)}
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
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && sorted.length > 0 && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
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
            
            <div className="flex flex-wrap items-center gap-2">
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

      {/* Safe Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full z-10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-10V7a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete Bookings</h3>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-red-800">
                <strong>{selectedIds.size}</strong> service booking{selectedIds.size !== 1 ? 's' : ''} will be permanently deleted. This action cannot be undone.
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="rounded border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-700 cursor-pointer">
                  I understand this action is permanent
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmDelete(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={deletingCount > 0 || !confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded font-medium transition-colors"
              >
                {deletingCount > 0 ? `Deleting ${deletingCount}...` : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModuleAccessComponent>
  );
}
