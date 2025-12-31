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
import { ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useDeleteQuotation, useCreateInvoice } from '@/hooks/useB2B';
import { Download, Edit, Trash2, FileText, Trash } from 'lucide-react';
import { useContext } from 'react';
import { UserContext } from '@/lib/userContext';
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

  // Get newly created quotation ID from sessionStorage on mount
  useEffect(() => {
    const storedId = sessionStorage.getItem('newQuotationId');
    if (storedId) {
      setNewQuotationIds(new Set([storedId]));
      // Clear after reading
      sessionStorage.removeItem('newQuotationId');
    }
  }, []);

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
      
      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });
      onRefresh();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      });
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

      const pdfDataUrl = await generateQuotationPDFBlob({
        quotationNumber: quotation.quotationNumber,
        date: quotation.quotationDate instanceof Date
          ? quotation.quotationDate
          : (quotation.quotationDate as any).toDate?.() || new Date(),
        company: {
          name: quotation.companyName || companyData.name || 'N/A',
          phone: quotation.phone || quotation.companyPhone || companyData.phone,
          email: quotation.email || quotation.companyEmail || companyData.email,
          trn: quotation.companyTRN || companyData.trn,
          address: quotation.companyAddress || companyData.address,
          city: quotation.companyCity || companyData.city,
          state: quotation.companyState || companyData.state,
          zipCode: quotation.companyZipCode || companyData.zipCode,
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

  // Sort and paginate quotations
  const sortedQuotations = [...quotations].sort((a, b) => {
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
                  <TableHead className="min-w-64">Vehicles & Cost</TableHead>
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
                        <div className="flex flex-col gap-1">
                          {quotation.vehicles && quotation.vehicles.length > 0 ? (
                            quotation.vehicles.map((v: any) => {
                              // Calculate vehicle service cost - prioritize services array, then serviceAmount
                              let vehicleServiceCost = 0;
                              if (v.services && Array.isArray(v.services) && v.services.length > 0) {
                                vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
                              } else {
                                vehicleServiceCost = v.serviceAmount || 0;
                              }
                              return (
                                <div key={v.plateNumber} className="text-sm">
                                  <span className="font-mono text-gray-600">{v.plateNumber}:</span>
                                  <span className="font-semibold ml-2">AED {vehicleServiceCost.toLocaleString('en-AE')}</span>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </div>
                        {quotation.vehicles && quotation.vehicles.length > 0 && (
                          <div className="text-md text-gray-800 mt-1">
                            <span className="font-medium">Subtotal: </span>
                            {(() => {
                              const costs = quotation.vehicles?.map((v: any) => {
                                let vehicleServiceCost = 0;
                                if (v.services && Array.isArray(v.services) && v.services.length > 0) {
                                  vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
                                } else {
                                  vehicleServiceCost = v.serviceAmount || v.serviceCost || 0;
                                }
                                return vehicleServiceCost;
                              }) || [];
                              const total = costs.reduce((sum: number, cost: number) => sum + cost, 0);
                              return <b className='font-bold'>AED {total.toLocaleString('en-AE')}</b>;
                            })()}
                          </div>
                        )}
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
                          const costs = quotation.vehicles?.map((v: any) => {
                            let vehicleServiceCost = 0;
                            if (v.services && Array.isArray(v.services) && v.services.length > 0) {
                              vehicleServiceCost = v.services.reduce((s: number, svc: any) => s + (svc.amount || 0), 0);
                            } else {
                              vehicleServiceCost = v.serviceAmount || v.serviceCost || 0;
                            }
                            return vehicleServiceCost;
                          }) || [];
                          const subtotal = costs.reduce((sum: number, cost: number) => sum + cost, 0);
                          const grandTotal = subtotal + (quotation.referralTotal || 0);
                          return `AED ${grandTotal.toLocaleString('en-AE')}`;
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            STATUS_BADGE_CONFIG[quotation.status as keyof typeof STATUS_BADGE_CONFIG]
                              ?.variant || 'outline'
                          }
                        >
                          {quotation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">

                          <div className='relative inline-block group'>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              onClick={() => {
                                // Remove "new" badge on interaction
                                setNewQuotationIds((prev) => {
                                  const updated = new Set(prev);
                                  updated.delete(quotation.id);
                                  return updated;
                                });
                                setEditingQuotation(quotation);
                              }}
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
                            Make Invoice
                          </span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(quotation)}
                            disabled={deleteQuotation.isPending}
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
                  {new Date(
                    selectedQuotation.quotationDate instanceof Date
                      ? selectedQuotation.quotationDate
                      : (selectedQuotation.quotationDate as any).toDate?.() || new Date()
                  ).toLocaleDateString()}
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
    </>
  );
}
