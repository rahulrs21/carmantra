"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import QuotationForm from '@/components/admin/QuotationForm';
import jsPDF from 'jspdf';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { PermissionGate } from '@/components/PermissionGate';

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params?.id as string;

  const [quotation, setQuotation] = useState<any>(null);
  const [bookingVehicles, setBookingVehicles] = useState<any[] | null>(null);
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
        const data = { id: docSnap.id, ...docSnap.data() } as any;
        // Always try to fetch vehicles from booking if serviceBookingId exists
        if (data.serviceBookingId) {
          try {
            const bookingSnap = await getDoc(doc(db, 'bookedServices', data.serviceBookingId));
            if (bookingSnap.exists()) {
              const bookingData = bookingSnap.data();
              if (Array.isArray(bookingData.vehicles) && bookingData.vehicles.length > 0) {
                setBookingVehicles(bookingData.vehicles);
                // If quotation.vehicles is empty, patch it for PDF and edit
                if (!Array.isArray(data.vehicles) || data.vehicles.length === 0) {
                  data.vehicles = bookingData.vehicles;
                }
              }
            }
          } catch (err) {
            safeConsoleError('Load booking vehicles error', err);
          }
        }
        setQuotation(data);
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

  const sourceLabelMap: Record<string, string> = {
    lead: 'Lead',
    direct: 'Direct booking',
    referral: 'Referral',
    other: 'Other',
  };
  const derivedSource = quotation ? (quotation.source || (quotation.sourceLeadId ? 'lead' : 'direct')) : 'direct';
  const sourceLabel = sourceLabelMap[derivedSource] || 'Direct booking';


  async function generatePDF() {
    if (!quotation) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const leftMargin = 20;
    const rightMargin = 20;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    let yPos = 20;

    // Header - Logo Image
    try {
      const response = await fetch('/images/Carmantra_Invoice.png');
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onload = () => {
        const imgData = reader.result;
        // Add black background rectangle with rounded corners behind logo
        pdf.setFillColor(0, 0, 0);
        pdf.roundedRect(leftMargin - 2, yPos - 2, 44, 16, 2, 2, 'F');
        
        pdf.addImage(imgData as string, 'PNG', leftMargin, yPos, 40, 12);
        
        // Continue with rest of PDF after image is loaded
        completePDF(pdf, pageWidth, leftMargin, rightMargin, contentWidth, yPos + 18);
      };
      
      reader.readAsDataURL(blob);
    } catch (err) {
      safeConsoleError('Error loading logo image', err);
      // Fallback to text if image fails to load
      completePDF(pdf, pageWidth, leftMargin, rightMargin, contentWidth, yPos);
    }
  }

  function completePDF(pdf: any, pageWidth: number, leftMargin: number, rightMargin: number, contentWidth: number, startYPos: number) {
    let yPos = startYPos;

    // Subtitle
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

    // Customer and Vehicle Information (side by side)
    yPos += 10;
    const infoStartY = yPos;
    // Customer Info
    let custY = infoStartY;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Customer Information', leftMargin, custY);
    custY += 7;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Type: ${quotation.customerType === 'b2b' ? 'B2B' : 'B2C'}`, leftMargin, custY);
    custY += 5;
    pdf.text(`Name: ${quotation.customerName || 'N/A'}`, leftMargin, custY);
    if (quotation.customerType === 'b2b' && quotation.companyName) {
      custY += 5;
      pdf.text(`Company: ${quotation.companyName}`, leftMargin, custY);
    }
    if (quotation.customerType === 'b2b' && quotation.contactName) {
      custY += 5;
      pdf.text(`Contact: ${quotation.contactName}`, leftMargin, custY);
    }
    if (quotation.customerEmail) {
      custY += 5;
      pdf.text(`Email: ${quotation.customerEmail}`, leftMargin, custY);
    }
    if (quotation.customerMobile) {
      custY += 5;
      pdf.text(`Mobile: ${quotation.customerMobile}`, leftMargin, custY);
    }

    // Vehicle Info (right side)
    let vehY = infoStartY;
    const vehX = pageWidth / 2 + 5;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Vehicle Information', vehX, vehY);
    vehY += 7;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    // Always prefer bookingVehicles if available, then vehicles, then vehicleDetails array, then single vehicleDetails object
    let vehiclesArr = null;
    if (Array.isArray(bookingVehicles) && bookingVehicles.length > 0) {
      vehiclesArr = bookingVehicles;
    } else if (Array.isArray(quotation.vehicles) && quotation.vehicles.length > 0) {
      vehiclesArr = quotation.vehicles;
    } else if (Array.isArray(quotation.vehicleDetails) && quotation.vehicleDetails.length > 0) {
      vehiclesArr = quotation.vehicleDetails;
    }
    if (vehiclesArr && vehiclesArr.length > 0) {
      vehiclesArr.forEach((veh: any, idx: number) => {
        if (vehY > 260) {
          pdf.addPage();
          vehY = 20;
        }
        pdf.setFont('helvetica', 'bold');
        // Compose plate number with all possible fallbacks
        const plateNumber = veh.vehiclePlate || veh.numberPlate || veh.plate || '';
        pdf.text(`Vehicle ${idx + 1}: ${(veh.vehicleBrand || veh.brand || '') + ' | ' + (veh.modelName || veh.model || '') + ' | ' + plateNumber}`.trim(), vehX, vehY);
        vehY += 5;
        pdf.setFont('helvetica', 'normal');
        
        vehY += 2;
      });
    } else if (quotation.vehicleDetails && Object.values(quotation.vehicleDetails).some(v => v)) {
      const veh = quotation.vehicleDetails;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Vehicle:', vehX, vehY);
      vehY += 5;
      pdf.setFont('helvetica', 'normal');
      if (veh.brand || veh.model) {
        pdf.text(`${veh.brand || ''} ${veh.model || ''}`.trim(), vehX + 5, vehY);
        vehY += 5;
      }
      if (veh.type) {
        pdf.text(`Type: ${veh.type}`, vehX + 5, vehY);
        vehY += 5;
      }
      if (veh.plate) {
        pdf.text(`Plate: ${veh.plate}`, vehX + 5, vehY);
        vehY += 5;
      }
      if (veh.vin) {
        pdf.text(`VIN: ${veh.vin}`, vehX + 5, vehY);
        vehY += 5;
      }
    }
    // Set yPos to the lower of the two sections
    yPos = Math.max(custY, vehY);


  // Service Items Table
  yPos += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Service Details', leftMargin, yPos);

  yPos += 10;

  // Table Header
  pdf.setFillColor(59, 130, 246); // Blue background
  pdf.rect(leftMargin, yPos - 6, contentWidth, 10, 'F');

  pdf.setTextColor(255, 255, 255); // White text
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description', leftMargin + 2, yPos);
  pdf.text('Qty', leftMargin + 105, yPos);
  pdf.text('Rate', leftMargin + 125, yPos);
  pdf.text('Amount', leftMargin + 150, yPos);

  // Table Rows
  yPos += 8;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  const items = quotation.items || [];
  items.forEach((item: any, index: number) => {
    if (yPos > 260) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.text(item.description || 'N/A', leftMargin + 2, yPos);
    pdf.text(String(item.quantity || 0), leftMargin + 105, yPos);
    pdf.text(`AED ${(item.rate || 0).toFixed(2)}`, leftMargin + 125, yPos);
    pdf.text(`AED ${(item.amount || 0).toFixed(2)}`, leftMargin + 150, yPos);
    yPos += 8;
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
    <div className="max-w-5xl mx-auto p-1 sm:p-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 mb-6">
        <button
          onClick={() => router.push('/admin/quotation')}
          className="flex items-center text-gray-600 hover:text-gray-900 text-sm sm:text-base dark:text-gray-300 dark:hover:text-white border border-gray-300 hover:border-gray-400 px-3 sm:px-4 py-2 rounded "
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Quotations
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <PermissionGate module="quotations" action="edit">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          </PermissionGate>

          <PermissionGate module="quotations" action="create">
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-indigo-600 text-white rounded hover:bg-indigo-700 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
          </PermissionGate>

          <PermissionGate module="quotations" action="delete">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Email Status Message */}
      {emailStatus && (
        <div className={`mb-4 p-3 rounded ${emailStatus.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' :
            emailStatus.includes('Sending') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              'bg-red-50 text-red-700 border border-red-200'
          }`}>
          {emailStatus}
        </div>
      )}

      {/* Quotation Content */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-8 rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <div className=" h-16 sm:h-20 ">
                <img 
                  src="/images/Carmantra_Invoice.png" 
                  alt="Carmantra Logo" 
                  className="h-full bg-black object-contain  p-2 rounded"
                />
              </div>
              <p className="text-blue-100">Premium Auto Care Services</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm text-blue-100">Quotation #</div>
              <div className="text-lg sm:text-xl font-bold">{quotation.quotationNumber || 'N/A'}</div>
              <div className="text-sm text-blue-100 mt-2">Date: {formatDate(quotation.createdAt)}</div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${statusColors[quotation.status as keyof typeof statusColors] || statusColors.pending}`}>
                {(quotation.status || 'pending').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {/* Customer & Vehicle Info - Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Customer Information</h3>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <p className="text-md sm:text-lg font-semibold text-gray-900">{quotation.customerName || 'N/A'}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${quotation.customerType === 'b2b' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {quotation.customerType === 'b2b' ? 'B2B' : 'B2C'}
                  </span>
                </div>
                {quotation.customerType === 'b2b' && quotation.companyName && (
                  <p className="text-gray-700 text-xs sm:text-lg">Company: {quotation.companyName}</p>
                )}
                {quotation.customerType === 'b2b' && quotation.contactName && (
                  <p className="text-gray-700 text-xs sm:text-lg">Contact: {quotation.contactName}</p>
                )}
                {quotation.customerEmail && <p className="text-gray-600 break-all text-xs sm:text-lg">Email: {quotation.customerEmail}</p>}
                {quotation.customerMobile && <p className="text-gray-600 text-xs sm:text-lg">Phone: {quotation.customerMobile}</p>}
                {/* <p className="text-gray-600">Source: {sourceLabel}</p> */}
              </div>
            </div>

            {/* Vehicle Information: For B2B, show all vehicles; for B2C, show single vehicleDetails */}
            {quotation.customerType === 'b2b' && ((Array.isArray(quotation.vehicles) && quotation.vehicles.length > 0) || (Array.isArray(bookingVehicles) && bookingVehicles.length > 0)) ? (
              <div className="bg-gray-50 p-2 sm:p-4 rounded-lg space-y-1 sm:space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Vehicle Information</h3>
                  <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    {(quotation.vehicles && quotation.vehicles.length > 0 ? quotation.vehicles.length : (bookingVehicles ? bookingVehicles.length : 0))} vehicle{(quotation.vehicles && quotation.vehicles.length > 1) || (bookingVehicles && bookingVehicles.length > 1) ? 's' : ''} added
                  </span>
                </div>
                <div className="mb-2 text-sm text-gray-700 font-medium">
                  Number of Vehicles: <span className="font-bold">{quotation.vehicles && quotation.vehicles.length > 0 ? quotation.vehicles.length : (bookingVehicles ? bookingVehicles.length : 0)}</span>
                </div>
                <div className="space-y-4">
                  {(quotation.vehicles && quotation.vehicles.length > 0 ? quotation.vehicles : bookingVehicles || []).map((vehicle: any, idx: number) => (
                    <div
                      key={`${vehicle.numberPlate || vehicle.vinNumber || idx}-${idx}`}
                      className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-800">Vehicle {idx + 1}</span>
                        {vehicle.category && (
                          <span className="text-[11px] px-2 py-1 rounded bg-blue-100 text-blue-800">Category: {vehicle.category}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 ">Type:</span>
                          <span className="font-medium dark:text-gray-500">{vehicle.vehicleType || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 ">Brand:</span>
                          <span className="font-medium dark:text-gray-500">{vehicle.vehicleBrand || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 ">Model:</span>
                          <span className="font-medium dark:text-gray-500">{vehicle.modelName || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 ">Number Plate:</span>
                          <span className="font-medium dark:text-gray-500">{vehicle.numberPlate || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 ">Fuel Type:</span>
                          <span className="font-medium dark:text-gray-500">{vehicle.fuelType || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 ">VIN:</span>
                          <span className="font-medium dark:text-gray-500">{vehicle.vinNumber || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              quotation.vehicleDetails && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Vehicle Information</h3>
                  {Array.isArray(quotation.vehicleDetails)
                    ? (
                        <div className="space-y-2">
                          {quotation.vehicleDetails.map((veh: any, idx: number) => (
                            <div key={idx} className="border rounded p-2 bg-gray-50 mb-2">
                              {(veh.brand || veh.model) && (
                                <p className="text-gray-900 font-medium">
                                  {veh.brand} {veh.model}
                                </p>
                              )}
                              {veh.type && <p className="text-gray-600 dark:text-gray-500">Type: {veh.type}</p>}
                              {veh.plate && <p className="text-gray-600 dark:text-gray-500">Plate: {veh.plate}</p>}
                              {veh.vin && <p className="text-gray-600 dark:text-gray-500">VIN: {veh.vin}</p>}
                            </div>
                          ))}
                        </div>
                      )
                    : (
                        Object.values(quotation.vehicleDetails).some((v: any) => v) && (
                          <div className="space-y-2">
                            {(quotation.vehicleDetails.brand || quotation.vehicleDetails.model) && (
                              <p className="text-gray-900 font-medium">
                                {quotation.vehicleDetails.brand} {quotation.vehicleDetails.model}
                              </p>
                            )}
                            {quotation.vehicleDetails.type && <p className="text-gray-600">Type: {quotation.vehicleDetails.type}</p>}
                            {quotation.vehicleDetails.plate && <p className="text-gray-600">Plate: {quotation.vehicleDetails.plate}</p>}
                            {quotation.vehicleDetails.vin && <p className="text-gray-600">VIN: {quotation.vehicleDetails.vin}</p>}
                          </div>
                        )
                      )
                  }
                </div>
              )
            )}
          </div>

          {/* Service Items Table */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Service Details</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full min-w-[500px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                    <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Rate</th>
                    <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(quotation.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">{item.description || 'N/A'}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm text-gray-700">{item.quantity || 0}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm text-gray-700">AED {(item.rate || 0).toFixed(2)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-gray-900">AED {(item.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals - Responsive */}
          <div className="flex flex-col sm:flex-row sm:justify-end mb-8">
            <div className="w-full sm:w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Total:</span>
                <span className="font-medium dark:text-gray-900">AED {(quotation.itemsTotal || 0).toFixed(2)}</span>
              </div>
              {quotation.laborCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Labor Charges:</span>
                  <span className="font-medium dark:text-gray-900">AED {quotation.laborCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium dark:text-gray-900">AED {(quotation.subtotal || 0).toFixed(2)}</span>
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
                <span className='dark:text-gray-900'>Grand Total:</span>
                <span className="text-blue-600">AED {(quotation.total || 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 text-right pt-2">
                Valid for {quotation.validityDays || 30} days
              </div>
            </div>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div className="bg-gray-50 p-4 sm:p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap text-sm break-words">{quotation.notes}</p>
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
                serviceBookingId={quotation?.serviceBookingId}
                vehiclesList={bookingVehicles ?? undefined}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
