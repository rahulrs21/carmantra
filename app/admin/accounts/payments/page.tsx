"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PermissionGate, ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';
import { formatDateTime } from '@/lib/utils';
import { useAccounts } from '@/lib/accountsContext';
import { toDate, filterByDateRange } from '@/lib/accountsUtils';
import { invoicesService } from '@/lib/firestore/b2b-service';
import { ArrowUpDown } from 'lucide-react';

interface Payment {
  id: string;
  invoiceNumber: string;
  customerName: string;
  serviceCategory?: string;
  vehicleDetails?: string;
  paymentMethod: 'cash' | 'card' | 'online' | 'bank_transfer';
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentDate?: { seconds: number };
  createdAt?: { seconds: number };
  invoiceId?: string;
  isB2B?: boolean;
  companyId?: string;
}

export default function PaymentHistoryPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [b2bPayments, setB2BPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<any>(undefined);
  
  // Independent date filter for this page
  const [rangeType, setRangeType] = useState('30d');
  const [customRange, setCustomRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  // Calculate date range based on rangeType
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (rangeType) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000) };
      }
      case '30d':
        return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'custom':
        return customRange.from && customRange.to 
          ? { start: customRange.from, end: new Date(customRange.to.getTime() + 24 * 60 * 60 * 1000) }
          : { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      default:
        return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };

  const getRangeLabel = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (rangeType) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case '30d':
        return 'Last 30 days';
      case 'custom':
        if (customRange.from && customRange.to) {
          return `${customRange.from.toLocaleDateString()} - ${customRange.to.toLocaleDateString()}`;
        }
        return 'Custom Range';
      default:
        return 'Last 30 days';
    }
  };

  const dateRange = getDateRange();

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    // Fetch from invoices collection (B2C)
    const invoiceQuery = query(collection(db, 'invoices'), where('paymentStatus', 'in', ['paid', 'partial', 'unpaid']));
    const unsub1 = onSnapshot(invoiceQuery, (snapshot) => {
      const invoiceData = snapshot.docs.map((doc) => ({
        id: doc.id,
        invoiceNumber: doc.data().invoiceNumber || '',
        customerName: doc.data().customerName || '',
        serviceCategory: doc.data().serviceCategory || '',
        vehicleDetails: `${doc.data().vehicleDetails?.brand || ''} ${doc.data().vehicleDetails?.model || ''}`.trim(),
        paymentMethod: doc.data().paymentTerms || doc.data().paymentMethod || 'cash',
        amountPaid: doc.data().paymentStatus === 'partial' ? (doc.data().partialPaidAmount || 0) : doc.data().total || 0,
        paymentStatus: doc.data().paymentStatus,
        paymentDate: doc.data().updatedAt || doc.data().createdAt,
        createdAt: doc.data().createdAt,
        invoiceId: doc.id,
        isB2B: false,
      })) as Payment[];
      
      // Always merge with B2B payments
      setPayments((prevPayments) => {
        const b2bOnly = prevPayments.filter((p) => p.isB2B);
        return [...invoiceData, ...b2bOnly];
      });
      setLoading(false);
    });
    unsubs.push(unsub1);

    // Fetch from B2B companies and services (one-time fetch)
    const fetchB2BData = async () => {
      try {
        console.log('🔍 Starting B2B invoice fetch...');
        const companiesRef = collection(db, 'companies');
        const companiesSnapshot = await getDocs(companiesRef);
        console.log(`📦 Found ${companiesSnapshot.docs.length} B2B companies`);

        const collectedB2BPayments: Payment[] = [];

        for (const companyDoc of companiesSnapshot.docs) {
          const company = companyDoc.data();
          console.log(`📋 Processing company: ${company.name} (ID: ${companyDoc.id})`);
          
          const servicesRef = collection(db, 'companies', companyDoc.id, 'services');
          
          try {
            const servicesSnapshot = await getDocs(servicesRef);
            console.log(`🔧 Found ${servicesSnapshot.docs.length} services for company: ${company.name}`);

            for (const serviceDoc of servicesSnapshot.docs) {
              const service = serviceDoc.data();
              console.log(`📄 Processing service: ${service.title} (ID: ${serviceDoc.id})`);
              
              try {
                // Use the invoicesService to fetch invoices
                console.log(`🔎 Fetching invoices for companyId: ${companyDoc.id}, serviceId: ${serviceDoc.id}`);
                const invoicesList = await invoicesService.fetchInvoices(companyDoc.id, serviceDoc.id);
                console.log(`💰 Found ${invoicesList?.length || 0} invoices for service: ${service.title}`);
                
                if (invoicesList && invoicesList.length > 0) {
                  console.log(`📋 Invoice List:`, invoicesList);
                  console.log(`📋 All invoice statuses:`, invoicesList.map((inv: any) => ({ invoiceNumber: inv.invoiceNumber, status: inv.status })));
                  
                  // Filter invoices: only include paid or sent (pending) status, exclude draft
                  const filteredInvoices = invoicesList.filter((inv: any) => {
                    const shouldInclude = inv.status === 'paid' || inv.status === 'sent' || inv.status === 'overdue';
                    console.log(`  Checking ${inv.invoiceNumber}: status="${inv.status}" -> include=${shouldInclude}`);
                    return shouldInclude;
                  });
                  console.log(`🔍 Filtered invoices: ${filteredInvoices.length} out of ${invoicesList.length} (excluded draft)`);
                  
                  filteredInvoices.forEach((invoice: any) => {
                    console.log(`✅ Adding invoice: ${invoice.invoiceNumber} (Status: ${invoice.status})`);
                    console.log(`📅 Invoice date object:`, invoice.invoiceDate, `Type:`, typeof invoice.invoiceDate);
                    
                    collectedB2BPayments.push({
                      id: `b2b-${companyDoc.id}-${serviceDoc.id}-${invoice.id}`,
                      invoiceNumber: invoice.invoiceNumber || `B2B-INV-${invoice.id}`,
                      customerName: company.name || 'B2B Customer',
                      serviceCategory: service.title || 'B2B Service',
                      vehicleDetails: '',
                      paymentMethod: invoice.paymentMethod || invoice.paymentTerms || 'bank_transfer',
                      amountPaid: invoice.totalAmount || invoice.total || invoice.subtotal || 0,
                      paymentStatus: (invoice.status === 'paid' ? 'paid' : invoice.status === 'overdue' ? 'partial' : 'partial') as 'paid' | 'partial' | 'unpaid',
                      paymentDate: invoice.invoiceDate || invoice.createdAt,
                      createdAt: invoice.createdAt,
                      invoiceId: invoice.id,
                      companyId: companyDoc.id,
                      isB2B: true,
                    });
                  });
                } else {
                  console.log(`⚠️ No invoices returned for service ${service.title}`);
                }
              } catch (error) {
                console.error(`❌ Error fetching invoices for service ${serviceDoc.id}:`, error);
              }
            }
          } catch (error) {
            console.log(`⚠️ Error fetching services for company ${companyDoc.id}:`, error);
          }
        }

        console.log(`✨ Total B2B payments collected: ${collectedB2BPayments.length}`);
        
        // Update B2B payments and merge with current B2C payments
        setB2BPayments(collectedB2BPayments);
        setPayments((prevPayments) => {
          const b2cOnly = prevPayments.filter((p) => !p.isB2B);
          const result = [...b2cOnly, ...collectedB2BPayments];
          console.log(`📊 Total payments after merge: ${result.length}`);
          return result;
        });
      } catch (error) {
        console.error('❌ B2B data fetch error:', error);
      }
    };

    // Fetch B2B data once on mount
    fetchB2BData();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  const filtered = useMemo(() => {
    let result = payments;
    
    console.log(`📊 Filtering payments. Total: ${result.length}, B2B: ${result.filter(p => p.isB2B).length}, B2C: ${result.filter(p => !p.isB2B).length}`);

    // Filter by date range
    result = filterByDateRange(result, 'paymentDate', dateRange.start, dateRange.end);
    console.log(`📅 After date filter (${getRangeLabel()}): ${result.length} payments`);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.invoiceNumber.toLowerCase().includes(query) ||
          p.customerName.toLowerCase().includes(query) ||
          p.vehicleDetails?.toLowerCase().includes(query)
      );
      console.log(`🔍 After search filter: ${result.length} payments`);
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.paymentStatus === statusFilter);
      console.log(`🏷️ After status filter: ${result.length} payments`);
    }

    if (methodFilter !== 'all') {
      result = result.filter((p) => p.paymentMethod === methodFilter);
      console.log(`💳 After method filter: ${result.length} payments`);
    }

    console.log(`✅ Final filtered result: ${result.length} payments`);
    
    // Sort by date
    result = result.sort((a, b) => {
      const dateA = a.paymentDate instanceof Date 
        ? a.paymentDate 
        : (a.paymentDate?.seconds ? new Date(a.paymentDate.seconds * 1000) : new Date());
      const dateB = b.paymentDate instanceof Date 
        ? b.paymentDate 
        : (b.paymentDate?.seconds ? new Date(b.paymentDate.seconds * 1000) : new Date());
      
      return sortOrder === 'desc' 
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });
    
    return result;
  }, [payments, searchQuery, statusFilter, methodFilter, rangeType, customRange, sortOrder]);

  const totalAmount = filtered.reduce((sum, p) => sum + p.amountPaid, 0);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filtered.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const handleFilterChange = (callback: () => void) => {
    setCurrentPage(1);
    callback();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      online: 'Online',
      bank_transfer: 'Bank Transfer',
    };
    return methods[method] || method;
  };

  return (
    <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Payment History</h1>
            <p className="text-sm text-gray-500 mt-1">Track all invoice payments and transactions</p>
            <p className="text-xs text-gray-400 mt-1">Viewing: <span className="font-medium text-gray-600">{getRangeLabel()}</span></p>
          </div>
          <PermissionGate module="accounts" action="view">
            <Button variant="outline" onClick={() => alert('Export feature coming soon')}>
              📊 Export Report
            </Button>
          </PermissionGate>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-4 sticky top-20 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Filter by Date Range</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Currently viewing: <span className="font-medium text-gray-700 dark:text-gray-300">{getRangeLabel()}</span></p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="inline-flex rounded-md shadow-sm bg-gray-100 dark:bg-gray-800 items-center flex-shrink-0">
                <button 
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors rounded-l-md ${rangeType==='30d' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                  onClick={() => { setRangeType('30d'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); setCurrentPage(1); }}
                >
                  Last 30d
                </button>
                <button 
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 ${rangeType==='yesterday' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                  onClick={() => { setRangeType('yesterday'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); setCurrentPage(1); }}
                >
                  Yesterday
                </button>
                <button 
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 ${rangeType==='today' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                  onClick={() => { setRangeType('today'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); setCurrentPage(1); }}
                >
                  Today
                </button>
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button 
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors border-l dark:border-gray-700 rounded-r-md ${rangeType==='custom' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                      onClick={() => setIsPopoverOpen(true)}
                    >
                      Custom
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto">
                    <div className="flex flex-col gap-2">
                      <Calendar
                        mode="range"
                        selected={selectedRange}
                        onSelect={(r: any) => {
                          setSelectedRange(r);
                          if (r?.from && r?.to) {
                            setCustomRange({ from: r.from, to: r.to });
                            setRangeType('custom');
                          } else if (r instanceof Date) {
                            setCustomRange({ from: r, to: r });
                            setRangeType('custom');
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setSelectedRange(undefined); setCustomRange({ from: null, to: null }); setIsPopoverOpen(false); }}
                        >
                          Clear
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            if (!selectedRange) return setIsPopoverOpen(false);
                            let from: Date | null = null;
                            let to: Date | null = null;
                            if (selectedRange.from || selectedRange.to) {
                              from = selectedRange.from || selectedRange.to || null;
                              to = selectedRange.to || selectedRange.from || null;
                            } else if (selectedRange instanceof Date) {
                              from = selectedRange;
                              to = selectedRange;
                            }
                            if (from && to) {
                              setCustomRange({ from, to });
                              setRangeType('custom');
                            }
                            setIsPopoverOpen(false);
                            setCurrentPage(1);
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
          </div>
        </div>



        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search invoice, customer, or vehicle..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
              className="h-10"
            />
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(() => setStatusFilter(e.target.value))}
              className="border rounded px-3 py-2 text-sm h-10 dark:bg-gray-800"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => handleFilterChange(() => setMethodFilter(e.target.value))}
              className="border rounded px-3 py-2 text-sm h-10 dark:bg-gray-800"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Records</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{filtered.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 font-medium">Total Amount</div>
            <div className="text-2xl font-bold text-green-900 mt-1">AED {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Paid Records</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">{filtered.filter((p) => p.paymentStatus === 'paid').length}</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No payments found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Invoice</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Customer</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Service</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Method</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      >
                        Date
                        <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'} />
                      </button>
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">
                        <div className="flex items-center gap-2">
                          {payment.invoiceNumber}
                          {payment.isB2B && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                              B2B
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{payment.customerName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{payment.serviceCategory}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{getMethodLabel(payment.paymentMethod)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-right text-gray-900">AED {payment.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payment.paymentStatus)}`}>
                          {payment.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(payment.paymentDate)}</td>
                      <td className="px-6 py-4 text-sm">
                        <PermissionGate module="accounts" action="view">
                          <button
                            onClick={() => {
                              if (payment.isB2B && payment.companyId) {
                                window.open(`/admin/b2b-booking/companies/${payment.companyId}#invoiceList`, '_blank');
                              } else {
                                window.open(`/admin/invoice/${payment.invoiceId}`, '_blank');
                              }
                            }}
                            className="text-blue-600 hover:underline"
                          >
                            View Invoice
                          </button>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length} payments
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded px-3 py-2 text-sm h-10 dark:bg-gray-800"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                ← Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    const diff = Math.abs(page - currentPage);
                    return diff === 0 || diff === 1 || page === 1 || page === totalPages;
                  })
                  .map((page, idx, arr) => (
                    <div key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded text-sm font-medium ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </ModuleAccessComponent>
  );
}
