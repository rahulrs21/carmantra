"use client";

import { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';

interface Item { description: string; quantity: number; rate: number; amount: number }

export default function InvoiceForm({ 
  invoice, 
  onCreated, 
  onCancel 
}: { 
  invoice?: any; 
  onCreated?: (id: string) => void; 
  onCancel?: () => void; 
}) {
  const [customerType, setCustomerType] = useState<'b2c' | 'b2b'>('b2c');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [laborCharges, setLaborCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paymentTerms, setPaymentTerms] = useState('cash');
  const [paymentTermsOther, setPaymentTermsOther] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (invoice) {
      setCustomerType(invoice.customerType === 'b2b' ? 'b2b' : 'b2c');
      setCompanyName(invoice.companyName || '');
      setContactName(invoice.contactName || '');
      setContactEmail(invoice.contactEmail || '');
      setContactMobile(invoice.contactPhone || invoice.customerMobile || '');
      setCustomerName(invoice.customerName || '');
      setCustomerEmail(invoice.customerEmail || '');
      setCustomerMobile(invoice.customerMobile || '');
      setVehicleType(invoice.vehicleDetails?.type || '');
      setVehicleBrand(invoice.vehicleDetails?.brand || '');
      setVehicleModel(invoice.vehicleDetails?.model || '');
      setVehiclePlate(invoice.vehicleDetails?.plate || '');
      setVehicleVin(invoice.vehicleDetails?.vin || '');
      setServiceCategory(invoice.serviceCategory || '');
      
      // Ensure items always have valid values
      const invoiceItems = invoice.items || [{ description: '', quantity: 1, rate: 0, amount: 0 }];
      setItems(invoiceItems.map((item: any) => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        amount: item.amount || 0
      })));
      
      setLaborCharges(invoice.laborCharges || 0);
      setDiscount(invoice.discount || 0);
      setPaymentStatus(invoice.paymentStatus || 'unpaid');
      setPaymentTerms(invoice.paymentTerms || 'cash');
      setPaymentTermsOther(invoice.paymentTermsOther || '');
    }
  }, [invoice]);

  function calculateTotals() {
    const itemsTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const subtotal = itemsTotal + laborCharges;
    const tax = subtotal * 0.05; // 5% VAT
    const grandTotal = subtotal + tax - discount;
    
    return {
      itemsTotal,
      subtotal,
      tax,
      grandTotal: Math.max(0, grandTotal)
    };
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setMessage(null);
    
    if (customerType === 'b2b') {
      if (!companyName) return setMessage('Enter company name');
      if (!contactName) return setMessage('Enter contact person');
    } else {
      if (!customerName) return setMessage('Enter customer name');
    }
    
    const hasEmptyItems = items.some(item => !item.description || item.rate === 0);
    if (hasEmptyItems) {
      return setMessage('Please fill all service items with description and rate');
    }
    
    setLoading(true);
    
    const totals = calculateTotals();
    
    try {
      const normalizedCustomerName = customerType === 'b2b'
        ? (companyName || contactName || customerName)
        : customerName;
      const normalizedEmail = customerType === 'b2b' ? (contactEmail || customerEmail) : customerEmail;
      const normalizedMobile = customerType === 'b2b' ? (contactMobile || customerMobile) : customerMobile;

      const invoiceData = {
        customerType,
        companyName,
        contactName,
        contactEmail,
        contactPhone: contactMobile,
        customerName: normalizedCustomerName,
        customerEmail: normalizedEmail,
        customerMobile: normalizedMobile,
        vehicleDetails: {
          type: vehicleType,
          brand: vehicleBrand,
          model: vehicleModel,
          plate: vehiclePlate,
          vin: vehicleVin,
        },
        serviceCategory,
        items,
        laborCharges,
        itemsTotal: totals.itemsTotal,
        subtotal: totals.subtotal,
        taxRate: 5,
        taxAmount: totals.tax,
        discount,
        total: totals.grandTotal,
        paymentStatus,
        paymentTerms,
        paymentTermsOther: paymentTerms === 'other' ? paymentTermsOther : '',
        updatedAt: Timestamp.now(),
      };

      if (invoice?.id) {
        // Update existing invoice
        await updateDoc(doc(db, 'invoices', invoice.id), invoiceData);
        setMessage('Invoice updated successfully');
        if (onCreated) onCreated(invoice.id);
      } else {
        // Create new invoice
        const invoiceNumber = `INV-${Date.now()}`;
        const docRef = await addDoc(collection(db, 'invoices'), {
          ...invoiceData,
          invoiceNumber,
          createdAt: Timestamp.now(),
        });
        setMessage(`Invoice created: ${docRef.id}`);
        
        // Reset form
        setCustomerType('b2c');
        setCompanyName('');
        setContactName('');
        setContactEmail('');
        setContactMobile('');
        setCustomerName(''); 
        setCustomerEmail(''); 
        setCustomerMobile('');
        setVehicleType('');
        setVehicleBrand('');
        setVehicleModel('');
        setVehiclePlate('');
        setVehicleVin('');
        setServiceCategory('');
        setItems([{ description: '', quantity: 1, rate: 0, amount: 0 }]); 
        setLaborCharges(0);
        setDiscount(0);
        setPaymentStatus('unpaid');
        setPaymentTerms('cash');
        setPaymentTermsOther('');
        
        if (onCreated) onCreated(docRef.id);
      }
    } catch (err) {
      safeConsoleError('Submit invoice error', err);
      setMessage(invoice?.id ? 'Failed to update invoice' : 'Failed to create invoice');
    } finally { 
      setLoading(false); 
    }
  }

  function updateItem(idx: number, field: string, value: any) {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      
      // Auto-calculate amount
      if (field === 'quantity' || field === 'rate') {
        updated[idx].amount = (updated[idx].quantity || 0) * (updated[idx].rate || 0);
      }
      
      return updated;
    });
  }

  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  }

  function removeItem(idx: number) {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== idx));
    }
  }

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className={`p-3 rounded text-sm ${
          message.includes('success') || message.includes('created') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Customer Information */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div>
            <h3 className="font-semibold text-gray-900">Customer Information</h3>
            <p className="text-xs text-gray-500">Switch B2C/B2B and fill the relevant fields</p>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className={`px-3 py-1 rounded border ${customerType === 'b2c' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700'}`}
              onClick={() => setCustomerType('b2c')}
            >
              B2C
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded border ${customerType === 'b2b' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
              onClick={() => setCustomerType('b2b')}
            >
              B2B
            </button>
          </div>
        </div>

        {customerType === 'b2b' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                className="w-full border border-gray-300 p-2 rounded"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
              <input
                className="w-full border border-gray-300 p-2 rounded"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="Enter contact person"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Mobile</label>
              <input
                className="w-full border border-gray-300 p-2 rounded"
                value={contactMobile}
                onChange={e => setContactMobile(e.target.value)}
                placeholder="e.g., +971 50 123 4567"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 p-2 rounded"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="contact@company.com"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input 
                className="w-full border border-gray-300 p-2 rounded" 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)} 
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
              <input 
                className="w-full border border-gray-300 p-2 rounded" 
                value={customerMobile} 
                onChange={e => setCustomerMobile(e.target.value)}
                placeholder="Enter mobile number"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email"
                className="w-full border border-gray-300 p-2 rounded" 
                value={customerEmail} 
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Details */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-gray-900 mb-3">Vehicle Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
            <select
              className="w-full border border-gray-300 p-2 rounded"
              value={vehicleType}
              onChange={e => setVehicleType(e.target.value)}
            >
              <option value="">Select Type</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="hatchback">Hatchback</option>
              <option value="coupe">Coupe</option>
              <option value="truck">Truck</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input 
              className="w-full border border-gray-300 p-2 rounded" 
              value={vehicleBrand} 
              onChange={e => setVehicleBrand(e.target.value)}
              placeholder="e.g., Toyota"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input 
              className="w-full border border-gray-300 p-2 rounded" 
              value={vehicleModel} 
              onChange={e => setVehicleModel(e.target.value)}
              placeholder="e.g., Camry"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
            <input 
              className="w-full border border-gray-300 p-2 rounded" 
              value={vehiclePlate} 
              onChange={e => setVehiclePlate(e.target.value)}
              placeholder="e.g., ABC-1234"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN (optional)</label>
            <input
              className="w-full border border-gray-300 p-2 rounded"
              value={vehicleVin}
              onChange={e => setVehicleVin(e.target.value)}
              placeholder="Enter VIN"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
            <input 
              className="w-full border border-gray-300 p-2 rounded" 
              value={serviceCategory} 
              onChange={e => setServiceCategory(e.target.value)}
              placeholder="e.g., Car Wash, Oil Change"
            />
          </div>
        </div>
      </div>

      {/* Service Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">Service Items *</label>
          <button 
            type="button" 
            className="text-sm text-blue-600 hover:text-blue-700 font-medium" 
            onClick={addItem}
          >
            + Add Item
          </button>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-2 mb-2 px-3">
          <div className="col-span-5 text-xs font-semibold text-gray-600 uppercase">Description</div>
          <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase">Quantity</div>
          <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase">Rate</div>
          <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase">Amount</div>
          <div className="col-span-1"></div>
        </div>

        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded">
              <div className="col-span-5">
                <input 
                  className="w-full border border-gray-300 p-2 rounded text-sm" 
                  placeholder="Service/Part description" 
                  value={it.description || ''} 
                  onChange={e => updateItem(idx, 'description', e.target.value)} 
                />
              </div>
              <div className="col-span-2">
                <input 
                  type="number" 
                  className="w-full border border-gray-300 p-2 rounded text-sm" 
                  value={it.quantity || 1} 
                  min={1} 
                  onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value || '1', 10))} 
                />
              </div>
              <div className="col-span-2">
                <input 
                  type="number" 
                  className="w-full border border-gray-300 p-2 rounded text-sm" 
                  value={it.rate || 0} 
                  step="0.01"
                  min={0}
                  onChange={e => updateItem(idx, 'rate', parseFloat(e.target.value || '0'))} 
                />
              </div>
              <div className="col-span-2">
                <input 
                  type="number" 
                  className="w-full border border-gray-200 p-2 rounded text-sm bg-white font-medium" 
                  value={(it.amount || 0).toFixed(2)} 
                  readOnly
                />
              </div>
              <div className="col-span-1 flex justify-center">
                {items.length > 1 && (
                  <button 
                    type="button" 
                    className="text-red-500 hover:text-red-700" 
                    onClick={() => removeItem(idx)}
                    title="Remove item"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Charges */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Labor Charges</label>
          <input 
            type="number"
            className="w-full border border-gray-300 p-2 rounded" 
            value={laborCharges || 0}
            step="0.01"
            min={0}
            onChange={e => setLaborCharges(parseFloat(e.target.value || '0'))}
            placeholder="Enter labor charges"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
          <input 
            type="number"
            className="w-full border border-gray-300 p-2 rounded" 
            value={discount || 0}
            step="0.01"
            min={0}
            onChange={e => setDiscount(parseFloat(e.target.value || '0'))}
            placeholder="Enter discount amount"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
          <select
            className="w-full border border-gray-300 p-2 rounded"
            value={paymentStatus}
            onChange={e => setPaymentStatus(e.target.value)}
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
          <select
            className="w-full border border-gray-300 p-2 rounded"
            value={paymentTerms}
            onChange={e => {
              const value = e.target.value;
              setPaymentTerms(value);
              // Mark paid when a payment method is chosen; unpaid if none
              setPaymentStatus(value ? 'paid' : 'unpaid');
            }}
          >
            <option value="card">Credit/Debit Card</option>
            <option value="cash">Cash on Delivery</option>
            <option value="bank">Bank Transfer</option>
            <option value="tabby">Tabby/Tamara</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        {paymentTerms === 'other' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specify Payment Method</label>
            <input 
              type="text"
              className="w-full border border-gray-300 p-2 rounded" 
              value={paymentTermsOther}
              onChange={e => setPaymentTermsOther(e.target.value)}
              placeholder="Enter custom payment method"
            />
          </div>
        )}
      </div>

      {/* Invoice Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-4">Invoice Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Items Total:</span>
            <span className="font-medium">AED {totals.itemsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Labor Charges:</span>
            <span className="font-medium">AED {laborCharges.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">AED {totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax (5% VAT):</span>
            <span className="font-medium text-blue-600">AED {totals.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Discount:</span>
            <span className="font-medium text-red-600">- AED {discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-blue-300">
            <span className="text-gray-900">Grand Total:</span>
            <span className="text-blue-600">AED {totals.grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button 
            type="button" 
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50" 
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button 
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-medium" 
          disabled={loading}
        >
          {loading ? (invoice?.id ? 'Updating…' : 'Creating…') : (invoice?.id ? 'Update Invoice' : 'Create Invoice')}
        </button>
      </div>
    </form>
  );
}
