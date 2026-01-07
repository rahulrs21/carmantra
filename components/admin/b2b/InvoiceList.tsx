'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useDeleteInvoice } from '@/hooks/useB2B';
import { Download, Edit, Trash2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { InvoiceForm } from '@/components/admin/b2b';
import { generateInvoicePDFBlob } from '@/lib/utils/pdf-generator';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';

interface InvoiceListProps {
  companyId: string;
  serviceId: string;
  invoices: any[];
  isLoading: boolean;
  onRefresh: () => void;
  newInvoiceId?: string;
}

const STATUS_BADGE_CONFIG = {
  draft: { variant: 'outline' as const, color: 'text-gray-600' },
  sent: { variant: 'secondary' as const, color: 'text-blue-600' },
  paid: { variant: 'default' as const, color: 'text-green-600' },
  overdue: { variant: 'destructive' as const, color: 'text-red-600' },
  cancelled: { variant: 'secondary' as const, color: 'text-gray-600' },
};

// Utility function to format date as DD/MM/YYYY
const formatDateDDMMYYYY = (date: any) => {
  const d = date instanceof Date ? date : (date?.toDate?.() || new Date());
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to get date range based on filter type
const getDateRange = (filterType: string, customStartDate?: Date, customEndDate?: Date): { start: Date; end: Date } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let start = new Date(today);
  let end = new Date(today);
  end.setHours(23, 59, 59, 999);

  switch (filterType) {
    case 'today':
      break; // Already set to today
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      break;
    case '30days':
      start.setDate(start.getDate() - 30);
      break;
    case 'custom':
      if (customStartDate && customEndDate) {
        start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { start, end };
};

export function InvoiceList({
  companyId,
  serviceId,
  invoices,
  isLoading,
  onRefresh,
  newInvoiceId,
}: InvoiceListProps) {
  const deleteInvoice = useDeleteInvoice();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [newInvoiceIds, setNewInvoiceIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailSuccessOpen, setEmailSuccessOpen] = useState(false);
  const [emailSuccessData, setEmailSuccessData] = useState<{ email: string; invoiceNumber: string } | null>(null);
  const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | '30days' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Get newly created invoice ID from sessionStorage on mount
  useEffect(() => {
    const storedId = sessionStorage.getItem('newInvoiceId');
    if (storedId) {
      setNewInvoiceIds(new Set([storedId]));
      // Clear after reading
      sessionStorage.removeItem('newInvoiceId');
    }
  }, []);

  // Handle newly created invoice from prop
  useEffect(() => {
    if (newInvoiceId) {
      setNewInvoiceIds(new Set([newInvoiceId]));
    }
  }, [newInvoiceId]);

  // Auto-hide badge after 30 seconds
  useEffect(() => {
    if (newInvoiceIds.size === 0) return;

    const timer = setTimeout(() => {
      setNewInvoiceIds(new Set());
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [newInvoiceIds]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handleDelete = async (invoice: any) => {
    // Remove "new" badge on interaction
    setNewInvoiceIds((prev) => {
      const updated = new Set(prev);
      updated.delete(invoice.id);
      return updated;
    });
    
    setSelectedInvoice(invoice);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    try {
      // Use serviceId from invoice object if prop serviceId is empty
      const actualServiceId = serviceId || selectedInvoice.serviceId;
      await deleteInvoice.mutateAsync({
        companyId,
        serviceId: actualServiceId,
        invoiceId: selectedInvoice.id,
      });
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
      onRefresh();
      setDeleteDialogOpen(false);
      setSelectedInvoice(null);
      setSelectedInvoices(new Set());
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invoice',
        variant: 'destructive',
      });
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map((inv) => inv.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      for (const invoiceId of Array.from(selectedInvoices)) {
        const invoice = invoices.find((inv) => inv.id === invoiceId);
        if (!invoice) continue;
        
        const actualServiceId = serviceId || invoice.serviceId;
        await deleteInvoice.mutateAsync({
          companyId,
          serviceId: actualServiceId,
          invoiceId: invoice.id,
        });
      }
      toast({
        title: 'Success',
        description: `${selectedInvoices.size} invoice(s) deleted successfully`,
      });
      onRefresh();
      setDeleteDialogOpen(false);
      setSelectedInvoices(new Set());
    } catch (error) {
      console.error('Error deleting invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some invoices',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDownload = async (invoice: any) => {
    // Remove "new" badge on interaction
    setNewInvoiceIds((prev) => {
      const updated = new Set(prev);
      updated.delete(invoice.id);
      return updated;
    });

    try {
      // Fetch company data to get TRN and address
      let companyData: any = {};
      if (companyId) {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', companyId));
          if (companyDoc.exists()) {
            companyData = companyDoc.data();
          }
        } catch (err) {
          console.warn('Could not fetch company data:', err);
        }
      }

      const invoiceDate = invoice.invoiceDate instanceof Date
        ? invoice.invoiceDate
        : (invoice.invoiceDate as any).toDate?.() || new Date();

      const pdfDataUrl = await generateInvoicePDFBlob({
        invoiceNumber: invoice.invoiceNumber,
        date: invoiceDate,
        company: {
          name: invoice.companyName || companyData.name || 'N/A',
          phone: invoice.companyPhone || companyData.phone,
          email: invoice.companyEmail || companyData.email,
          trn: invoice.companyTRN || companyData.trn,
          address: invoice.companyAddress || companyData.address,
          city: invoice.companyCity || companyData.city,
          state: invoice.companyState || companyData.state,
          zipCode: invoice.companyZipCode || companyData.zipCode,
        },
        serviceTitle: invoice.serviceTitle || 'Service',
        vehicles: invoice.vehicles?.map((v: any) => {
          let vehicleServiceCost = 0;
          if (v.services && Array.isArray(v.services) && v.services.length > 0) {
            vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
          } else {
            vehicleServiceCost = v.serviceAmount || 0;
          }
          return {
            plate: v.plateNumber || 'N/A',
            brand: v.brand || 'N/A',
            model: v.model || 'N/A',
            year: v.year || 0,
            serviceAmount: vehicleServiceCost,
            service: v.serviceTitle || invoice.serviceTitle || 'Service',
            services: v.services || [],
            jobCardNo: v.jobCardNo || null, // Include jobCardNo from vehicle
            serviceDate: v.serviceDate || null, // Include service date
          };
        }) || [],
        referralTotal: invoice.referralTotal || 0,
        subtotal: invoice.subtotal || 0,
        grandTotal: invoice.totalAmount || 0,
        status: invoice.status || 'draft',
        amountStatus: invoice.amountStatus || 'pending',
        cancellationReason: invoice.cancellationReason,
        paymentMethod: invoice.paymentMethod,
        validityDate: invoice.validityDate,
        dueDate: invoice.dueDate,
        showReferralCommission: invoice.showReferralCommission,
        notes: invoice.notes,
      });

      setPdfDataUrl(pdfDataUrl);
      setPdfFileName(`Invoice_${invoice.invoiceNumber}.pdf`);
      setPdfPreviewOpen(true);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate invoice PDF',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = async (invoice: any) => {
    try {
      setSendingEmailId(invoice.id);

      // Remove "new" badge on interaction
      setNewInvoiceIds((prev) => {
        const updated = new Set(prev);
        updated.delete(invoice.id);
        return updated;
      });

      // Fetch company data to get email and details
      let companyData: any = {};
      if (companyId) {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', companyId));
          if (companyDoc.exists()) {
            companyData = companyDoc.data();
          }
        } catch (err) {
          console.warn('Could not fetch company data:', err);
        }
      }

      const companyEmail = invoice.companyEmail || companyData.email;
      const companyPhone = invoice.companyPhone || companyData.phone;
      const companyName = invoice.companyName || companyData.name;

      if (!companyEmail) {
        toast({
          title: 'Error',
          description: 'No email address found for this company',
          variant: 'destructive',
        });
        setSendingEmailId(null);
        return;
      }

      // Generate PDF for attachment
      let pdfAttachment = null;
      try {
        const invoiceDate = invoice.invoiceDate instanceof Date
          ? invoice.invoiceDate
          : (invoice.invoiceDate as any).toDate?.() || new Date();

        const pdfDataUrl = await generateInvoicePDFBlob({
          invoiceNumber: invoice.invoiceNumber,
          date: invoiceDate,
          company: {
            name: invoice.companyName || companyData.name || 'N/A',
            phone: invoice.companyPhone || companyData.phone,
            email: invoice.companyEmail || companyData.email,
            trn: invoice.companyTRN || companyData.trn,
            address: invoice.companyAddress || companyData.address,
            city: invoice.companyCity || companyData.city,
            state: invoice.companyState || companyData.state,
            zipCode: invoice.companyZipCode || companyData.zipCode,
          },
          serviceTitle: invoice.serviceTitle || 'Service',
          vehicles: invoice.vehicles?.map((v: any) => {
            let vehicleServiceCost = 0;
            if (v.services && Array.isArray(v.services) && v.services.length > 0) {
              vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
            } else {
              vehicleServiceCost = v.serviceAmount || 0;
            }
            return {
              plate: v.plateNumber || 'N/A',
              brand: v.brand || 'N/A',
              model: v.model || 'N/A',
              year: v.year || 0,
              serviceAmount: vehicleServiceCost,
              service: v.serviceTitle || invoice.serviceTitle || 'Service',
              services: v.services || [],
              jobCardNo: v.jobCardNo || null,
              serviceDate: v.serviceDate || null,
            };
          }) || [],
          referralTotal: invoice.referralTotal || 0,
          subtotal: invoice.subtotal || 0,
          grandTotal: invoice.totalAmount || 0,
          status: invoice.status || 'draft',
          amountStatus: invoice.amountStatus || 'pending',
          cancellationReason: invoice.cancellationReason,
          paymentMethod: invoice.paymentMethod,
          validityDate: invoice.validityDate,
          dueDate: invoice.dueDate,
          showReferralCommission: invoice.showReferralCommission,
          notes: invoice.notes,
        });

        // Convert data URL to base64 for attachment
        if (pdfDataUrl) {
          const base64Data = pdfDataUrl.split(',')[1] || pdfDataUrl;
          pdfAttachment = {
            name: `Invoice_${invoice.invoiceNumber}.pdf`,
            data: base64Data,
          };
        }
      } catch (pdfErr) {
        console.warn('Could not generate PDF attachment:', pdfErr);
        // Continue without PDF attachment
      }

      // Prepare vehicle data for email
      const vehicles = invoice.vehicles?.map((v: any) => {
        let vehicleServiceCost = 0;
        if (v.services && Array.isArray(v.services) && v.services.length > 0) {
          vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
        } else {
          vehicleServiceCost = v.serviceAmount || 0;
        }
        return {
          plate: v.plateNumber || 'N/A',
          brand: v.brand || 'N/A',
          model: v.model || 'N/A',
          year: v.year || 0,
          serviceAmount: vehicleServiceCost,
        };
      }) || [];

      // Prepare email payload
      const emailPayload: any = {
        emailType: 'job-completion',
        name: companyName || 'Valued Customer',
        email: companyEmail,
        phone: companyPhone,
        companyName: companyName,
        jobCardNo: invoice.vehicles?.[0]?.jobCardNo || 'N/A',
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.totalAmount || 0,
        paymentStatus: invoice.amountStatus || 'unpaid',
      };

      // Add attachment if PDF was generated
      if (pdfAttachment) {
        emailPayload.attachment = pdfAttachment;
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Show success modal
      setEmailSuccessData({
        email: companyEmail,
        invoiceNumber: invoice.invoiceNumber,
      });
      setEmailSuccessOpen(true);
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invoice email',
        variant: 'destructive',
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  // Sort and paginate invoices
  const dateRange = getDateRange(dateFilterType, customStartDate ? new Date(customStartDate) : undefined, customEndDate ? new Date(customEndDate) : undefined);
  
  const filteredInvoices = invoices.filter((invoice) => {
    const invoiceDate = invoice.invoiceDate instanceof Date ? invoice.invoiceDate : (invoice.invoiceDate as any).toDate?.() || new Date();
    return invoiceDate >= dateRange.start && invoiceDate <= dateRange.end;
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const dateA = a.invoiceDate instanceof Date ? a.invoiceDate : (a.invoiceDate as any).toDate?.() || new Date();
    const dateB = b.invoiceDate instanceof Date ? b.invoiceDate : (b.invoiceDate as any).toDate?.() || new Date();
    return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
  });

  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = sortedInvoices.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>All invoices for this service</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Date Filter Controls */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-600" />
                <span className="font-medium text-gray-700">Filter by Date:</span>
              </div>
              <Select value={dateFilterType} onValueChange={(val: any) => {
                setDateFilterType(val);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {dateFilterType === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Start Date"
                  />
                  <span className="text-gray-600">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="End Date"
                  />
                </div>
              )}

              <span className="text-sm text-gray-600 ml-auto">
                Showing {filteredInvoices.length} invoice(s)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {/* Bulk Delete Section */}
            {selectedInvoices.size > 0 && (
              <div className="flex gap-2 items-center bg-red-50 p-3 rounded-lg mb-4 border border-red-200">
                <span className="text-sm font-medium text-red-900">
                  {selectedInvoices.size} invoice(s) selected
                </span>
                <Button
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-1 bg-red-600 hover:bg-red-700 ml-auto"
                  disabled={isBulkDeleting}
                >
                  <Trash2 size={16} />
                  Delete Selected
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        invoices.length > 0 &&
                        selectedInvoices.size === invoices.length
                      }
                      onCheckedChange={() => handleSelectAll()}
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      Date
                      <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'} />
                    </button>
                  </TableHead>
                  <TableHead className="min-w-64">JobCardNo | Vehicles: Cost</TableHead>
                  <TableHead className="text-right">Referral Commission</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : sortedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No invoices created yet. Create a quotation and mark it as accepted to generate an invoice.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoices.has(invoice.id)}
                          onCheckedChange={() => handleSelectInvoice(invoice.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {invoice.invoiceNumber}
                          {newInvoiceIds.has(invoice.id) && (
                            <Badge className="bg-green-100 text-green-800 border border-green-300 animate-pulse">
                              new
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateDDMMYYYY(invoice.invoiceDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-1">
                          {invoice.vehicles && invoice.vehicles.length > 0 ? (
                            invoice.vehicles.map((v: any) => {
                              // Calculate vehicle service cost - prioritize services array, then serviceAmount
                              let vehicleServiceCost = 0;
                              if (v.services && Array.isArray(v.services) && v.services.length > 0) {
                                vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
                              } else {
                                vehicleServiceCost = v.serviceAmount || 0;
                              }
                              return (
                                <div key={v.plateNumber} className="text-sm">
                                  <div className="flex items-center gap-2">
                                    {v.jobCardNo && (
                                      <span className="font-mono font-semibold text-blue-600 text-xs" title={`Service Date: ${v.serviceDate ? new Date(v.serviceDate instanceof Date ? v.serviceDate : v.serviceDate?.toDate?.()).toLocaleDateString() : 'N/A'}`}>
                                        {v.jobCardNo} |
                                      </span>
                                    )}
                                    <span className="font-mono text-gray-600">{v.plateNumber}:</span>
                                    <span className="font-semibold ml-2">AED {vehicleServiceCost.toLocaleString('en-AE')}</span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </div>
                        {invoice.subtotal > 0 && (
                          <div className="text-sm font-bold mt-2 pt-2 border-t border-gray-200">
                            Subtotal: AED {invoice.subtotal.toLocaleString('en-AE')}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-semibold">
                        <div className="flex flex-col items-end gap-1">
                          <span>AED {invoice.referralTotal?.toLocaleString('en-AE') || '0.00'}</span>
                          {!invoice.showReferralCommission && (
                            <p className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                              ⚠️ Hidden in Invoice
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-semibold">
                        AED {invoice.totalAmount.toLocaleString('en-AE')}
                      </TableCell>
                      

                      

                      <TableCell>
                        <div className="relative flex flex-col gap-1">
                          <div className='absolute bottom-5 text-xs    w-full flex justify-end'>
                            {invoice.status === 'draft' && (
                              <span className="text-gray-600 ">Update status before sending email</span>
                            )}
                          </div>
                          
                          <Badge
                            variant={
                              STATUS_BADGE_CONFIG[invoice.status as keyof typeof STATUS_BADGE_CONFIG]
                                ?.variant || 'outline'
                            }
                          >
                            {invoice.status}
                          </Badge>
                          {invoice.amountStatus && (
                            <Badge variant="outline" className={invoice.amountStatus === 'paid' ? 'bg-green-50' : invoice.amountStatus === 'cancelled' ? 'bg-red-50' : 'bg-yellow-50'}>
                              <span className={invoice.amountStatus === 'paid' ? 'text-green-700' : invoice.amountStatus === 'cancelled' ? 'text-red-700' : 'text-yellow-700'}>
                                Amount: {invoice.amountStatus}
                              </span>
                            </Badge>
                          )}
                          {invoice.amountStatus === 'cancelled' && invoice.cancellationReason && (
                            <div className="text-xs text-red-600 max-w-48 line-clamp-2">
                              {invoice.cancellationReason}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <div className="relative inline-block group">
                            <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 hover:tool"
                            onClick={() => {
                              // Remove "new" badge on interaction
                              setNewInvoiceIds((prev) => {
                                const updated = new Set(prev);
                                updated.delete(invoice.id);
                                return updated;
                              });
                              setEditingInvoice(invoice);
                            }}
                          >
                            <Edit size={16} />
                          </Button>
                          <span
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
           whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white
           opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            Edit Invoice
                          </span>
                          </div>


                          <div className='relative inline-block group'>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              onClick={() => handleDownload(invoice)}
                            >
                              <Download size={16} />
                            </Button>
                            <span
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
           whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white
           opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            Download Invoice
                          </span>
                          </div>

                          <div className='relative inline-block group'>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-blue-600"
                              onClick={() => handleSendEmail(invoice)}
                              disabled={sendingEmailId === invoice.id || invoice.status === 'draft'}
                            >
                              <Mail size={16} />
                            </Button>
                            <span
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
           whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white
           opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            {sendingEmailId === invoice.id ? 'Sending...' : invoice.status === 'draft' ? 'Please update status before sending email' : 'Send Email'}
                          </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(invoice)}
                            disabled={deleteInvoice.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Items per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(parseInt(val))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} • Total: {sortedInvoices.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <InvoiceForm
          companyId={companyId}
          serviceId={serviceId}
          invoice={editingInvoice}
          isOpen={!!editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSuccess={() => {
            setEditingInvoice(null);
            onRefresh();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedInvoices.size > 1 ? 'Delete Invoices' : 'Delete Invoice'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedInvoices.size > 1
                ? `Are you sure you want to delete ${selectedInvoices.size} invoices? This action cannot be undone.`
                : 'Are you sure you want to delete this invoice? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedInvoices.size === 1 && selectedInvoice ? (
            <div className="bg-gray-50 p-3 rounded-lg my-2 space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-600">Invoice Number</p>
                <p className="text-sm font-semibold text-gray-800">{selectedInvoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Date</p>
                <p className="text-sm text-gray-800">
                  {formatDateDDMMYYYY(
                    selectedInvoice.invoiceDate instanceof Date
                      ? selectedInvoice.invoiceDate
                      : (selectedInvoice.invoiceDate as any).toDate?.() || new Date()
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Amount</p>
                <p className="text-sm font-semibold text-gray-800">
                  AED {selectedInvoice.totalAmount?.toLocaleString('en-AE') || '0'}
                </p>
              </div>
            </div>
          ) : selectedInvoices.size > 1 ? (
            <div className="bg-gray-50 p-3 rounded-lg my-2">
              <p className="text-sm font-medium text-gray-600 mb-2">Invoices to be deleted:</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {invoices
                  .filter((inv) => selectedInvoices.has(inv.id))
                  .map((inv) => (
                    <div key={inv.id} className="text-sm text-gray-800 flex justify-between items-center">
                      <span className="font-mono">{inv.invoiceNumber}</span>
                      <span>AED {inv.totalAmount?.toLocaleString('en-AE') || '0'}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={selectedInvoices.size > 0 ? handleBulkDelete : confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false);
          setPdfDataUrl(null);
          setPdfFileName('');
        }}
        pdfDataUrl={pdfDataUrl}
        fileName={pdfFileName}
        title="Invoice Preview"
      />

      {/* Email Success Modal */}
      <AlertDialog open={emailSuccessOpen} onOpenChange={setEmailSuccessOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-green-600">
              ✓ Email Sent Successfully
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Invoice has been sent to the customer
            </AlertDialogDescription>
          </AlertDialogHeader>
          {emailSuccessData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2 my-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Invoice Number</p>
                <p className="text-sm font-semibold text-gray-800">{emailSuccessData.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Sent To</p>
                <p className="text-sm font-semibold text-gray-800 break-all">{emailSuccessData.email}</p>
              </div>
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-green-700">
                  📎 Invoice PDF attached to email
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-center gap-2">
            <AlertDialogAction
              onClick={() => setEmailSuccessOpen(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              Done
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading Blur Overlay */}
      {sendingEmailId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-700 font-medium">Sending invoice email...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
