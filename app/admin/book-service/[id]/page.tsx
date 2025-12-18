"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';

export default function BookServiceDetails() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const [service, setService] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newScheduleDate, setNewScheduleDate] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [billingItems, setBillingItems] = useState([{ description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [laborCharges, setLaborCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('cash');
  const [paymentTermsOther, setPaymentTermsOther] = useState('');
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    mobileNo: '',
    email: '',
    country: '',
    state: '',
    city: '',
    address: '',
    vehicleType: '',
    vehicleBrand: '',
    modelName: '',
    numberPlate: '',
    fuelType: '',
  });

  // Helper functions
  function getMinDateTime(): string {
    const now = new Date();
    // Round up to next 30 minutes
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    if (roundedMinutes === 60) {
      now.setHours(now.getHours() + 1, 0);
    } else {
      now.setMinutes(roundedMinutes);
    }
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    // Format as datetime-local string
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${date}T${hours}:${mins}`;
  }

  function isValidDateTime(dateTimeString: string): boolean {
    if (!dateTimeString) return false;
    const selectedDate = new Date(dateTimeString);
    const day = selectedDate.getDay();
    
    // Disable weekends (0 = Sunday, 6 = Saturday)
    if (day === 0 || day === 6) {
      return false;
    }
    
    // Disable past times
    const now = new Date();
    if (selectedDate < now) {
      return false;
    }
    
    // Disable time outside business hours (before 9 AM or after 6 PM)
    const hours = selectedDate.getHours();
    if (hours < 9 || hours >= 18) {
      return false;
    }
    
    return true;
  }

  function getDateTimeError(dateTimeString: string): string | null {
    if (!dateTimeString) return null;
    
    const selectedDate = new Date(dateTimeString);
    const day = selectedDate.getDay();
    const hours = selectedDate.getHours();
    
    if (day === 0 || day === 6) {
      return 'Bookings not available on weekends';
    }
    
    if (selectedDate < new Date()) {
      return 'Cannot book past times';
    }
    
    if (hours < 9 || hours >= 18) {
      return 'Bookings available only 9 AM - 6 PM';
    }
    
    return null;
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'bookedServices', id));
        if (!snap.exists()) return setService(null);
        const data = snap.data() as any;
        setService({ ...data, id: snap.id });
        // pre-fill the reschedule date if it exists
        if (data.scheduledDate) {
          const date = data.scheduledDate.toDate ? data.scheduledDate.toDate() : new Date(data.scheduledDate);
          setNewScheduleDate(date.toISOString().slice(0, 16));
        }
        // pre-fill edit form
        setEditForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          mobileNo: data.mobileNo || '',
          email: data.email || '',
          country: data.country || '',
          state: data.state || '',
          city: data.city || '',
          address: data.address || '',
          vehicleType: data.vehicleType || '',
          vehicleBrand: data.vehicleBrand || '',
          modelName: data.modelName || '',
          numberPlate: data.numberPlate || '',
          fuelType: data.fuelType || '',
        });
      } catch (err: any) {
        safeConsoleError('Book service fetch error', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Image popup handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      
      if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, service]);

  const handlePrevImage = () => {
    if (selectedImageIndex === null || !service?.preInspection?.images) return;
    const newIndex = selectedImageIndex === 0 ? service.preInspection.images.length - 1 : selectedImageIndex - 1;
    setSelectedImageIndex(newIndex);
  };

  const handleNextImage = () => {
    if (selectedImageIndex === null || !service?.preInspection?.images) return;
    const newIndex = selectedImageIndex === service.preInspection.images.length - 1 ? 0 : selectedImageIndex + 1;
    setSelectedImageIndex(newIndex);
  };

  async function rescheduleService() {
    if (!newScheduleDate) {
      setStatus('Please select a new date and time');
      return;
    }

    // Validate the selected date/time
    const dateError = getDateTimeError(newScheduleDate);
    if (dateError) {
      setStatus(dateError);
      return;
    }

    setStatus('Rescheduling...');
    try {
      const newDate = new Date(newScheduleDate);
      await updateDoc(doc(db, 'bookedServices', id!), {
        scheduledDate: Timestamp.fromDate(newDate),
      });
      setService({ ...service, scheduledDate: Timestamp.fromDate(newDate) });
      setStatus('Service rescheduled successfully');
      setRescheduling(false);
    } catch (err: any) {
      safeConsoleError('Reschedule error', err);
      setStatus('Failed to reschedule service');
    }
  }

  function markComplete() {
    // Initialize billing items with service category
    setBillingItems([{ 
      description: service.category || 'Service', 
      quantity: 1, 
      rate: 0, 
      amount: 0 
    }]);
    setLaborCharges(0);
    setDiscount(0);
    setPaymentTerms('cash');
    setPaymentTermsOther('');
    setShowBilling(true);
  }

  function addBillingItem() {
    setBillingItems([...billingItems, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  }

  function removeBillingItem(index: number) {
    if (billingItems.length > 1) {
      setBillingItems(billingItems.filter((_, i) => i !== index));
    }
  }

  function updateBillingItem(index: number, field: string, value: any) {
    const updated = [...billingItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    
    setBillingItems(updated);
  }

  function calculateBillingTotal() {
    const itemsTotal = billingItems.reduce((sum, item) => sum + (item.amount || 0), 0);
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

  async function handleBillingSave() {
    const totals = calculateBillingTotal();
    
    // Validate
    if (totals.grandTotal === 0) {
      setStatus('Please add service charges');
      return;
    }
    
    const hasEmptyItems = billingItems.some(item => !item.description || item.rate === 0);
    if (hasEmptyItems) {
      setStatus('Please fill all service items');
      return;
    }
    
    setStatus('Creating invoice...');
    
    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      
      // Create invoice document
      const invoiceData = {
        invoiceNumber,
        serviceBookingId: id,
        jobCardNo: service.jobCardNo || '',
        customerName: `${service.firstName} ${service.lastName}`,
        customerEmail: service.email || '',
        customerMobile: service.mobileNo || '',
        vehicleDetails: {
          type: service.vehicleType || '',
          brand: service.vehicleBrand || '',
          model: service.modelName || '',
          plate: service.numberPlate || '',
        },
        serviceCategory: service.category || '',
        items: billingItems,
        laborCharges,
        itemsTotal: totals.itemsTotal,
        subtotal: totals.subtotal,
        taxRate: 5,
        taxAmount: totals.tax,
        discount,
        total: totals.grandTotal,
        paymentStatus: 'unpaid',
        paymentTerms,
        paymentTermsOther: paymentTerms === 'other' ? paymentTermsOther : '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      
      // Mark service as completed
      await updateDoc(doc(db, 'bookedServices', id!), {
        status: 'completed',
        invoiceId: docRef.id,
        completedAt: Timestamp.now(),
      });
      
      setService({ ...service, status: 'completed', invoiceId: docRef.id });
      setCreatedInvoiceId(docRef.id);
      setStatus('✓ Invoice created and service marked as completed!');
      setShowBilling(false);
    } catch (err: any) {
      safeConsoleError('Billing save error', err);
      setStatus('Failed to create invoice: ' + err.message);
    }
  }

  async function deleteService() {
    const bookingLabel = service?.jobCardNo || service?.numberPlate || 'this booking';
    const customerName = `${service?.firstName || ''} ${service?.lastName || ''}`.trim();
    const message = `Cancel ${bookingLabel}${customerName ? ` for ${customerName}` : ''}? This cannot be undone.`;
    if (!confirm(message)) return;
    setStatus('Deleting...');
    try {
      await updateDoc(doc(db, 'bookedServices', id!), {
        status: 'cancelled',
      });
      setService({ ...service, status: 'cancelled' });
      setStatus('Service cancelled');
      setTimeout(() => router.push('/admin/book-service'), 2000);
    } catch (err: any) {
      safeConsoleError('Delete error', err);
      setStatus('Failed to cancel service');
    }
  }

  async function handleUpdate() {
    setStatus('Updating...');
    try {
      await updateDoc(doc(db, 'bookedServices', id!), {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        mobileNo: editForm.mobileNo,
        email: editForm.email,
        country: editForm.country,
        state: editForm.state,
        city: editForm.city,
        address: editForm.address,
        vehicleType: editForm.vehicleType,
        vehicleBrand: editForm.vehicleBrand,
        modelName: editForm.modelName,
        numberPlate: editForm.numberPlate,
        fuelType: editForm.fuelType,
      });
      setService({ ...service, ...editForm });
      setStatus('✓ Details updated successfully');
      setEditing(false);
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      safeConsoleError('Update error', err);
      setStatus('Failed to update details');
    }
  }

  function cancelEdit() {
    setEditForm({
      firstName: service.firstName || '',
      lastName: service.lastName || '',
      mobileNo: service.mobileNo || '',
      email: service.email || '',
      country: service.country || '',
      state: service.state || '',
      city: service.city || '',
      address: service.address || '',
      vehicleType: service.vehicleType || '',
      vehicleBrand: service.vehicleBrand || '',
      modelName: service.modelName || '',
      numberPlate: service.numberPlate || '',
      fuelType: service.fuelType || '',
    });
    setEditing(false);
  }

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!service) return <div className="p-6 text-center text-red-600">Service not found</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Service Booking</h1>
          <p className="text-sm text-gray-500 mt-1">Job Card: {service.jobCardNo}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </header>

      {status && (
        <div className={`p-4 rounded ${status.includes('success') || status.includes('completed') || status.includes('rescheduled') ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
          {status}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Details */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Service Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Job Card No:</span>
                <span className="font-medium">{service.jobCardNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-medium">{service.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled Date:</span>
                <span className="font-medium">{formatDateTime(service.scheduledDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${service.status === 'completed' ? 'bg-green-100 text-green-800' : service.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                  {service.status || 'pending'}
                </span>
              </div>
            </div>
          </Card>

          {/* Customer Details */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Customer Details</h2>
              {!editing && service.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="text-xs"
                >
                  ✏️ Edit
                </Button>
              )}
            </div>
            <div className="space-y-3 text-sm">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">First Name</label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mobile</label>
                    <input
                      type="text"
                      value={editForm.mobileNo}
                      onChange={(e) => setEditForm({...editForm, mobileNo: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Country</label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) => setEditForm({...editForm, country: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">State</label>
                    <input
                      type="text"
                      value={editForm.state}
                      onChange={(e) => setEditForm({...editForm, state: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{service.firstName} {service.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile:</span>
                    <span className="font-medium">{service.mobileNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{service.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Country:</span>
                    <span className="font-medium">{service.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">State:</span>
                    <span className="font-medium">{service.state || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">City:</span>
                    <span className="font-medium">{service.city || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium">{service.address}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Vehicle Details */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Vehicle Details</h2>
            <div className="space-y-3 text-sm">
              {editing ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Vehicle Type</label>
                    <select
                      value={editForm.vehicleType}
                      onChange={(e) => setEditForm({...editForm, vehicleType: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
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
                    <label className="block text-xs text-gray-600 mb-1">Brand</label>
                    <input
                      type="text"
                      value={editForm.vehicleBrand}
                      onChange={(e) => setEditForm({...editForm, vehicleBrand: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Model</label>
                    <input
                      type="text"
                      value={editForm.modelName}
                      onChange={(e) => setEditForm({...editForm, modelName: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Number Plate</label>
                    <input
                      type="text"
                      value={editForm.numberPlate}
                      onChange={(e) => setEditForm({...editForm, numberPlate: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Fuel Type</label>
                    <select
                      value={editForm.fuelType}
                      onChange={(e) => setEditForm({...editForm, fuelType: e.target.value})}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">Select Fuel</option>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-3">
                    <Button
                      size="sm"
                      onClick={handleUpdate}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      💾 Save Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEdit}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{service.vehicleType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand:</span>
                    <span className="font-medium">{service.vehicleBrand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium">{service.modelName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Number Plate:</span>
                    <span className="font-medium">{service.numberPlate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fuel Type:</span>
                    <span className="font-medium">{service.fuelType}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Pre-Inspection Checklist */}
          {service.preInspection && (service.preInspection.message || service.preInspection.images?.length > 0 || service.preInspection.videos?.length > 0) && (
            <Card className="p-6 border-2 border-orange-200">
              <h2 className="text-xl font-semibold mb-4 text-orange-700">Pre-Inspection Checklist</h2>
              
              {service.preInspection.message && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-700">Notes</h3>
                  </div>
                  <p className="text-sm text-gray-800 bg-gradient-to-r from-orange-50 to-gray-50 p-4 rounded-lg border border-orange-100 leading-relaxed whitespace-pre-wrap">
                    {service.preInspection.message}
                  </p>
                </div>
              )}

              {service.preInspection.images && service.preInspection.images.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-700">
                        Images <span className="text-orange-600">({service.preInspection.images.length})</span>
                      </h3>
                    </div>
                    <span className="text-xs text-gray-500">Click to enlarge</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {service.preInspection.images.map((url: string, idx: number) => (
                      <button
                        key={idx} 
                        onClick={() => setSelectedImageIndex(idx)}
                        className="group relative block overflow-hidden rounded-lg border-2 border-gray-200 hover:border-orange-500 transition-all duration-300 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <div className="aspect-square relative">
                          <img 
                            src={url} 
                            alt={`Pre-inspection image ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-xs text-white font-medium">Image {idx + 1}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {service.preInspection.videos && service.preInspection.videos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-700">
                        Videos <span className="text-orange-600">({service.preInspection.videos.length})</span>
                      </h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {service.preInspection.videos.map((url: string, idx: number) => (
                      <div key={idx} className="group relative border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:border-orange-500 transition-all duration-300 bg-black">
                        <video 
                          src={url} 
                          controls 
                          preload="metadata"
                          className="w-full aspect-video object-contain bg-black"
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="bg-gradient-to-r from-orange-50 to-gray-50 px-3 py-2 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">Video {idx + 1}</span>
                            <div className="flex gap-2">
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Open
                              </a>
                              <a 
                                href={url} 
                                download
                                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-medium transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Actions</h3>
            <div className="space-y-3">
              {service.status !== 'completed' && service.status !== 'cancelled' && (
                <>
                  <Button
                    variant={rescheduling ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setRescheduling(!rescheduling)}
                  >
                    {rescheduling ? 'Close' : 'Reschedule'}
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={markComplete}
                  >
                    Mark Complete
                  </Button>
                </>
              )}
              <Button
                variant="destructive"
                className="w-full"
                onClick={deleteService}
                disabled={service.status === 'cancelled'}
              >
                {service.status === 'cancelled' ? 'Cancelled' : 'Cancel Booking'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/admin/book-service')}
              >
                Back to List
              </Button>
            </div>
          </Card>

          {/* Invoice Section */}
          {service.invoiceId && (
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="font-semibold text-gray-900">Invoice Generated</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                An invoice has been created for this service.
              </p>
              <div className="space-y-2">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push(`/admin/invoice/${service.invoiceId}`)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Invoice
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => router.push(`/admin/invoice/${service.invoiceId}`)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </Button>
              </div>
            </Card>
          )}

          {/* Reschedule Form */}
          {rescheduling && service.status !== 'completed' && service.status !== 'cancelled' && (
            <Card className="p-6 bg-blue-50">
              <h3 className="font-semibold mb-3">Reschedule Service</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">New Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newScheduleDate}
                    onChange={(e) => setNewScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={rescheduleService}
                >
                  Confirm Reschedule
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Image Lightbox Popup */}
      {selectedImageIndex !== null && service?.preInspection?.images && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-4 right-4 text-white hover:text-orange-500 transition-colors z-10 p-2 rounded-full hover:bg-white/10"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
            className="absolute left-4 text-white hover:text-orange-500 transition-colors z-10 p-2 rounded-full hover:bg-white/10"
            aria-label="Previous image"
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
            className="absolute right-4 text-white hover:text-orange-500 transition-colors z-10 p-2 rounded-full hover:bg-white/10"
            aria-label="Next image"
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="max-w-7xl max-h-full w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={service.preInspection.images[selectedImageIndex]} 
              alt={`Pre-inspection image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center">
              <p className="text-white text-sm font-medium">
                Image {selectedImageIndex + 1} of {service.preInspection.images.length}
              </p>
              <a 
                href={service.preInspection.images[selectedImageIndex]} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 text-sm mt-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open original
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Billing Modal */}
      {showBilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowBilling(false)} />
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create Invoice & Complete Service</h2>
              <button 
                className="text-gray-500 hover:text-gray-700" 
                onClick={() => setShowBilling(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 grid md:grid-cols-3 gap-6">
              {/* Left Column - Billing Form */}
              <div className="md:col-span-2 space-y-6">
                {/* Customer & Vehicle Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Customer & Vehicle Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <p className="font-medium">{service.firstName} {service.lastName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Job Card:</span>
                      <p className="font-medium">{service.jobCardNo || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Vehicle:</span>
                      <p className="font-medium">{service.vehicleBrand} {service.modelName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Plate:</span>
                      <p className="font-medium">{service.numberPlate}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Service:</span>
                      <p className="font-medium">{service.category}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Mobile:</span>
                      <p className="font-medium">{service.mobileNo}</p>
                    </div>
                  </div>
                </div>

                {/* Service Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Service Items</h3>
                    <button
                      onClick={addBillingItem}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                    {billingItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded">
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Service/Part description"
                            value={item.description}
                            onChange={(e) => updateBillingItem(index, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateBillingItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Rate"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateBillingItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.amount.toFixed(2)}
                            readOnly
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white font-medium"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {billingItems.length > 1 && (
                            <button
                              onClick={() => removeBillingItem(index)}
                              className="text-red-500 hover:text-red-700"
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

                {/* Labor Charges */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Labor Charges
                  </label>
                  <input
                    type="number"
                    placeholder="Enter labor charges"
                    min="0"
                    step="0.01"
                    value={laborCharges}
                    onChange={(e) => setLaborCharges(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount
                  </label>
                  <input
                    type="number"
                    placeholder="Enter discount amount"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPaymentTerms(value);
                      // This is for billing modal - payment status is always 'unpaid' initially
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specify Payment Method
                    </label>
                    <input
                      type="text"
                      placeholder="Enter custom payment method"
                      value={paymentTermsOther}
                      onChange={(e) => setPaymentTermsOther(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>

              {/* Right Column - Summary */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Invoice Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Items Total:</span>
                      <span className="font-medium">AED {calculateBillingTotal().itemsTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Labor Charges:</span>
                      <span className="font-medium">AED {laborCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">AED {calculateBillingTotal().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (5% VAT):</span>
                      <span className="font-medium text-blue-600">AED {calculateBillingTotal().tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">- AED {discount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-blue-300">
                      <span className="text-gray-900">Grand Total:</span>
                      <span className="text-blue-600">AED {calculateBillingTotal().grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {status && (
                  <div className={`p-3 rounded text-sm ${
                    status.includes('Failed') || status.includes('Please') 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {status}
                  </div>
                )}

                <button
                  onClick={handleBillingSave}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Save Invoice & Mark Complete
                </button>

                <button
                  onClick={() => setShowBilling(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Actions - View Invoice & Download PDF */}
      {createdInvoiceId && (
        <div className="fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl p-4 border-2 border-green-500">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">Invoice Created Successfully!</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/admin/invoice/${createdInvoiceId}`)}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  View Invoice
                </button>
                <button
                  onClick={() => {
                    router.push(`/admin/invoice/${createdInvoiceId}`);
                  }}
                  className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  Download PDF
                </button>
              </div>
            </div>
            <button
              onClick={() => setCreatedInvoiceId(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
