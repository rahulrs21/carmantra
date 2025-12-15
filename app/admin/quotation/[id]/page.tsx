"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { jsPDF } from 'jspdf';

export default function QuotationDetails() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const [quotation, setQuotation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'quotations', id));
        if (!snap.exists()) return setQuotation(null);
        setQuotation({ ...(snap.data() as any), id: snap.id });
      } catch (err: any) {
        safeConsoleError('Quotation fetch error', err);
      } finally { setLoading(false); }
    })();
  }, [id]);

  function generatePDF(): string {
    const pdfDoc = new jsPDF();
    pdfDoc.setFontSize(16);
    pdfDoc.text('Quotation', 14, 20);
    pdfDoc.setFontSize(12);
    pdfDoc.text(`Quotation ID: ${quotation?.id || ''}`, 14, 30);
    pdfDoc.text(`Customer: ${quotation?.customerName || ''}`, 14, 38);
    pdfDoc.text(`Email: ${quotation?.customerEmail || ''}`, 14, 46);
    pdfDoc.text(`Service: ${quotation?.service || ''}`, 14, 56);
    pdfDoc.text(`Price: ₹${quotation?.price || 0}`, 14, 64);
    const dataUri = pdfDoc.output('datauristring') as string;
    return dataUri.split(',')[1];
  }

  function downloadPDF() {
    try {
      const pdfDoc = new jsPDF();
      pdfDoc.setFontSize(16);
      pdfDoc.text('Quotation', 14, 20);
      pdfDoc.setFontSize(12);
      pdfDoc.text(`Quotation ID: ${quotation?.id || ''}`, 14, 30);
      pdfDoc.text(`Customer: ${quotation?.customerName || ''}`, 14, 38);
      pdfDoc.text(`Email: ${quotation?.customerEmail || ''}`, 14, 46);
      pdfDoc.text(`Service: ${quotation?.service || ''}`, 14, 56);
      pdfDoc.text(`Price: ₹${quotation?.price || 0}`, 14, 64);
      pdfDoc.save(`quotation-${quotation?.id || 'quotation'}.pdf`);
    } catch (err) {
      safeConsoleError('PDF generation error', err);
      setStatus('Failed to generate PDF');
    }
  }

  async function sendQuotation() {
    if (!quotation?.customerEmail) return setStatus('Quotation has no customer email');
    setStatus('Generating PDF…');
    try {
      const base64 = generatePDF();
      setStatus('Sending email…');
      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Quotation', email: quotation.customerEmail, phone: '', service: 'Quotation', message: `Please find attached quotation ${quotation.id}`, attachment: { name: `quotation-${quotation.id}.pdf`, type: 'application/pdf', data: base64 } }),
      });
      const json = await resp.json();
      if (json?.success) setStatus('Quotation sent'); else setStatus('Failed to send quotation');
    } catch (err) {
      safeConsoleError('Send quotation error', err);
      setStatus('Failed to send quotation');
    }
  }

  async function convertToInvoice() {
    setStatus('Converting to invoice…');
    try {
      const docRef = await addDoc(collection(db, 'invoices'), {
        customerName: quotation.customerName,
        customerEmail: quotation.customerEmail,
        items: [{ description: quotation.service, qty: 1, price: quotation.price }],
        notes: quotation.notes || '',
        total: Number(quotation.price || 0),
        createdAt: serverTimestamp(),
      } as any);
      setStatus('Converted to invoice: ' + docRef.id);
      // Navigate to the new invoice detail
      router.push(`/admin/invoice/${docRef.id}`);
    } catch (err: any) {
      safeConsoleError('Convert error', err);
      setStatus('Failed to convert to invoice');
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!quotation) return <div className="p-6">Quotation not found</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotation {quotation.id}</h1>
          <div className="text-sm text-gray-500">{quotation.customerName} • {quotation.customerEmail}</div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-gray-100 rounded" onClick={() => router.push('/admin/quotation')}>Back</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={downloadPDF}>Download PDF</button>
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={sendQuotation}>Send Quotation</button>
          <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={convertToInvoice}>Convert to Invoice</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold">Service</h3>
        <div className="mt-2">{quotation.service}</div>
        <div className="mt-2 text-right font-bold">Price: ₹{quotation.price}</div>
        {status && <div className="mt-3 text-sm text-gray-600">{status}</div>}
      </div>
    </div>
  );
}

