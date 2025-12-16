"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import QuotationForm from '@/components/admin/QuotationForm';
import jsPDF from 'jspdf';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params?.id as string;

  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  useEffect(() => {
    loadQuotation();
  }, [quotationId]);

  async function loadQuotation() {
    if (!quotationId) return;
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'quotations', quotationId));
      if (docSnap.exists()) {
        setQuotation({ id: docSnap.id, ...docSnap.data() });
      } else {
        alert('Quotation not found');
        router.push('/admin/quotation');
      }
    } catch (err) {
      safeConsoleError('Load quotation error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this quotation permanently?')) return;
    
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'quotations', quotationId));
      alert('Quotation deleted');
      router.push('/admin/quotation');
    } catch (err) {
      safeConsoleError('Delete quotation error', err);
      alert('Failed to delete quotation');
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return 'Invalid date';
    }
  }

  function generatePDF() {
    if (!quotation) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const leftMargin = 20;
    const rightMargin = 20;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    let yPos = 20;

    // Header - Company Name
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246); // Blue color
    pdf.text('CARMANTRA', leftMargin, yPos);
    
    yPos += 6;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Premium Auto Care Services', leftMargin, yPos);
    
    yPos += 5;
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Car Mantra LLC', leftMargin, yPos);
    
    yPos += 4;
    pdf.text('Email: info@carmantra.com | Phone: +971 50 123 4567', leftMargin, yPos);
    
    // Quotation Title
    yPos += 11;
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('QUOTATION', leftMargin, yPos);
    
    // Quotation Number and Date - Right aligned
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const quotationNumber = quotation.quotationNumber || 'N/A';
    const createdDate = formatDate(quotation.createdAt);
    pdf.text(`Quotation #: ${quotationNumber}`, pageWidth - rightMargin, yPos - 10, { align: 'right' });
    pdf.text(`Date: ${createdDate}`, pageWidth - rightMargin, yPos - 5, { align: 'right' });
    pdf.text(`Valid for: ${quotation.validityDays || 30} days`, pageWidth - rightMargin, yPos, { align: 'right' });
    
    // Line separator
    yPos += 5;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(leftMargin, yPos, pageWidth - rightMargin, yPos);
    
    // Customer Information
    yPos += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Customer Information', leftMargin, yPos);
    
    yPos += 7;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${quotation.customerName || 'N/A'}`, leftMargin, yPos);
    
    if (quotation.customerEmail) {
      yPos += 5;
      pdf.text(`Email: ${quotation.customerEmail}`, leftMargin, yPos);
    }
    
    if (quotation.customerMobile) {
      yPos += 5;
      pdf.text(`Mobile: ${quotation.customerMobile}`, leftMargin, yPos);
    }
    
    // Vehicle Information
    if (quotation.vehicleDetails && Object.values(quotation.vehicleDetails).some(v => v)) {
      yPos += 10;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Vehicle Information', leftMargin, yPos);
      
      yPos += 7;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const veh = quotation.vehicleDetails;
      if (veh.brand || veh.model) {
        pdf.text(`Vehicle: ${veh.brand || ''} ${veh.model || ''}`.trim(), leftMargin, yPos);
        yPos += 5;
      }
      if (veh.type) {
        pdf.text(`Type: ${veh.type}`, leftMargin, yPos);
        yPos += 5;
      }
      if (veh.plate) {
        pdf.text(`Plate: ${veh.plate}`, leftMargin, yPos);
        yPos += 5;
      }
    }
    
    // Service Items Table
    yPos += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Service Details', leftMargin, yPos);
    
    yPos += 7;
    
    // Table Header
    pdf.setFillColor(59, 130, 246); // Blue background
    pdf.rect(leftMargin, yPos - 4, contentWidth, 8, 'F');
    
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', leftMargin + 2, yPos);
    pdf.text('Qty', leftMargin + 105, yPos);
    pdf.text('Rate', leftMargin + 125, yPos);
    pdf.text('Amount', leftMargin + 150, yPos);
    
    yPos += 8;
    
    // Table Rows
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    
    const items = quotation.items || [];
    items.forEach((item: any, index: number) => {
      // Add page break if needed
      if (yPos > 260) {
        pdf.addPage();
        yPos = 20;
      }
      
      // Alternate row background
      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(leftMargin, yPos - 4, contentWidth, 7, 'F');
      }
      
      const description = item.description || 'N/A';
      pdf.text(description.substring(0, 50), leftMargin + 2, yPos);
      pdf.text(String(item.quantity || 0), leftMargin + 105, yPos);
      pdf.text(`AED ${(item.rate || 0).toFixed(2)}`, leftMargin + 125, yPos);
      pdf.text(`AED ${(item.amount || 0).toFixed(2)}`, leftMargin + 150, yPos);
      
      yPos += 7;
    });
    
    // Totals Section
    yPos += 5;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(leftMargin, yPos, pageWidth - rightMargin, yPos);
    yPos += 7;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    const subtotal = quotation.subtotal || 0;
    const taxAmount = quotation.taxAmount || 0;
    const discount = quotation.discount || 0;
    const total = quotation.total || 0;
    
    pdf.text('Items Total:', leftMargin + 110, yPos);
    pdf.text(`AED ${(quotation.itemsTotal || 0).toFixed(2)}`, leftMargin + 150, yPos);
    yPos += 6;
    
    if (quotation.laborCharges > 0) {
      pdf.text('Labor Charges:', leftMargin + 110, yPos);
      pdf.text(`AED ${quotation.laborCharges.toFixed(2)}`, leftMargin + 150, yPos);
      yPos += 6;
    }
    
    pdf.text('Subtotal:', leftMargin + 110, yPos);
    pdf.text(`AED ${subtotal.toFixed(2)}`, leftMargin + 150, yPos);
    yPos += 6;
    
    pdf.text('Tax (5% VAT):', leftMargin + 110, yPos);
    pdf.text(`AED ${taxAmount.toFixed(2)}`, leftMargin + 150, yPos);
    yPos += 6;
    
    if (discount > 0) {
      pdf.setTextColor(220, 38, 38); // Red for discount
      pdf.text('Discount:', leftMargin + 110, yPos);
      pdf.text(`- AED ${discount.toFixed(2)}`, leftMargin + 150, yPos);
      pdf.setTextColor(0, 0, 0);
      yPos += 6;
    }
    
    // Grand Total
    yPos += 2;
    pdf.setFillColor(59, 130, 246);
    pdf.rect(leftMargin + 105, yPos - 4, contentWidth - 105, 10, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Grand Total:', leftMargin + 110, yPos + 2);
    pdf.text(`AED ${total.toFixed(2)}`, leftMargin + 140, yPos + 2);
    
    // Notes
    if (quotation.notes) {
      yPos += 15;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Notes:', leftMargin, yPos);
      
      yPos += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const noteLines = pdf.splitTextToSize(quotation.notes, contentWidth);
      pdf.text(noteLines, leftMargin, yPos);
    }
    
    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pdf.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save PDF
    const filename = `Quotation_${quotation.quotationNumber || quotationId}.pdf`;
    pdf.save(filename);
  }

  async function sendEmail() {
    if (!quotation?.customerEmail) {
      alert('No customer email found');
      return;
    }

    setEmailStatus('Sending...');
    
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: quotation.customerEmail,
          subject: `Quotation from Carmantra - ${quotation.quotationNumber || quotationId}`,
          text: `Dear ${quotation.customerName || 'Customer'},\n\nPlease find your quotation attached.\n\nQuotation Number: ${quotation.quotationNumber || quotationId}\nTotal: AED ${(quotation.total || 0).toFixed(2)}\nValid for: ${quotation.validityDays || 30} days\n\nThank you for considering Carmantra.\n\nBest regards,\nCarmantra Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">Quotation from Carmantra</h2>
              <p>Dear ${quotation.customerName || 'Customer'},</p>
              <p>Please find your quotation details below:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Quotation Number:</strong> ${quotation.quotationNumber || quotationId}</p>
                <p style="margin: 5px 0;"><strong>Total Amount:</strong> AED ${(quotation.total || 0).toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Valid for:</strong> ${quotation.validityDays || 30} days</p>
              </div>
              <p>Thank you for considering Carmantra for your automotive needs.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Best regards,<br/>
                <strong>Carmantra Team</strong>
              </p>
            </div>
          `,
        }),
      });

      if (response.ok) {
        setEmailStatus('Email sent successfully!');
        
        // Log email activity
        await addDoc(collection(db, 'emailLogs'), {
          quotationId,
          quotationNumber: quotation.quotationNumber,
          customerEmail: quotation.customerEmail,
          customerName: quotation.customerName,
          subject: `Quotation from Carmantra - ${quotation.quotationNumber || quotationId}`,
          sentAt: Timestamp.now(),
        });
        
        setTimeout(() => setEmailStatus(null), 3000);
      } else {
        setEmailStatus('Failed to send email');
        setTimeout(() => setEmailStatus(null), 3000);
      }
    } catch (err) {
      safeConsoleError('Send email error', err);
      setEmailStatus('Error sending email');
      setTimeout(() => setEmailStatus(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-600">Quotation not found</p>
          <button 
            onClick={() => router.push('/admin/quotation')}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/admin/quotation')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Quotations
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>

          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>

          {/* {quotation.customerEmail && (
            <button
              onClick={sendEmail}
              disabled={emailStatus === 'Sending...'}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {emailStatus || 'Email'}
            </button>
          )} */}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Email Status Message */}
      {emailStatus && (
        <div className={`mb-4 p-3 rounded ${
          emailStatus.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 
          emailStatus.includes('Sending') ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {emailStatus}
        </div>
      )}

      {/* Quotation Content */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">CARMANTRA</h1>
              <p className="text-blue-100">Premium Auto Care Services</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Quotation #</div>
              <div className="text-xl font-bold">{quotation.quotationNumber || 'N/A'}</div>
              <div className="text-sm text-blue-100 mt-2">Date: {formatDate(quotation.createdAt)}</div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${statusColors[quotation.status as keyof typeof statusColors] || statusColors.pending}`}>
                {(quotation.status || 'pending').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Customer Information</h3>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-gray-900">{quotation.customerName || 'N/A'}</p>
                {quotation.customerEmail && <p className="text-gray-600">{quotation.customerEmail}</p>}
                {quotation.customerMobile && <p className="text-gray-600">{quotation.customerMobile}</p>}
              </div>
            </div>

            {quotation.vehicleDetails && Object.values(quotation.vehicleDetails).some((v: any) => v) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Vehicle Information</h3>
                <div className="space-y-2">
                  {(quotation.vehicleDetails.brand || quotation.vehicleDetails.model) && (
                    <p className="text-gray-900 font-medium">
                      {quotation.vehicleDetails.brand} {quotation.vehicleDetails.model}
                    </p>
                  )}
                  {quotation.vehicleDetails.type && <p className="text-gray-600">Type: {quotation.vehicleDetails.type}</p>}
                  {quotation.vehicleDetails.plate && <p className="text-gray-600">Plate: {quotation.vehicleDetails.plate}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Service Items Table */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Service Details</h3>
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(quotation.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-gray-900">{item.description || 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{item.quantity || 0}</td>
                      <td className="px-4 py-3 text-right text-gray-700">AED {(item.rate || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">AED {(item.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Total:</span>
                <span className="font-medium">AED {(quotation.itemsTotal || 0).toFixed(2)}</span>
              </div>
              {quotation.laborCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Labor Charges:</span>
                  <span className="font-medium">AED {quotation.laborCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">AED {(quotation.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (5% VAT):</span>
                <span className="font-medium text-blue-600">AED {(quotation.taxAmount || 0).toFixed(2)}</span>
              </div>
              {quotation.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">- AED {quotation.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t-2 border-blue-600 pt-2">
                <span>Grand Total:</span>
                <span className="text-blue-600">AED {(quotation.total || 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 text-right pt-2">
                Valid for {quotation.validityDays || 30} days
              </div>
            </div>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 mx-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold">Edit Quotation</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <QuotationForm
                quotation={quotation}
                onCreated={() => {
                  setShowEditModal(false);
                  loadQuotation();
                }}
                onCancel={() => setShowEditModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

