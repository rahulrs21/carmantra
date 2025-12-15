"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { jsPDF } from 'jspdf';

export default function InvoiceDetails() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'invoices', id));
        if (!snap.exists()) return setInvoice(null);
        setInvoice({ ...(snap.data() as any), id: snap.id });
      } catch (err: any) {
        safeConsoleError('Invoice fetch error', err);
      } finally { setLoading(false); }
    })();
  }, [id]);

  function generatePDF(): string {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Invoice', 14, 20);
    doc.setFontSize(12);
    doc.text(`Invoice ID: ${invoice?.id || ''}`, 14, 30);
    doc.text(`Customer: ${invoice?.customerName || ''}`, 14, 38);
    doc.text(`Email: ${invoice?.customerEmail || ''}`, 14, 46);
    doc.text('Items:', 14, 56);
    let y = 64;
    (invoice?.items || []).forEach((it: any, i: number) => {
      doc.text(`${i+1}. ${it.description} x${it.qty} @ ${it.price}`, 16, y);
      y += 8;
    });
    doc.text(`Total: ₹${invoice?.total || 0}`, 14, y + 8);

    const dataUri = doc.output('datauristring') as string;
    const base64 = dataUri.split(',')[1];
    return base64;
  }

  function downloadPDF() {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Invoice', 14, 20);
      doc.setFontSize(12);
      doc.text(`Invoice ID: ${invoice?.id || ''}`, 14, 30);
      doc.text(`Customer: ${invoice?.customerName || ''}`, 14, 38);
      doc.text(`Email: ${invoice?.customerEmail || ''}`, 14, 46);
      doc.text('Items:', 14, 56);
      let y = 64;
      (invoice?.items || []).forEach((it: any, i: number) => {
        doc.text(`${i+1}. ${it.description} x${it.qty} @ ${it.price}`, 16, y);
        y += 8;
      });
      doc.text(`Total: ₹${invoice?.total || 0}`, 14, y + 8);
      doc.save(`invoice-${invoice?.id || 'invoice'}.pdf`);
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
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoice {invoice.id}</h1>
          <div className="text-sm text-gray-500">{invoice.customerName} • {invoice.customerEmail}</div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-gray-100 rounded" onClick={() => router.push('/admin/invoice')}>Back</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={downloadPDF}>Download PDF</button>
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={sendInvoice}>Send Invoice</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold">Items</h3>
        <ul className="mt-2 list-disc list-inside">
          {(invoice.items || []).map((it: any, i: number) => (
            <li key={i}>{it.description} — {it.qty} × {it.price}</li>
          ))}
        </ul>
        <div className="mt-4 text-right font-bold">Total: ₹{invoice.total}</div>
        {status && <div className="mt-3 text-sm text-gray-600">{status}</div>}
      </div>
    </div>
  );
}
