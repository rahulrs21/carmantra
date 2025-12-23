"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { jsPDF } from 'jspdf';
import InvoiceForm from '@/components/admin/InvoiceForm';
import { PermissionGate } from '@/components/PermissionGate';

export default function InvoiceDetails() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  async function fetchInvoice() {
    if (!id) return;
    try {
      const snap = await getDoc(doc(db, 'invoices', id));
      if (!snap.exists()) return setInvoice(null);
      setInvoice({ ...(snap.data() as any), id: snap.id });
    } catch (err: any) {
      safeConsoleError('Invoice fetch error', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  function generatePDF(): string {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Section with Background
    doc.setFillColor(63, 81, 181); // Indigo color
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 14, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoice?.invoiceNumber || invoice?.id || ''}`, 14, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 35, { align: 'right' });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Bill From, Bill To, and Vehicle in boxes
    let startY = 55;
    const boxWidth = 60;
    const boxHeight = 35;

    // Bill From Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, startY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    doc.text('BILL FROM', 16, startY + 6);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Car Mantra LLC', 16, startY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text('info@carmantra.com', 16, startY + 19);
    doc.text('+971 50 123 4567', 16, startY + 25);

    // Bill To Box
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(78, startY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    doc.text('BILL TO', 80, startY + 6);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    if (invoice?.isB2B) {
      doc.text(invoice?.companyName || '', 80, startY + 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text(invoice?.contactEmail || '', 80, startY + 19);
      doc.text(invoice?.contactPhone || '', 80, startY + 25);
    } else {
      doc.text(invoice?.customerName || '', 80, startY + 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text(invoice?.customerEmail || '', 80, startY + 19);
      doc.text(invoice?.customerMobile || '', 80, startY + 25);
    }

    // Vehicle Box - B2B or B2C
    if (invoice?.isB2B && invoice?.vehicles && Array.isArray(invoice.vehicles) && invoice.vehicles.length > 0) {
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(142, startY, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 114, 128);
      doc.text(`VEHICLES (${invoice.vehicles.length})`, 144, startY + 6);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      let vehicleY = startY + 13;
      invoice.vehicles.slice(0, 2).forEach((vehicle: any) => {
        const vehicleName = `${vehicle.vehicleBrand || vehicle.brand || ''} ${vehicle.modelName || vehicle.model || ''}`;
        doc.text(vehicleName, 144, vehicleY);
        doc.setTextColor(75, 85, 99);
        doc.text(`${vehicle.numberPlate || vehicle.plate || ''}`, 144, vehicleY + 4);
        doc.setTextColor(0, 0, 0);
        vehicleY += 8;
      });
    } else if (invoice?.vehicleDetails) {
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(142, startY, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 114, 128);
      doc.text('VEHICLE', 144, startY + 6);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const vehicleName = `${invoice.vehicleDetails.brand || ''} ${invoice.vehicleDetails.model || ''}`;
      doc.text(vehicleName, 144, startY + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text(`Type: ${invoice.vehicleDetails.type || ''}`, 144, startY + 19);
      doc.text(`Plate: ${invoice.vehicleDetails.plate || ''}`, 144, startY + 25);
      if (invoice.vehicleDetails.vin) {
        doc.text(`VIN: ${invoice.vehicleDetails.vin}`, 144, startY + 31);
      }
    }

    // Service Category Banner
    let currentY = startY + boxHeight + 10;
    if (invoice?.serviceCategory) {
      doc.setFillColor(239, 246, 255);
      doc.rect(14, currentY, pageWidth - 28, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(`Service: ${invoice.serviceCategory}`, 16, currentY + 5.5);
      currentY += 10;
    }

    // Service Items Table
    currentY += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('SERVICE ITEMS', 14, currentY);
    currentY += 7;

    // Table Header
    doc.setFillColor(249, 250, 251);
    doc.rect(14, currentY, pageWidth - 28, 8, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.line(14, currentY + 8, pageWidth - 14, currentY + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text('#', 16, currentY + 5.5);
    doc.text('DESCRIPTION', 25, currentY + 5.5);
    doc.text('QTY', 130, currentY + 5.5, { align: 'right' });
    doc.text('RATE', 155, currentY + 5.5, { align: 'right' });
    doc.text('AMOUNT', pageWidth - 16, currentY + 5.5, { align: 'right' });

    currentY += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    (invoice?.items || []).forEach((it: any, i: number) => {
      const desc = it.description || '';
      const qty = it.quantity || 1;
      const rate = it.rate || 0;
      const amt = it.amount || 0;

      // Alternate row background
      if (i % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, currentY, pageWidth - 28, 7, 'F');
      }

      doc.text(`${i + 1}`, 16, currentY + 5);
      doc.text(desc, 25, currentY + 5);
      doc.text(`${qty}`, 130, currentY + 5, { align: 'right' });
      doc.text(`AED ${rate.toFixed(2)}`, 155, currentY + 5, { align: 'right' });
      doc.text(`AED ${amt.toFixed(2)}`, pageWidth - 16, currentY + 5, { align: 'right' });

      doc.setDrawColor(229, 231, 235);
      doc.line(14, currentY + 7, pageWidth - 14, currentY + 7);
      currentY += 7;
    });

    // Labor Charges Row
    if (invoice?.laborCharges > 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(14, currentY, pageWidth - 28, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Labor Charges', 25, currentY + 5);
      doc.text(`AED ${invoice.laborCharges.toFixed(2)}`, pageWidth - 16, currentY + 5, { align: 'right' });
      doc.line(14, currentY + 7, pageWidth - 14, currentY + 7);
      currentY += 7;
    }

    currentY += 5;

    // Totals Section
    const totalsX = pageWidth - 70;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);

    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`AED ${(invoice?.subtotal || 0).toFixed(2)}`, pageWidth - 16, currentY, { align: 'right' });
    currentY += 6;

    doc.text('Tax (5% VAT):', totalsX, currentY);
    doc.setTextColor(59, 130, 246);
    doc.text(`AED ${(invoice?.taxAmount || 0).toFixed(2)}`, pageWidth - 16, currentY, { align: 'right' });
    currentY += 6;

    if (invoice?.discount > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text('Discount:', totalsX, currentY);
      doc.text(`- AED ${invoice.discount.toFixed(2)}`, pageWidth - 16, currentY, { align: 'right' });
      currentY += 6;
    }

    // Grand Total
    currentY += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(totalsX, currentY, pageWidth - 16, currentY);
    currentY += 6;

    doc.setFillColor(239, 246, 255);
    doc.rect(totalsX, currentY - 5, pageWidth - totalsX - 16, 10, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('GRAND TOTAL:', totalsX + 2, currentY + 2);
    doc.setTextColor(59, 130, 246);
    doc.text(`AED ${(invoice?.total || 0).toFixed(2)}`, pageWidth - 20, currentY + 2, { align: 'right' });

    // Payment Status
    currentY += 15;
    doc.setFillColor(249, 250, 251);
    doc.rect(14, currentY, pageWidth - 28, 10, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Payment Status:', 16, currentY + 6.5);

    const statusText = (invoice?.paymentStatus || 'UNPAID').toUpperCase();
    const statusColor = invoice?.paymentStatus === 'paid' ? [34, 197, 94] : [239, 68, 68];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(statusText, pageWidth - 16, currentY + 6.5, { align: 'right' });

    currentY += 12;

    // Payment Terms
    if (invoice?.paymentTerms) {
      doc.setFillColor(239, 246, 255);
      doc.rect(14, currentY, pageWidth - 28, 10, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Payment Terms:', 16, currentY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 64, 175);
      let termsText = '';
      if (invoice.paymentTerms === 'card') termsText = 'Credit/Debit Card';
      else if (invoice.paymentTerms === 'cash') termsText = 'Cash on Delivery';
      else if (invoice.paymentTerms === 'bank') termsText = 'Bank Transfer';
      else if (invoice.paymentTerms === 'tabby') termsText = 'Tabby/Tamara';
      else if (invoice.paymentTerms === 'other') termsText = invoice.paymentTermsOther || 'Other';
      doc.text(termsText, pageWidth - 16, currentY + 6.5, { align: 'right' });

      currentY += 12;
    }

    // Partial Payment Information
    if (invoice?.paymentStatus === 'partial' && invoice?.partialPaidAmount) {
      const paid = typeof invoice.partialPaidAmount === 'string' ? parseFloat(invoice.partialPaidAmount) : invoice.partialPaidAmount;
      const total = typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total;
      const remaining = total - paid;

      doc.setFillColor(254, 243, 224);
      doc.rect(14, currentY, pageWidth - 28, 16, 'F');
      doc.setDrawColor(251, 191, 36);
      doc.rect(14, currentY, pageWidth - 28, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 53, 15);
      doc.text('Partial Payment Information:', 16, currentY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Amount Paid: AED ${paid.toFixed(2)}`, 16, currentY + 10);
      doc.text(`Remaining Balance: AED ${remaining.toFixed(2)}`, pageWidth - 16, currentY + 10, { align: 'right' });

      currentY += 18;
    }

    // Notes Section
    if (invoice?.notes) {
      doc.setFillColor(254, 252, 232);
      doc.rect(14, currentY, pageWidth - 28, 16, 'F');
      doc.setDrawColor(217, 119, 6);
      doc.rect(14, currentY, pageWidth - 28, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(92, 51, 23);
      doc.text('Notes:', 16, currentY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 32);
      doc.text(notesLines, 16, currentY + 10);

      currentY += Math.max(18, notesLines.length * 3.5 + 6);
    }

    // Stamp Image
    currentY += 8;
    const stampSize = 30;
    const stampX = pageWidth - stampSize - 14;

    const stampImg = new Image();
    stampImg.src = '/images/sample-stamp.png';
    try {
      doc.addImage(stampImg, 'PNG', stampX, currentY, stampSize, stampSize);
    } catch (e) {
      // If image fails, just continue without it
    }

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(107, 114, 128);
    doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' });

    const dataUri = doc.output('datauristring') as string;
    const base64 = dataUri.split(',')[1];
    return base64;
  }

  function downloadPDF() {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header Section with Background
      doc.setFillColor(59, 130, 246); // Blue-500 color
      doc.rect(0, 0, pageWidth, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 14, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice #: ${invoice?.invoiceNumber || invoice?.id || ''}`, 14, 35);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 35, { align: 'right' });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Bill From, Bill To, and Vehicle in boxes
      let startY = 55;
      const boxWidth = 60;
      const boxHeight = 35;

      // Bill From Box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(14, startY, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 114, 128);
      doc.text('BILL FROM', 16, startY + 6);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Car Mantra LLC', 16, startY + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text('info@carmantra.com', 16, startY + 19);
      doc.text('+971 50 123 4567', 16, startY + 25);

      // Bill To Box
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(78, startY, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 114, 128);
      doc.text('BILL TO', 80, startY + 6);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      if (invoice?.isB2B) {
        doc.text(invoice?.companyName || '', 80, startY + 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.text(invoice?.contactEmail || '', 80, startY + 19);
        doc.text(invoice?.contactPhone || '', 80, startY + 25);
      } else {
        doc.text(invoice?.customerName || '', 80, startY + 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.text(invoice?.customerEmail || '', 80, startY + 19);
        doc.text(invoice?.customerMobile || '', 80, startY + 25);
      }

      // Vehicle Box - B2B or B2C
      if (invoice?.isB2B && invoice?.vehicles && Array.isArray(invoice.vehicles) && invoice.vehicles.length > 0) {
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(142, startY, boxWidth, boxHeight, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(107, 114, 128);
        doc.text(`VEHICLES (${invoice.vehicles.length})`, 144, startY + 6);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        let vehicleY = startY + 13;
        invoice.vehicles.slice(0, 2).forEach((vehicle: any) => {
          // const vehicleName = `${vehicle.vehicleBrand || vehicle.brand || ''} ${vehicle.modelName || vehicle.model || ''}`;
          // doc.text(vehicleName, 144, vehicleY);
          // doc.setTextColor(75, 85, 99);
          // doc.text(`${vehicle.numberPlate || vehicle.plate || ''}`, 144, vehicleY + 4);
          // doc.setTextColor(0, 0, 0);
          // vehicleY += 8;

          const vehicleName = `${vehicle.vehicleBrand || vehicle.brand || ''} ${vehicle.modelName || vehicle.model || ''}`;
          const vehiclePlate = vehicle.numberPlate || vehicle.plate || '';
          doc.setTextColor(0, 0, 0);
          doc.text(`${vehicleName} | ${vehiclePlate}`, 144, vehicleY);
          vehicleY += 5;
        });
      } else if (invoice?.vehicleDetails) {
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(142, startY, boxWidth, boxHeight, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(107, 114, 128);
        doc.text('VEHICLE', 144, startY + 6);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const vehicleName = `${invoice.vehicleDetails.brand || ''} ${invoice.vehicleDetails.model || ''}`;
        doc.text(vehicleName, 144, startY + 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.text(`Type: ${invoice.vehicleDetails.type || ''}`, 144, startY + 19);
        doc.text(`Plate: ${invoice.vehicleDetails.plate || ''}`, 144, startY + 25);
        if (invoice.vehicleDetails.vin) {
          doc.text(`VIN: ${invoice.vehicleDetails.vin}`, 144, startY + 31);
        }
      }

      // Service Category Banner
      let currentY = startY + boxHeight + 10;
      if (invoice?.serviceCategory) {
        doc.setFillColor(239, 246, 255);
        doc.rect(14, currentY, pageWidth - 28, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text(`Service: ${invoice.serviceCategory}`, 16, currentY + 5.5);
        currentY += 10;
      }

      // Service Items Table
      currentY += 5;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('SERVICE ITEMS', 14, currentY);
      currentY += 7;

      // Table Header
      doc.setFillColor(249, 250, 251);
      doc.rect(14, currentY, pageWidth - 28, 8, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.line(14, currentY + 8, pageWidth - 14, currentY + 8);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(75, 85, 99);
      doc.text('#', 16, currentY + 5.5);
      doc.text('DESCRIPTION', 25, currentY + 5.5);
      doc.text('QTY', 130, currentY + 5.5, { align: 'right' });
      doc.text('RATE', 155, currentY + 5.5, { align: 'right' });
      doc.text('AMOUNT', pageWidth - 16, currentY + 5.5, { align: 'right' });

      currentY += 8;

      // Table Rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      (invoice?.items || []).forEach((it: any, i: number) => {
        const desc = it.description || '';
        const qty = it.quantity || 1;
        const rate = it.rate || 0;
        const amt = it.amount || 0;

        // Alternate row background
        if (i % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(14, currentY, pageWidth - 28, 7, 'F');
        }

        doc.text(`${i + 1}`, 16, currentY + 5);
        doc.text(desc, 25, currentY + 5);
        doc.text(`${qty}`, 130, currentY + 5, { align: 'right' });
        doc.text(`AED ${rate.toFixed(2)}`, 155, currentY + 5, { align: 'right' });
        doc.text(`AED ${amt.toFixed(2)}`, pageWidth - 16, currentY + 5, { align: 'right' });

        doc.setDrawColor(229, 231, 235);
        doc.line(14, currentY + 7, pageWidth - 14, currentY + 7);
        currentY += 7;
      });

      // Labor Charges Row
      if (invoice?.laborCharges > 0) {
        doc.setFillColor(252, 252, 253);
        doc.rect(14, currentY, pageWidth - 28, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Labor Charges', 25, currentY + 5);
        doc.text(`AED ${invoice.laborCharges.toFixed(2)}`, pageWidth - 16, currentY + 5, { align: 'right' });
        doc.line(14, currentY + 7, pageWidth - 14, currentY + 7);
        currentY += 7;
      }

      currentY += 5;

      // Totals Section
      const totalsX = pageWidth - 70;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);

      doc.text('Subtotal:', totalsX, currentY);
      doc.text(`AED ${(invoice?.subtotal || 0).toFixed(2)}`, pageWidth - 16, currentY, { align: 'right' });
      currentY += 6;

      doc.text('Tax (5% VAT):', totalsX, currentY);
      doc.setTextColor(59, 130, 246);
      doc.text(`AED ${(invoice?.taxAmount || 0).toFixed(2)}`, pageWidth - 16, currentY, { align: 'right' });
      currentY += 6;

      if (invoice?.discount > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text('Discount:', totalsX, currentY);
        doc.text(`- AED ${invoice.discount.toFixed(2)}`, pageWidth - 16, currentY, { align: 'right' });
        currentY += 6;
      }

      // Grand Total
      currentY += 2;
      doc.setDrawColor(229, 231, 235);
      doc.line(totalsX - 2, currentY, pageWidth - 16, currentY);
      currentY += 6;

      doc.setFillColor(239, 246, 255);
      doc.rect(totalsX, currentY - 5, pageWidth - totalsX - 16, 10, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('GRAND TOTAL:', totalsX - 2, currentY + 2);
      doc.setTextColor(59, 130, 246);
      doc.text(' ', totalsX - 2, currentY + 2);
      doc.text(`AED ${(invoice?.total || 0).toFixed(2)}`, pageWidth - 20, currentY + 2, { align: 'right' });

      // Payment Status
      currentY += 15;
      doc.setFillColor(249, 250, 251);
      doc.rect(14, currentY, pageWidth - 28, 10, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Payment Status:', 16, currentY + 6.5);

      const statusText = (invoice?.paymentStatus || 'UNPAID').toUpperCase();
      const statusColor = invoice?.paymentStatus === 'paid' ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(statusText, pageWidth - 16, currentY + 6.5, { align: 'right' });

      currentY += 12;

      // Payment Terms
      if (invoice?.paymentTerms) {
        doc.setFillColor(239, 246, 255);
        doc.rect(14, currentY, pageWidth - 28, 10, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Payment Terms:', 16, currentY + 6.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 64, 175);
        let termsText = '';
        if (invoice.paymentTerms === 'card') termsText = 'Credit/Debit Card';
        else if (invoice.paymentTerms === 'cash') termsText = 'Cash on Delivery';
        else if (invoice.paymentTerms === 'bank') termsText = 'Bank Transfer';
        else if (invoice.paymentTerms === 'tabby') termsText = 'Tabby/Tamara';
        else if (invoice.paymentTerms === 'other') termsText = invoice.paymentTermsOther || 'Other';
        doc.text(termsText, pageWidth - 16, currentY + 6.5, { align: 'right' });

        currentY += 12;
      }

      // Partial Payment Information
      if (invoice?.paymentStatus === 'partial' && invoice?.partialPaidAmount) {
        const paid = typeof invoice.partialPaidAmount === 'string' ? parseFloat(invoice.partialPaidAmount) : invoice.partialPaidAmount;
        const total = typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total;
        const remaining = total - paid;

        doc.setFillColor(254, 243, 224);
        doc.rect(14, currentY, pageWidth - 28, 16, 'F');
        doc.setDrawColor(251, 191, 36);
        doc.rect(14, currentY, pageWidth - 28, 16);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(120, 53, 15);
        doc.text('Partial Payment Information:', 16, currentY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Amount Paid: AED ${paid.toFixed(2)}`, 16, currentY + 10);
        doc.text(`Remaining Balance: AED ${remaining.toFixed(2)}`, pageWidth - 16, currentY + 10, { align: 'right' });

        currentY += 18;
      }

      // Notes Section
      if (invoice?.notes) {
        doc.setFillColor(254, 252, 232);
        doc.rect(14, currentY, pageWidth - 28, 16, 'F');
        doc.setDrawColor(217, 119, 6);
        doc.rect(14, currentY, pageWidth - 28, 16);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(92, 51, 23);
        doc.text('Notes:', 16, currentY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 32);
        doc.text(notesLines, 16, currentY + 10);

        currentY += Math.max(18, notesLines.length * 3.5 + 6);
      }

      // Stamp Image
      currentY += 8;
      const stampSize = 30;
      const stampX = pageWidth - stampSize - 14;

      const stampImg = new Image();
      stampImg.src = '/images/sample-stamp.png';
      try {
        doc.addImage(stampImg, 'PNG', stampX, currentY, stampSize, stampSize);
      } catch (e) {
        // If image fails, just continue without it
      }

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(107, 114, 128);
      doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' });

      doc.save(`invoice-${invoice?.invoiceNumber || invoice?.id || 'invoice'}.pdf`);
    } catch (err) {
      safeConsoleError('PDF generation error', err);
      setStatus('Failed to generate PDF');
    }
  }

  async function sendInvoice() {
    if (!invoice?.customerEmail) return setStatus('Invoice has no customer email');
    setStatus('Generating PDF…');
    try {
      const base64 = generatePDF();
      setStatus('Sending email…');
      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Invoice', email: invoice.customerEmail, phone: '', service: 'Invoice', message: `Please find attached invoice ${invoice.id}`, attachment: { name: `invoice-${invoice.id}.pdf`, type: 'application/pdf', data: base64 } }),
      });
      const json = await resp.json();
      if (json?.success) setStatus('Invoice sent'); else setStatus('Failed to send invoice');
    } catch (err) {
      safeConsoleError('Send invoice error', err);
      setStatus('Failed to send invoice');
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!invoice) return <div className="p-6">Invoice not found</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice #{invoice.invoiceNumber || invoice.id}</h1>
          <div className="text-sm text-gray-500 mt-1">
            {invoice.customerName} • {invoice.customerMobile}
          </div>
        </div>

        {/* Partial Payment Notes (if any) */}
        {invoice.paymentStatus === 'partial' && invoice.partialPaymentNotes && (
          <div className="px-5 sm:px-8 pb-8">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-2">
              <div className="text-xs font-semibold text-yellow-900 mb-1">Partial Payment Notes:</div>
              <div className="text-sm text-yellow-900 whitespace-pre-line">{invoice.partialPaymentNotes}</div>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium transition-colors w-full sm:w-auto" onClick={() => router.push('/admin/invoice')}>
            ← Back
          </button>
          <PermissionGate module="invoices" action="edit">
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors w-full sm:w-auto" onClick={() => setShowEditModal(true)}>
              ✏️ Edit Invoice
            </button>
          </PermissionGate>
          <PermissionGate module="invoices" action="create">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors w-full sm:w-auto" onClick={downloadPDF}>
              📥 Download PDF
            </button>
          </PermissionGate>
          <PermissionGate module="invoices" action="create">
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors w-full sm:w-auto" onClick={sendInvoice}>
              📧 Send Invoice
            </button>
          </PermissionGate>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-lg ${status.includes('sent') || status.includes('success')
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
          {status}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-5 sm:p-8 rounded-t-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">INVOICE</h2>
              <p className="text-blue-100">Invoice #: {invoice.invoiceNumber || invoice.id}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-blue-100">Date:</p>
              <p className="font-semibold">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Information */}
        <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-3 bg-gray-50">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Bill From</h3>
            <div className="space-y-1">
              <p className="font-semibold text-lg">Car Mantra LLC</p>
              <p className="text-gray-600">info@carmantra.com</p>
              <p className="text-gray-600">+971 50 123 4567</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Bill To</h3>
            <div className="space-y-1">
              {invoice.isB2B ? (
                <>
                  <p className="font-semibold text-lg">{invoice.companyName || 'N/A'}</p>
                  {invoice.contactName && <p className="text-gray-600">{invoice.contactName}</p>}
                  {invoice.contactEmail && <p className="text-gray-600">{invoice.contactEmail}</p>}
                  {invoice.contactPhone && <p className="text-gray-600">{invoice.contactPhone}</p>}
                </>
              ) : (
                <>
                  <p className="font-semibold text-lg">{invoice.customerName}</p>
                  {invoice.customerEmail && <p className="text-gray-600">{invoice.customerEmail}</p>}
                  {invoice.customerMobile && <p className="text-gray-600">{invoice.customerMobile}</p>}
                </>
              )}
            </div>
          </div>

          {invoice.isB2B && invoice.vehicles && Array.isArray(invoice.vehicles) && invoice.vehicles.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Vehicles ({invoice.vehicles.length})</h3>
              <div className="space-y-2">
                {invoice.vehicles.map((vehicle: any, idx: number) => (
                  <div key={idx} className="text-sm flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {vehicle.vehicleBrand || vehicle.brand || ''} {vehicle.modelName || vehicle.model || ''}
                    </p>
                    <p className="text-gray-600 text-xs">{vehicle.numberPlate || vehicle.plate || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : invoice.vehicleDetails ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Vehicle Details</h3>
              <div className="space-y-1">
                <p className="font-semibold text-lg">
                  {invoice.vehicleDetails.brand} {invoice.vehicleDetails.model}
                </p>
                {invoice.vehicleDetails.type && (
                  <p className="text-gray-600">Type: {invoice.vehicleDetails.type}</p>
                )}
                {invoice.vehicleDetails.plate && (
                  <p className="text-gray-600">Plate: {invoice.vehicleDetails.plate}</p>
                )}
                {invoice.vehicleDetails.vin && (
                  <p className="text-gray-600">VIN: {invoice.vehicleDetails.vin}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Service Category */}
        {invoice.serviceCategory && (
          <div className="px-8 py-3 bg-blue-50 border-y border-blue-100">
            <p className="text-sm text-gray-600">
              Service: <span className="font-semibold text-gray-900">{invoice.serviceCategory}</span>
            </p>
          </div>
        )}

        {/* Service Items Table */}
        <div className="p-5 sm:p-8">
          <h3 className="text-lg font-semibold mb-4">Service Items</h3>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {(invoice.items || []).map((it: any, i: number) => (
              <div key={i} className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-gray-700">Item {i + 1}</div>
                  <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">AED {(it.amount || 0).toFixed(2)}</div>
                </div>
                <div className="mt-2 text-sm font-medium text-gray-900 break-words leading-snug">{it.description || '—'}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <div className="text-gray-500">Qty</div>
                    <div className="font-semibold">{it.quantity || 1}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Rate</div>
                    <div className="font-semibold">AED {(it.rate || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
            {(!invoice.items || invoice.items.length === 0) && (
              <div className="text-sm text-gray-500">No items added</div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">#</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Description</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Rate</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((it: any, i: number) => (
                  <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-2 text-gray-600">{i + 1}</td>
                    <td className="py-3 px-2">{it.description}</td>
                    <td className="py-3 px-2 text-right">{it.quantity || 1}</td>
                    <td className="py-3 px-2 text-right">AED {(it.rate || 0).toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-medium">AED {(it.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="px-5 sm:px-8 pb-8">
          <div className="flex justify-end">
            <div className="w-full md:w-1/2 lg:w-1/3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Total:</span>
                <span className="font-medium">AED {(invoice.itemsTotal || 0).toFixed(2)}</span>
              </div>

              {invoice.laborCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Labor Charges:</span>
                  <span className="font-medium">AED {invoice.laborCharges.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">AED {(invoice.subtotal || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (5% VAT):</span>
                <span className="font-medium text-blue-600">AED {(invoice.taxAmount || 0).toFixed(2)}</span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">- AED {invoice.discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-300">
                <span>Grand Total:</span>
                <span className="text-blue-600">AED {(invoice.total || 0).toFixed(2)}</span>
              </div>

              {/* Partial Payment Info */}
              {invoice.paymentStatus === 'partial' && (() => {
                // Defensive: handle string/number/null/undefined for partialPaidAmount and total
                let paid = 0;
                let total = 0;
                if (invoice.partialPaidAmount !== undefined && invoice.partialPaidAmount !== null && invoice.partialPaidAmount !== '') {
                  paid = typeof invoice.partialPaidAmount === 'string' ? parseFloat(invoice.partialPaidAmount) : invoice.partialPaidAmount;
                  if (isNaN(paid)) paid = 0;
                }
                if (invoice.total !== undefined && invoice.total !== null && invoice.total !== '') {
                  total = typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total;
                  if (isNaN(total)) total = 0;
                }
                return (
                  <div className="mt-2 p-3 rounded bg-yellow-50 border border-yellow-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-800 font-semibold">Partial Amount Paid:</span>
                      <span className="text-yellow-900 font-bold">AED {paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-orange-700 font-semibold">Remaining Balance:</span>
                      <span className="text-orange-800 font-bold">AED {(total - paid).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
              {/* General Notes (if any) */}
              {invoice.notes && (
                <div className="mt-4 px-0 sm:px-0 pb-0">
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="text-xs font-semibold text-yellow-900 mb-1">Notes:</div>
                    <div className="text-sm text-yellow-900 whitespace-pre-line">{invoice.notes}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accepted Stamp */}
        <div className="px-5 sm:px-8 pb-2 flex justify-center">
          <img
            src="/images/sample-stamp.png"
            alt="Accepted Stamp"
            className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
          />
        </div>

        {/* Payment Status & Terms */}
        <div className="px-5 sm:px-8 pb-8 space-y-3">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Payment Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${invoice.paymentStatus === 'paid'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}>
                {invoice.paymentStatus?.toUpperCase() || 'UNPAID'}
              </span>
            </div>
          </div>

          {invoice.paymentTerms && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Payment Terms:</span>
                <span className="text-sm font-semibold text-blue-800">
                  {invoice.paymentTerms === 'card' && 'Credit/Debit Card'}
                  {invoice.paymentTerms === 'cash' && 'Cash on Delivery'}
                  {invoice.paymentTerms === 'bank' && 'Bank Transfer'}
                  {invoice.paymentTerms === 'tabby' && 'Tabby/Tamara'}
                  {invoice.paymentTerms === 'other' && (invoice.paymentTermsOther || 'Other')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Invoice Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowEditModal(false)} />
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit Invoice</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowEditModal(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <InvoiceForm
                invoice={invoice}
                onCreated={() => {
                  setShowEditModal(false);
                  fetchInvoice();
                  setStatus('Invoice updated successfully!');
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
