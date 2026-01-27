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
import { useDeleteQuotation, useCreateInvoice } from '@/hooks/useB2B';
import { Download, Edit, Trash2, FileText, Trash, Mail } from 'lucide-react';
import { useContext } from 'react';
import { UserContext } from '@/lib/userContext';
import { useToast } from '@/hooks/use-toast';
import { activityService } from '@/lib/firestore/activity-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QuotationForm } from '@/components/admin/b2b';
import { generateQuotationPDFBlob } from '@/lib/utils/pdf-generator';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';

interface QuotationListProps {
  companyId: string;
  serviceId: string;
  quotations: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const STATUS_BADGE_CONFIG = {
  draft: { variant: 'outline' as const, color: 'text-gray-600' },
  sent: { variant: 'secondary' as const, color: 'text-blue-600' },
  accepted: { variant: 'default' as const, color: 'text-green-600' },
  rejected: { variant: 'destructive' as const, color: 'text-red-600' },
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
    case '7days':
      start.setDate(start.getDate() - 6); // 6 days back + today = 7 days
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

export function QuotationList({
  companyId,
  serviceId,
  quotations,
  isLoading,
  onRefresh,
}: QuotationListProps) {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const deleteQuotation = useDeleteQuotation();
  const createInvoice = useCreateInvoice();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [editingQuotation, setEditingQuotation] = useState<any>(null);
  const [selectedQuotations, setSelectedQuotations] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [newQuotationIds, setNewQuotationIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailSuccessOpen, setEmailSuccessOpen] = useState(false);
  const [emailSuccessData, setEmailSuccessData] = useState<{ email: string; quotationNumber: string } | null>(null);
  const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('7days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [creatingInvoiceId, setCreatingInvoiceId] = useState<string | null>(null);
  const [invoiceSuccessOpen, setInvoiceSuccessOpen] = useState(false);

  // Get newly created quotation ID from sessionStorage on mount and when quotations change
  useEffect(() => {
    const storedId = sessionStorage.getItem('newQuotationId');
    if (storedId) {
      setNewQuotationIds(new Set([storedId]));
      // Clear after reading
      sessionStorage.removeItem('newQuotationId');
    }
  }, [quotations]);

  // Auto-hide badge after 30 seconds
  useEffect(() => {
    if (newQuotationIds.size === 0) return;

    const timer = setTimeout(() => {
      setNewQuotationIds(new Set());
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [newQuotationIds]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handleDelete = async (quotation: any) => {
    // Remove "new" badge on interaction
    setNewQuotationIds((prev) => {
      const updated = new Set(prev);
      updated.delete(quotation.id);
      return updated;
    });

    setSelectedQuotation(quotation);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedQuotation) return;
    try {
      // Use serviceId from quotation object if prop serviceId is empty
      const actualServiceId = serviceId || selectedQuotation.serviceId;
      await deleteQuotation.mutateAsync({
        companyId,
        serviceId: actualServiceId,
        quotationId: selectedQuotation.id,
      });

      // Log activity
      await activityService.logActivity({
        companyId,
        activityType: 'quotation_deleted',
        description: `Quotation deleted - ${selectedQuotation.quotationNumber}`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: userContext?.role || 'unknown',
        metadata: {
          serviceId: actualServiceId,
          quotationId: selectedQuotation.id,
          quotationNumber: selectedQuotation.quotationNumber,
          status: selectedQuotation.status,
          totalAmount: selectedQuotation.totalAmount,
        },
      });

      toast({
        title: 'Success',
        description: 'Quotation deleted successfully',
      });
      onRefresh();
      setDeleteDialogOpen(false);
      setSelectedQuotation(null);
      setSelectedQuotations(new Set());
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete quotation',
        variant: 'destructive',
      });
    }
  };

  const handleSelectQuotation = (quotationId: string) => {
    const newSelected = new Set(selectedQuotations);
    if (newSelected.has(quotationId)) {
      newSelected.delete(quotationId);
    } else {
      newSelected.add(quotationId);
    }
    setSelectedQuotations(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedQuotations.size === quotations.length) {
      setSelectedQuotations(new Set());
    } else {
      setSelectedQuotations(new Set(quotations.map((q) => q.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      for (const quotationId of Array.from(selectedQuotations)) {
        const quotation = quotations.find((q) => q.id === quotationId);
        if (!quotation) continue;

        const actualServiceId = serviceId || quotation.serviceId;
        await deleteQuotation.mutateAsync({
          companyId,
          serviceId: actualServiceId,
          quotationId: quotation.id,
        });

        // Log activity for each deleted quotation
        await activityService.logActivity({
          companyId,
          activityType: 'quotation_deleted',
          description: `Quotation deleted (bulk) - ${quotation.quotationNumber}`,
          userId: userContext?.user?.uid || 'unknown',
          userName: userContext?.user?.displayName || 'Unknown User',
          userEmail: userContext?.user?.email || 'unknown@email.com',
          userRole: userContext?.role || 'unknown',
          metadata: {
            serviceId: actualServiceId,
            quotationId: quotation.id,
            quotationNumber: quotation.quotationNumber,
            status: quotation.status,
            totalAmount: quotation.totalAmount,
          },
        });
      }
      toast({
        title: 'Success',
        description: `${selectedQuotations.size} quotation(s) deleted successfully`,
      });
      onRefresh();
      setDeleteDialogOpen(false);
      setSelectedQuotations(new Set());
    } catch (error) {
      console.error('Error deleting quotations:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some quotations',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleCreateInvoice = async (quotation: any) => {
    if (quotation.status !== 'accepted') {
      toast({
        title: 'Error',
        description: 'Invoice can only be created from accepted quotations',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingInvoiceId(quotation.id);

      // Use serviceId from quotation object if prop serviceId is empty
      const actualServiceId = serviceId || quotation.serviceId;
      const result = await createInvoice.mutateAsync({
        companyId,
        serviceId: actualServiceId,
        quotation,
        userId: user?.uid || '',
      });

      // Store the newly created invoice ID in sessionStorage
      if (result?.id) {
        sessionStorage.setItem('newInvoiceId', result.id);
      }

      // Show success modal
      setInvoiceSuccessOpen(true);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      });
    } finally {
      setCreatingInvoiceId(null);
    }
  };

  const handleDownload = async (quotation: any) => {
    // Remove "new" badge on interaction
    setNewQuotationIds((prev) => {
      const updated = new Set(prev);
      updated.delete(quotation.id);
      return updated;
    });

    try {
      // Fetch company data to get TRN and address
      let companyData: any = {};
      let companySettings: any = {};
      
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
      
      // Fetch company settings (branding, logo, stamp) from settings/company
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'company'));
        if (settingsDoc.exists()) {
          companySettings = settingsDoc.data();
        }
      } catch (err) {
        console.warn('Could not fetch company settings:', err);
      }

      const pdfDataUrl = await generateQuotationPDFBlob({
        quotationNumber: quotation.quotationNumber,
        date: quotation.quotationDate instanceof Date
          ? quotation.quotationDate
          : (quotation.quotationDate as any).toDate?.() || new Date(),
        company: {
          name: quotation.companyName || companyData.name || companySettings.name || 'N/A',
          phone: quotation.phone || quotation.companyPhone || companyData.phone || companySettings.phone,
          email: quotation.email || quotation.companyEmail || companyData.email || companySettings.email,
          trn: quotation.companyTRN || companyData.trn || companySettings.trn,
          address: quotation.companyAddress || companyData.address || companySettings.address,
          city: quotation.companyCity || companyData.city || companySettings.city,
          state: quotation.companyState || companyData.state || companySettings.state,
          zipCode: quotation.companyZipCode || companyData.zipCode || companySettings.zipCode,
          logoUrl: companySettings.logoUrl,
          stampUrl: companySettings.stampUrl,
        },
        serviceTitle: quotation.serviceTitle || 'Service',
        vehicles: quotation.vehicles?.map((v: any) => {
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
            service: v.serviceTitle || quotation.serviceTitle || 'Service',
            services: v.services || [],
            jobCardNo: v.jobCardNo || null, // Include jobCardNo from vehicle
            serviceDate: v.serviceDate || null, // Include service date
          };
        }) || [],
        referralTotal: quotation.referralTotal || 0,
        subtotal: quotation.subtotal || 0,
        grandTotal: quotation.totalAmount || 0,
        status: quotation.status || 'draft',
        notes: quotation.notes,
        validityDate: quotation.validityDate,
        paymentTerms: quotation.paymentTerms,
        showReferralCommission: quotation.showReferralCommission,
      });

      setPdfDataUrl(pdfDataUrl);
      setPdfFileName(`Quotation_${quotation.quotationNumber}.pdf`);
      setPdfPreviewOpen(true);
    } catch (error) {
      console.error('Error generating quotation PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate quotation PDF',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = async (quotation: any) => {
    try {
      setSendingEmailId(quotation.id);

      // Remove "new" badge on interaction
      setNewQuotationIds((prev) => {
        const updated = new Set(prev);
        updated.delete(quotation.id);
        return updated;
      });

      // Fetch company data to get email and details
      let companyData: any = {};
      let companySettings: any = {};
      
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
      
      // Fetch company settings (branding, logo, stamp) from settings/company
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'company'));
        if (settingsDoc.exists()) {
          companySettings = settingsDoc.data();
        }
      } catch (err) {
        console.warn('Could not fetch company settings:', err);
      }

      const companyEmail = quotation.email || quotation.companyEmail || companyData.email || companySettings.email;
      const companyPhone = quotation.phone || quotation.companyPhone || companyData.phone || companySettings.phone;
      const companyName = quotation.companyName || companyData.name || companySettings.name;
      const companyAddress = quotation.companyAddress || companyData.address || companySettings.address;
      const companyCity = quotation.companyCity || companyData.city || companySettings.city;

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
        const pdfDataUrl = await generateQuotationPDFBlob({
          quotationNumber: quotation.quotationNumber,
          date: quotation.quotationDate instanceof Date
            ? quotation.quotationDate
            : (quotation.quotationDate as any).toDate?.() || new Date(),
          company: {
            name: quotation.companyName || companyData.name || companySettings.name || 'N/A',
            phone: quotation.phone || quotation.companyPhone || companyData.phone || companySettings.phone,
            email: quotation.email || quotation.companyEmail || companyData.email || companySettings.email,
            trn: quotation.companyTRN || companyData.trn || companySettings.trn,
            address: quotation.companyAddress || companyData.address || companySettings.address,
            city: quotation.companyCity || companyData.city || companySettings.city,
            state: quotation.companyState || companyData.state || companySettings.state,
            zipCode: quotation.companyZipCode || companyData.zipCode || companySettings.zipCode,
            logoUrl: companySettings.logoUrl,
            stampUrl: companySettings.stampUrl,
          },
          serviceTitle: quotation.serviceTitle || 'Service',
          vehicles: quotation.vehicles?.map((v: any) => {
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
              service: v.serviceTitle || quotation.serviceTitle || 'Service',
              services: v.services || [],
              jobCardNo: v.jobCardNo || null,
              serviceDate: v.serviceDate || null,
            };
          }) || [],
          referralTotal: quotation.referralTotal || 0,
          subtotal: quotation.subtotal || 0,
          grandTotal: quotation.totalAmount || 0,
          status: quotation.status || 'draft',
          notes: quotation.notes,
          validityDate: quotation.validityDate,
          paymentTerms: quotation.paymentTerms,
          showReferralCommission: quotation.showReferralCommission,
        });

        // Convert data URL to base64 for attachment
        if (pdfDataUrl) {
          const base64Data = pdfDataUrl.split(',')[1] || pdfDataUrl;
          pdfAttachment = {
            name: `Quotation_${quotation.quotationNumber}.pdf`,
            data: base64Data,
          };
        }
      } catch (pdfErr) {
        console.warn('Could not generate PDF attachment:', pdfErr);
        // Continue without PDF attachment
      }

      // Prepare vehicle data for email
      const vehicles = quotation.vehicles?.map((v: any) => {
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
        emailType: 'quotation-created',
        name: companyName || 'Valued Customer',
        email: companyEmail,
        phone: companyPhone,
        companyName: companyName,
        jobCardNo: quotation.jobCardNo || quotation.vehicles?.[0]?.jobCardNo || 'N/A',
        quotationNumber: quotation.quotationNumber,
        total: quotation.totalAmount || 0,
        validityDays: 30,
        serviceTitle: quotation.serviceTitle || 'Service',
        vehicles: vehicles,
        companyAddress: companyAddress,
        companyCity: companyCity,
        companyEmail: companyEmail,
        companyPhone: companyPhone,
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

      // Log activity
      await activityService.logActivity({
        companyId,
        activityType: 'quotation_email_sent',
        description: `Quotation email sent - ${quotation.quotationNumber}`,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown User',
        userEmail: user?.email || 'unknown@email.com',
        userRole: userContext?.role || 'unknown',
        metadata: {
          serviceId: serviceId || quotation.serviceId,
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          recipientEmail: companyEmail,
          status: quotation.status,
          totalAmount: quotation.totalAmount,
        },
      });

      // Show success modal
      setEmailSuccessData({
        email: companyEmail,
        quotationNumber: quotation.quotationNumber,
      });
      setEmailSuccessOpen(true);
    } catch (error) {
      console.error('Error sending quotation email:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send quotation email',
        variant: 'destructive',
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  // Sort and paginate quotations
  const dateRange = getDateRange(dateFilterType, customStartDate ? new Date(customStartDate) : undefined, customEndDate ? new Date(customEndDate) : undefined);

  const filteredQuotations = quotations.filter((quotation) => {
    const quotationDate = quotation.quotationDate instanceof Date ? quotation.quotationDate : (quotation.quotationDate as any).toDate?.() || new Date();
    return quotationDate >= dateRange.start && quotationDate <= dateRange.end;
  });

  const sortedQuotations = [...filteredQuotations].sort((a, b) => {
    const dateA = a.quotationDate instanceof Date ? a.quotationDate : (a.quotationDate as any).toDate?.() || new Date();
    const dateB = b.quotationDate instanceof Date ? b.quotationDate : (b.quotationDate as any).toDate?.() || new Date();
    return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
  });

  const totalPages = Math.ceil(sortedQuotations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedQuotations = sortedQuotations.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Quotations</CardTitle>
          <CardDescription>All quotations for this service</CardDescription>
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
                  <SelectItem value="7days">Last 7 Days</SelectItem>
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
                Showing {filteredQuotations.length} quotation(s)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {/* Bulk Delete Section */}
            {selectedQuotations.size > 0 && (
              <div className="flex gap-2 items-center bg-red-50 p-3 rounded-lg mb-4 border border-red-200">
                <span className="text-sm font-medium text-red-900">
                  {selectedQuotations.size} quotation(s) selected
                </span>
                <Button
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-1 bg-red-600 hover:bg-red-700 ml-auto"
                  disabled={isBulkDeleting}
                >
                  <Trash size={16} />
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
                        quotations.length > 0 &&
                        selectedQuotations.size === quotations.length
                      }
                      onCheckedChange={() => handleSelectAll()}
                    />
                  </TableHead>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      Date
                      <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'} />
                    </button>
                  </TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead className="min-w-64">JobCardNo | Vehicles: Cost</TableHead>
                  <TableHead className="text-right">Referral Fee (AED)</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Loading quotations...
                    </TableCell>
                  </TableRow>
                ) : sortedQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No quotations created yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedQuotations.map((quotation) => (
                    <TableRow key={quotation.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedQuotations.has(quotation.id)}
                          onCheckedChange={() => handleSelectQuotation(quotation.id)}
                          disabled={quotation.status === 'accepted'}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {quotation.quotationNumber}
                          {newQuotationIds.has(quotation.id) && (
                            <Badge className="bg-green-100 text-green-800 border border-green-300 animate-pulse">
                              new
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateDDMMYYYY(quotation.quotationDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {quotation.vehicles?.length || 0} vehicles
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-2">
                          {quotation.vehicles && quotation.vehicles.length > 0 ? (
                            <>
                              <div className="space-y-1">
                                {quotation.vehicles.map((v: any) => {
                                  // Calculate vehicle service cost - prioritize serviceAmount field (updated value from form)
                                  let vehicleServiceCost = 0;
                                  if (v.serviceAmount !== undefined && v.serviceAmount !== null) {
                                    vehicleServiceCost = v.serviceAmount;
                                  } else if (v.services && Array.isArray(v.services) && v.services.length > 0) {
                                    vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
                                  } else {
                                    vehicleServiceCost = 0;
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
                                        <span className="font-medium">AED {vehicleServiceCost.toLocaleString('en-AE')}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="text-sm font-bold pt-2 border-t border-gray-300 text-gray-900">
                                Subtotal: AED {(() => {
                                  const costs = quotation.vehicles?.map((v: any) => {
                                    let vehicleServiceCost = 0;
                                    // Prioritize serviceAmount field if it exists (updated value from form)
                                    if (v.serviceAmount !== undefined && v.serviceAmount !== null) {
                                      vehicleServiceCost = v.serviceAmount;
                                    } else if (v.services && Array.isArray(v.services) && v.services.length > 0) {
                                      vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
                                    } else {
                                      vehicleServiceCost = 0;
                                    }
                                    return vehicleServiceCost;
                                  }) || [];
                                  const total = costs.reduce((sum: number, cost: number) => sum + cost, 0);
                                  return total.toLocaleString('en-AE');
                                })()}
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <div className="flex flex-col gap-1 items-end">
                          <div>AED {(quotation.referralTotal || 0).toLocaleString('en-AE')}</div>
                          {!quotation.showReferralCommission && (
                            <p className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                              ⚠️ Hidden in Quotation
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {(() => {
                          // Calculate subtotal from vehicle costs
                          const costs = quotation.vehicles?.map((v: any) => {
                            let vehicleServiceCost = 0;
                            // Prioritize serviceAmount field if it exists (updated value from form)
                            if (v.serviceAmount !== undefined && v.serviceAmount !== null) {
                              vehicleServiceCost = v.serviceAmount;
                            } else if (v.services && Array.isArray(v.services) && v.services.length > 0) {
                              vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
                            } else {
                              vehicleServiceCost = 0;
                            }
                            return vehicleServiceCost;
                          }) || [];
                          const subtotal = costs.reduce((sum: number, cost: number) => sum + cost, 0);

                          // Add referral total only if showReferralCommission is true
                          const referralAmount = quotation.showReferralCommission ? (quotation.referralTotal || 0) : 0;
                          const grandTotal = subtotal + referralAmount;

                          return `AED ${grandTotal.toLocaleString('en-AE')}`;
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="relative inline-block group">

                          <Badge
                            variant={
                              STATUS_BADGE_CONFIG[quotation.status as keyof typeof STATUS_BADGE_CONFIG]
                                ?.variant || 'outline'
                            }
                          >
                            {quotation.status}
                            {quotation.status !== 'accepted' && (
                              <span className="animate-pulse">
                                {' | '}Accept to Invoice
                              </span>
                            )}
                          </Badge>

                          <span
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
         whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white
         opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50"
                          >
                            {quotation.status === 'accepted'
                              ? 'Quotation accepted - Ready to create invoice'
                              : quotation.status === 'sent'
                                ? 'Quotation sent to customer - Awaiting response'
                                : quotation.status === 'rejected'
                                  ? 'Quotation rejected by customer'
                                  : 'Draft quotation - Change status when ready to send'}
                          </span>
                        </div>

                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">

                          <div className='relative inline-block group'>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => {
                                // Remove "new" badge on interaction
                                setNewQuotationIds((prev) => {
                                  const updated = new Set(prev);
                                  updated.delete(quotation.id);
                                  return updated;
                                });
                                setEditingQuotation(quotation);
                              }}
                              // disabled={quotation.status === 'accepted'}
                              title={quotation.status === 'accepted' ? 'Cannot edit accepted quotations' : ''}
                            >
                              <Edit size={16} />
                            </Button>
                            <span
                              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
           whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white
           opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              Edit Quotation
                            </span>
                          </div>

                          <div className='relative inline-block group'>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              onClick={() => handleDownload(quotation)}
                            >
                              <Download size={16} />
                            </Button>
                            <span
                              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
           whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white
           opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              Download Quotation
                            </span>
                          </div>

                          <div className='relative inline-block group'>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-blue-600"
                              onClick={() => handleSendEmail(quotation)}
                              disabled={sendingEmailId === quotation.id || quotation.status === 'draft' || quotation.status === 'rejected'}
                            >
                              <Mail size={16} />
                            </Button>
                            <span
                              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
           whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white
           opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              {sendingEmailId === quotation.id ? 'Sending...' : 'Send Email'}
                            </span>
                          </div>

                          {quotation.status === 'accepted' && (

                            <div className='relative inline-block group'>

                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1 text-green-600"
                                onClick={() => handleCreateInvoice(quotation)}
                                disabled={createInvoice.isPending}
                              >
                                <FileText size={16} />
                              </Button>
                              <span
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
           whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white
           opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                Generate Invoice
                              </span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDelete(quotation)}
                            disabled={deleteQuotation.isPending || quotation.status === 'accepted'}
                            title={quotation.status === 'accepted' ? 'Cannot delete accepted quotations' : ''}
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
                Page {currentPage} of {totalPages} • Total: {sortedQuotations.length}
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

      {/* Edit Quotation Modal */}
      {editingQuotation && (
        <QuotationForm
          companyId={companyId}
          serviceId={serviceId}
          quotation={editingQuotation}
          isOpen={!!editingQuotation}
          onClose={() => setEditingQuotation(null)}
          onSuccess={() => {
            setEditingQuotation(null);
            onRefresh();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedQuotations.size > 1 ? 'Delete Quotations' : 'Delete Quotation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedQuotations.size > 1
                ? `Are you sure you want to delete ${selectedQuotations.size} quotations? This action cannot be undone.`
                : 'Are you sure you want to delete this quotation? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedQuotations.size === 1 && selectedQuotation ? (
            <div className="bg-gray-50 p-3 rounded-lg my-2 space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-600">Quotation Number</p>
                <p className="text-sm font-semibold text-gray-800">{selectedQuotation.quotationNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Date</p>
                <p className="text-sm text-gray-800">
                  {formatDateDDMMYYYY(
                    selectedQuotation.quotationDate instanceof Date
                      ? selectedQuotation.quotationDate
                      : (selectedQuotation.quotationDate as any).toDate?.() || new Date()
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Amount</p>
                <p className="text-sm font-semibold text-gray-800">
                  AED {selectedQuotation.totalAmount?.toLocaleString('en-AE') || '0'}
                </p>
              </div>
            </div>
          ) : selectedQuotations.size > 1 ? (
            <div className="bg-gray-50 p-3 rounded-lg my-2">
              <p className="text-sm font-medium text-gray-600 mb-2">Quotations to be deleted:</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {quotations
                  .filter((q) => selectedQuotations.has(q.id))
                  .map((q) => (
                    <div key={q.id} className="text-sm text-gray-800 flex justify-between items-center">
                      <span className="font-mono">{q.quotationNumber}</span>
                      <span>AED {q.totalAmount?.toLocaleString('en-AE') || '0'}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={selectedQuotations.size > 0 ? handleBulkDelete : confirmDelete}
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
        title="Quotation Preview"
      />

      {/* Email Success Modal */}
      <AlertDialog open={emailSuccessOpen} onOpenChange={setEmailSuccessOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-green-600">
              ✓ Email Sent Successfully
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Quotation has been sent to the customer
            </AlertDialogDescription>
          </AlertDialogHeader>
          {emailSuccessData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2 my-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Quotation Number</p>
                <p className="text-sm font-semibold text-gray-800">{emailSuccessData.quotationNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Sent To</p>
                <p className="text-sm font-semibold text-gray-800 break-all">{emailSuccessData.email}</p>
              </div>
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-green-700">
                  📎 Quotation PDF attached to email
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
              <p className="text-gray-700 font-medium">Sending quotation email...</p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Creation Loading Blur Overlay */}
      {creatingInvoiceId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              <p className="text-gray-700 font-medium">Creating invoice...</p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Success Modal */}
      <AlertDialog open={invoiceSuccessOpen} onOpenChange={setInvoiceSuccessOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-green-600">
              ✓ Invoice Created Successfully
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Your invoice has been created and is ready to use
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-4 text-center">
            <p className="text-sm font-semibold text-green-700">
              Done, please check invoice section
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <AlertDialogAction
              onClick={() => {
                setInvoiceSuccessOpen(false);
                onRefresh();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Done
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
