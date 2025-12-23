"use client";
import React from 'react';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import QuotationForm from '@/components/admin/QuotationForm';
import { useUser } from '@/lib/userContext';
import { saveContactPerson, listCustomers } from '@/lib/firestore/customers';

export default function BookServiceDetails() {
    const [paymentStatus, setPaymentStatus] = React.useState('full');
    const [partialPaidAmount, setPartialPaidAmount] = React.useState('');
      const [partialPaymentNotes, setPartialPaymentNotes] = React.useState('');
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const { displayName, user } = useUser();
  const [service, setService] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newScheduleDate, setNewScheduleDate] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedMulkiyaIndex, setSelectedMulkiyaIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [billingItems, setBillingItems] = useState([{ description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [laborCharges, setLaborCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('cash');
  const [paymentTermsOther, setPaymentTermsOther] = useState('');

  // --- Billing Modal Persistence ---
  const BILLING_STATE_KEY = `billingState-${service?.id || ''}`;
  useEffect(() => {
    if (!service?.id) return;
    const saved = localStorage.getItem(BILLING_STATE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (typeof state.showBilling === 'boolean') setShowBilling(state.showBilling);
        if (Array.isArray(state.billingItems)) setBillingItems(state.billingItems);
        if (typeof state.laborCharges === 'number') setLaborCharges(state.laborCharges);
        if (typeof state.discount === 'number') setDiscount(state.discount);
        if (typeof state.paymentTerms === 'string') setPaymentTerms(state.paymentTerms);
        if (typeof state.paymentStatus === 'string') setPaymentStatus(state.paymentStatus);
        if (typeof state.partialPaidAmount === 'string') setPartialPaidAmount(state.partialPaidAmount);
        if (typeof state.paymentTermsOther === 'string') setPaymentTermsOther(state.paymentTermsOther);
        if (typeof state.partialPaymentNotes === 'string') setPartialPaymentNotes(state.partialPaymentNotes);
      } catch {}
    }
  }, [service?.id]);

  useEffect(() => {
    if (!service?.id) return;
    const state = {
      showBilling,
      billingItems,
      laborCharges,
      discount,
      paymentTerms,
      paymentStatus,
      partialPaidAmount,
      paymentTermsOther,
      partialPaymentNotes,
    };
    localStorage.setItem(BILLING_STATE_KEY, JSON.stringify(state));
  }, [showBilling, billingItems, laborCharges, discount, paymentTerms, paymentStatus, partialPaidAmount, paymentTermsOther, partialPaymentNotes, service?.id]);

  const clearBillingState = () => {
    if (service?.id) localStorage.removeItem(BILLING_STATE_KEY);
  };
  const [quotation, setQuotation] = useState<any | null>(null);
  const [quotationLoading, setQuotationLoading] = useState(true);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [preMessage, setPreMessage] = useState('');
  const [preImages, setPreImages] = useState<File[]>([]);
  const [preVideos, setPreVideos] = useState<File[]>([]);
  const [preImagePreview, setPreImagePreview] = useState<string[]>([]);
  const [preVideoPreview, setPreVideoPreview] = useState<string[]>([]);
  const [savingPreInspection, setSavingPreInspection] = useState(false);
  const [showPreInspectionList, setShowPreInspectionList] = useState(false);
  const [mulkiyaFiles, setMulkiyaFiles] = useState<File[]>([]);
  const [mulkiyaPreview, setMulkiyaPreview] = useState<string[]>([]);
  const [mulkiyaUploading, setMulkiyaUploading] = useState(false);
  type EditFormType = {
    companyName: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    poRef: string;
    companyVat: string;
    servicesHistory: string;
    firstName: string;
    lastName: string;
    mobileNo: string;
    email: string;
    country: string;
    state: string;
    city: string;
    address: string;
    source: string;
    vehicleType: string;
    vehicleBrand: string;
    modelName: string;
    numberPlate: string;
    fuelType: string;
    vinNumber: string;
    mulkiyaUrl: string;
  };
  const [editForm, setEditForm] = useState<EditFormType>({
    companyName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    poRef: '',
    companyVat: '',
    servicesHistory: '',
    firstName: '',
    lastName: '',
    mobileNo: '',
    email: '',
    country: '',
    state: '',
    city: '',
    address: '',
    source: '',
    vehicleType: '',
    vehicleBrand: '',
    modelName: '',
    numberPlate: '',
    fuelType: '',
    vinNumber: '',
    mulkiyaUrl: '',
  });
  const [editingVehicleIndex, setEditingVehicleIndex] = useState<number | null>(null);
  const [savingVehicleIndex, setSavingVehicleIndex] = useState<number | null>(null);
  const [vehicleEditForm, setVehicleEditForm] = useState({
    vehicleType: '',
    vehicleBrand: '',
    modelName: '',
    numberPlate: '',
    fuelType: '',
    vinNumber: '',
    category: '',
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

  const handleMulkiyaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setMulkiyaFiles(prev => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMulkiyaPreview(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  function removeMulkiya(idx: number) {
    setMulkiyaFiles(prev => prev.filter((_, i) => i !== idx));
    setMulkiyaPreview(prev => prev.filter((_, i) => i !== idx));
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

  // Save invoice as pending (partial payment)
  async function handleBillingSavePending() {
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

    if (partialPaidAmount === '' || isNaN(Number(partialPaidAmount)) || Number(partialPaidAmount) < 100) {
      setStatus('Please enter a valid partial paid amount (min 100 AED)');
      return;
    }

    setStatus('Creating pending invoice...');

    try {
      const actorId = user?.uid || 'unknown';
      const actorEmail = user?.email || 'unknown';

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice document with partial payment
      const invoiceData = {
        isB2B: service.customerType?.toLowerCase() === 'b2b',
        customerType: service.customerType || 'b2c',
        companyName: service.companyName || '',
        contactName: service.contactName || '',
        contactEmail: service.contactEmail || '',
        contactPhone: service.contactPhone || '',
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
        vehicles: service.customerType?.toLowerCase() === 'b2b' && Array.isArray(service.vehicles) ? service.vehicles : [],
        serviceCategory: service.category || '',
        items: billingItems,
        laborCharges,
        itemsTotal: totals.itemsTotal,
        subtotal: totals.subtotal,
        taxRate: 5,
        taxAmount: totals.tax,
        discount,
        total: totals.grandTotal,
        paymentStatus: 'partial',
        paymentTerms,
        paymentTermsOther: paymentTerms === 'other' ? paymentTermsOther : '',
        partialPaidAmount: Number(partialPaidAmount),
        notes: partialPaymentNotes || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: actorId,
        createdByEmail: actorEmail,
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);

      // Mark service as pending (not completed)
      await updateDoc(doc(db, 'bookedServices', id!), {
        status: 'pending',
        invoiceId: docRef.id,
        paymentStatus: 'partial',
        paymentTerms,
        paymentTermsOther: paymentTerms === 'other' ? paymentTermsOther : '',
        partialPaidAmount: Number(partialPaidAmount),
        updatedAt: Timestamp.now(),
        updatedBy: actorId,
        updatedByEmail: actorEmail,
        updatedByName: currentAdminName,
      });

      setService({
        ...service,
        status: 'pending',
        invoiceId: docRef.id,
        paymentStatus: 'partial',
        paymentTerms,
        paymentTermsOther: paymentTerms === 'other' ? paymentTermsOther : '',
        partialPaidAmount: Number(partialPaidAmount),
      });
      setCreatedInvoiceId(docRef.id);
      setStatus('✓ Pending invoice created!');
      setShowBilling(false);
    } catch (err: any) {
      safeConsoleError('Billing save pending error', err);
      setStatus('Failed to create pending invoice: ' + err.message);
    }
  }

  function toDate(value: any): Date | null {
    try {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value?.toDate === 'function') return value.toDate();
      if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
      const maybeDate = new Date(value);
      return Number.isNaN(maybeDate.getTime()) ? null : maybeDate;
    } catch {
      return null;
    }
  }

  function formatDateTime12(value: any) {
    const d = toDate(value);
    if (!d) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hh = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${minutes} ${period}`;
  }

  function formatHistoryDate(value: any) {
    if (!value) return '';
    const parsed = toDate(value);
    if (!parsed) return '';
    return formatDateTime12(parsed);
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'bookedServices', id));
        if (!snap.exists()) return setService(null);
        const data = snap.data() as any;
        const detectedSource = data.source || (data.sourceLeadId ? 'lead' : 'direct');
        setService({ ...data, source: detectedSource, id: snap.id });
        if (data?.preInspection?.message) setPreMessage(data.preInspection.message);
        // pre-fill the reschedule date if it exists
        if (data.scheduledDate) {
          const date = data.scheduledDate.toDate ? data.scheduledDate.toDate() : new Date(data.scheduledDate);
          setNewScheduleDate(date.toISOString().slice(0, 16));
        }
        // pre-fill edit form
        setEditForm({
          companyName: data.companyName || '',
          contactName: data.contactName || '',
          contactPhone: data.contactPhone || '',
          contactEmail: data.contactEmail || '',
          poRef: data.poRef || '',
          companyVat: data.companyVat || '',
          servicesHistory: data.servicesHistory || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          mobileNo: data.mobileNo || '',
          email: data.email || '',
          country: data.country || '',
          state: data.state || '',
          city: data.city || '',
          address: data.address || '',
          source: detectedSource,
          vehicleType: data.vehicleType || '',
          vehicleBrand: data.vehicleBrand || '',
          modelName: data.modelName || '',
          numberPlate: data.numberPlate || '',
          fuelType: data.fuelType || '',
          vinNumber: data.vinNumber || '',
          mulkiyaUrl: data.mulkiyaUrl || '',
        });
      } catch (err: any) {
        safeConsoleError('Book service fetch error', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const quotationQuery = query(collection(db, 'quotations'), where('serviceBookingId', '==', id));
    const unsubscribe = onSnapshot(
      quotationQuery,
      (snap) => {
        const first = snap.docs[0];
        setQuotation(first ? { id: first.id, ...(first.data() as any) } : null);
        setQuotationLoading(false);
      },
      (err) => {
        safeConsoleError('Quotation fetch error', err);
        setQuotationLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Fetch invoices for this service booking
  useEffect(() => {
    if (!id) return;
    const invoiceQuery = query(collection(db, 'invoices'), where('serviceBookingId', '==', id));
    const unsubscribe = onSnapshot(
      invoiceQuery,
      (snap) => {
        const invoices = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setService((prev: any) => prev ? { ...prev, invoices } : null);
      },
      (err) => {
        safeConsoleError('Invoice fetch error', err);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Close reschedule panel when a quotation is present
  useEffect(() => {
    if (quotation) {
      setRescheduling(false);
    }
  }, [quotation]);

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
      const now = Timestamp.now();
      const actorId = user?.uid || 'unknown';
      const actorEmail = user?.email || 'unknown';
      const newDateTimestamp = Timestamp.fromDate(newDate);

      await updateDoc(doc(db, 'bookedServices', id!), {
        scheduledDate: newDateTimestamp,
        rescheduledAt: now,
        rescheduledBy: actorId,
        rescheduledByEmail: actorEmail,
        rescheduledByName: currentAdminName,
        updatedAt: now,
        updatedBy: actorId,
        updatedByEmail: actorEmail,
        updatedByName: currentAdminName,
      });
      setService({
        ...service,
        scheduledDate: newDateTimestamp,
        rescheduledAt: now,
        rescheduledBy: actorId,
        rescheduledByEmail: actorEmail,
        rescheduledByName: currentAdminName,
        updatedAt: now,
        updatedBy: actorId,
        updatedByEmail: actorEmail,
        updatedByName: currentAdminName,
      });
      setStatus(`Service rescheduled to ${formatDateTime12(newDate)}`);
      setRescheduling(false);
    } catch (err: any) {
      safeConsoleError('Reschedule error', err);
      setStatus('Failed to reschedule service');
    }
  }

  function markComplete() {
    if (!quotation) {
      setStatus('Please create a quotation before invoicing');
      setShowQuotationModal(true);
      return;
    }

    if (quotation.status !== 'accepted') {
      setStatus('Quotation must be accepted before invoicing');
      return;
    }

    // Pre-fill billing with accepted quotation values
    const quotedItems = Array.isArray(quotation.items) && quotation.items.length > 0
      ? quotation.items.map((item: any) => ({
        description: item.description || service.category || 'Service',
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || (Number(item.quantity) || 1) * (Number(item.rate) || 0),
      }))
      : [{ description: service.category || 'Service', quantity: 1, rate: 0, amount: 0 }];

    setBillingItems(quotedItems);
    setLaborCharges(Number(quotation.laborCharges) || 0);
    setDiscount(Number(quotation.discount) || 0);
    
    // Load payment terms from existing invoice if available
    if (Array.isArray(service.invoices) && service.invoices.length > 0) {
      const lastInvoice = service.invoices[service.invoices.length - 1];
      setPaymentTerms(lastInvoice.paymentTerms || 'cash');
      setPaymentTermsOther(lastInvoice.paymentTermsOther || '');
      setPaymentStatus(lastInvoice.paymentStatus || 'full');
      if (lastInvoice.partialPaidAmount) {
        setPartialPaidAmount(lastInvoice.partialPaidAmount.toString());
      }
    } else {
      // Set defaults only if no existing invoice
      setPaymentTerms('cash');
      setPaymentTermsOther('');
      setPaymentStatus('full');
      setPartialPaidAmount('');
    }
    
    setShowBilling(true);
  }

  function handlePreImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setPreImages(prev => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreImagePreview(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function handlePreVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setPreVideos(prev => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreVideoPreview(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removePreImage(idx: number) {
    setPreImages(prev => prev.filter((_, i) => i !== idx));
    setPreImagePreview(prev => prev.filter((_, i) => i !== idx));
  }

  function removePreVideo(idx: number) {
    setPreVideos(prev => prev.filter((_, i) => i !== idx));
    setPreVideoPreview(prev => prev.filter((_, i) => i !== idx));
  }

  async function savePreInspection() {
    if (!service) return;
    setSavingPreInspection(true);
    setStatus(null);

    try {
      const jobCard = service.jobCardNo || service.numberPlate || service.id;
      const uploadedImages: string[] = service.preInspection?.images ? [...service.preInspection.images] : [];
      const uploadedVideos: string[] = service.preInspection?.videos ? [...service.preInspection.videos] : [];

      for (const file of preImages) {
        const storageRef = ref(storage, `pre-inspections/${jobCard}/images/${file.name}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedImages.push(url);
      }

      for (const file of preVideos) {
        const storageRef = ref(storage, `pre-inspections/${jobCard}/videos/${file.name}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedVideos.push(url);
      }

      await updateDoc(doc(db, 'bookedServices', service.id), {
        preInspection: {
          message: preMessage,
          images: uploadedImages,
          videos: uploadedVideos,
        },
      });

      const updated = {
        ...service,
        preInspection: {
          message: preMessage,
          images: uploadedImages,
          videos: uploadedVideos,
        },
      };
      setService(updated);
      setPreMessage('');
      setPreImages([]);
      setPreVideos([]);
      setPreImagePreview([]);
      setPreVideoPreview([]);
      setStatus('✓ Pre-inspection saved');
    } catch (err: any) {
      safeConsoleError('Pre-inspection save error', err);
      setStatus('Failed to save pre-inspection');
    } finally {
      setSavingPreInspection(false);
    }
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
      const actorId = user?.uid || 'unknown';
      const actorEmail = user?.email || 'unknown';

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice document
      const invoiceData = {
        isB2B: service.customerType?.toLowerCase() === 'b2b',
        customerType: service.customerType || 'b2c',
        companyName: service.companyName || '',
        contactName: service.contactName || '',
        contactEmail: service.contactEmail || '',
        contactPhone: service.contactPhone || '',
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
        vehicles: service.customerType?.toLowerCase() === 'b2b' && Array.isArray(service.vehicles) ? service.vehicles : [],
        serviceCategory: service.category || '',
        items: billingItems,
        laborCharges,
        itemsTotal: totals.itemsTotal,
        subtotal: totals.subtotal,
        taxRate: 5,
        taxAmount: totals.tax,
        discount,
        total: totals.grandTotal,
        paymentStatus: 'paid',
        paymentTerms,
        paymentTermsOther: paymentTerms === 'other' ? paymentTermsOther : '',
        notes: partialPaymentNotes || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: actorId,
        createdByEmail: actorEmail,
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);

      // Mark service as completed
      await updateDoc(doc(db, 'bookedServices', id!), {
        status: 'completed',
        invoiceId: docRef.id,
        completedAt: Timestamp.now(),
        completedBy: actorId,
        completedByEmail: actorEmail,
        completedByName: currentAdminName,
        paymentStatus: 'paid',
        paymentTerms,
        paymentTermsOther: paymentTerms === 'other' ? paymentTermsOther : '',
        updatedAt: Timestamp.now(),
        updatedBy: actorId,
        updatedByEmail: actorEmail,
        updatedByName: currentAdminName,
      });

      setService({
        ...service,
        status: 'completed',
        invoiceId: docRef.id,
        completedBy: actorId,
        completedByEmail: actorEmail,
        completedByName: currentAdminName,
        paymentStatus: 'paid',
        paymentTerms,
        paymentTermsOther: paymentTerms === 'other' ? paymentTermsOther : '',
        updatedAt: Timestamp.now(),
        updatedBy: actorId,
        updatedByEmail: actorEmail,
        updatedByName: currentAdminName,
      });
      setCreatedInvoiceId(docRef.id);
      setStatus('✓ Invoice created and service marked as completed!');
      setShowBilling(false);
    } catch (err: any) {
      safeConsoleError('Billing save error', err);
      setStatus('Failed to create invoice: ' + err.message);
    }
  }

  async function deleteService(skipPrompt = false) {
    const bookingLabel = service?.jobCardNo || service?.numberPlate || 'this booking';
    const customerName = `${service?.firstName || ''} ${service?.lastName || ''}`.trim();
    const actorId = user?.uid || 'unknown';
    const actorEmail = user?.email || 'unknown';
    const actorName = currentAdminName;

    let cancelReason = 'No reason provided';
    if (typeof window !== 'undefined') {
      const reasonInput = window.prompt('What is the reason for cancelling?');
      if (reasonInput === null) return; // User aborted
      cancelReason = reasonInput.trim() || 'No reason provided';
    }

    const message = `Cancel ${bookingLabel}${customerName ? ` for ${customerName}` : ''}? This cannot be undone.`;
    if (!skipPrompt) {
      const shouldCancel = typeof window !== 'undefined' ? window.confirm(message) : false;
      if (!shouldCancel) return;
    }

    setStatus('Cancelling...');
    const now = Timestamp.now();
    try {
      await updateDoc(doc(db, 'bookedServices', id!), {
        status: 'cancelled',
        cancelReason,
        cancelledAt: now,
        cancelledBy: actorId,
        cancelledByEmail: actorEmail,
        cancelledByName: actorName,
        updatedAt: now,
        updatedBy: actorId,
        updatedByEmail: actorEmail,
        updatedByName: actorName,
      });
      setService({
        ...service,
        status: 'cancelled',
        cancelReason,
        cancelledAt: now,
        cancelledBy: actorId,
        cancelledByEmail: actorEmail,
        cancelledByName: actorName,
        updatedAt: now,
        updatedBy: actorId,
        updatedByEmail: actorEmail,
        updatedByName: actorName,
      });
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
      setMulkiyaUploading(true);
      let uploadedMulkiyaUrls: string[] = [];

      // Parse existing mulkiya URLs from editForm or service
      if (editForm.mulkiyaUrl) {
        try {
          uploadedMulkiyaUrls = JSON.parse(editForm.mulkiyaUrl);
        } catch {
          uploadedMulkiyaUrls = editForm.mulkiyaUrl ? [editForm.mulkiyaUrl] : [];
        }
      } else if (service.mulkiyaUrl) {
        try {
          uploadedMulkiyaUrls = JSON.parse(service.mulkiyaUrl);
        } catch {
          uploadedMulkiyaUrls = service.mulkiyaUrl ? [service.mulkiyaUrl] : [];
        }
      }

      // Upload new mulkiya files (if any)
      if (mulkiyaFiles.length > 0) {
        const jobCard = service.jobCardNo || service.numberPlate || service.id;
        for (const file of mulkiyaFiles) {
          const storageRef = ref(storage, `mulkiya/${jobCard}/${file.name}-${Date.now()}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          uploadedMulkiyaUrls.push(url);
        }
      }

      const mulkiyaUrlString = uploadedMulkiyaUrls.length > 0 ? JSON.stringify(uploadedMulkiyaUrls) : '';

      const isB2b = service?.customerType === 'b2b';
      const commonFields = {
        country: editForm.country,
        state: editForm.state,
        city: editForm.city,
        address: editForm.address,
        source: editForm.source,
        mulkiyaUrl: mulkiyaUrlString,
        updatedAt: Timestamp.now(),
        updatedByName: currentAdminName,
      };

      const b2cFields = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        mobileNo: editForm.mobileNo,
        email: editForm.email,
        vehicleType: editForm.vehicleType,
        vehicleBrand: editForm.vehicleBrand,
        modelName: editForm.modelName,
        numberPlate: editForm.numberPlate,
        fuelType: editForm.fuelType,
        vinNumber: editForm.vinNumber,
      };

      const b2bFields = {
        companyName: editForm.companyName,
        contactName: editForm.contactName,
        contactPhone: editForm.contactPhone,
        contactEmail: editForm.contactEmail,
        poRef: editForm.poRef,
        companyVat: editForm.companyVat,
        servicesHistory: editForm.servicesHistory,
      };

      const payload = isB2b ? { ...b2bFields, ...commonFields } : { ...b2cFields, ...commonFields };

      await updateDoc(doc(db, 'bookedServices', id!), payload);
      
      // For B2B bookings, save/update the contact person in the company customer's sub-collection
      if (isB2b && editForm.companyName && editForm.contactName) {
        try {
          // Find the company customer
          const customers = await listCustomers();
          const companyCustomer = customers.find((c: any) => 
            c.companyName?.toLowerCase() === editForm.companyName.toLowerCase() &&
            c.customerType === 'b2b'
          );
          
          if (companyCustomer?.id) {
            // Save the contact person under the company customer
            await saveContactPerson(companyCustomer.id, {
              name: editForm.contactName,
              email: editForm.contactEmail,
              phone: editForm.contactPhone,
              title: '', // Can be added to edit form later
            });
          }
        } catch (err: any) {
          safeConsoleError('Contact person save error', err);
          // Don't fail the whole operation, just log it
        }
      }
      
      setService((prev: any) => prev ? { ...prev, ...payload } : prev);
      setStatus('✓ Details updated successfully');
      setEditing(false);
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      safeConsoleError('Update error', err);
      setStatus('Failed to update details');
    } finally {
      setMulkiyaUploading(false);
      setMulkiyaFiles([]);
      setMulkiyaPreview([]);
    }
  }

  function resetVehicleEditForm() {
    setVehicleEditForm({
      vehicleType: '',
      vehicleBrand: '',
      modelName: '',
      numberPlate: '',
      fuelType: '',
      vinNumber: '',
      category: '',
    });
  }

  function startVehicleEdit(index: number) {
    if (service?.customerType !== 'b2b') return;
    const vehicle = vehiclesList[index];
    if (!vehicle) return;
    setVehicleEditForm({
      vehicleType: vehicle.vehicleType || '',
      vehicleBrand: vehicle.vehicleBrand || '',
      modelName: vehicle.modelName || '',
      numberPlate: vehicle.numberPlate || '',
      fuelType: vehicle.fuelType || '',
      vinNumber: vehicle.vinNumber || '',
      category: vehicle.category || '',
    });
    setEditingVehicleIndex(index);
  }

  function cancelVehicleEdit() {
    setEditingVehicleIndex(null);
    resetVehicleEditForm();
  }

  async function saveVehicleEdit() {
    if (editingVehicleIndex === null || !id) return;
    if (service?.customerType !== 'b2b') return;
    setSavingVehicleIndex(editingVehicleIndex);
    setStatus('Updating vehicle...');

    try {
      const now = Timestamp.now();
      const actorId = user?.uid || 'unknown';
      const actorEmail = user?.email || 'unknown';

      const updatedVehicles = vehiclesList.map((vehicle: any, idx: number) => {
        if (idx !== editingVehicleIndex) return vehicle;
        return {
          ...vehicle,
          vehicleType: vehicleEditForm.vehicleType,
          vehicleBrand: vehicleEditForm.vehicleBrand,
          modelName: vehicleEditForm.modelName,
          numberPlate: vehicleEditForm.numberPlate,
          fuelType: vehicleEditForm.fuelType,
          vinNumber: vehicleEditForm.vinNumber,
          category: vehicleEditForm.category,
        };
      });

      const firstVehicle = updatedVehicles[0] || {};

      const payload = {
        vehicles: updatedVehicles,
        vehicleCount: updatedVehicles.length,
        vehicleType: firstVehicle.vehicleType || '',
        vehicleBrand: firstVehicle.vehicleBrand || '',
        modelName: firstVehicle.modelName || '',
        numberPlate: firstVehicle.numberPlate || '',
        fuelType: firstVehicle.fuelType || '',
        vinNumber: firstVehicle.vinNumber || '',
        category: firstVehicle.category || service?.category || '',
        updatedAt: now,
        updatedBy: actorId,
        updatedByEmail: actorEmail,
        updatedByName: currentAdminName,
      };

      await updateDoc(doc(db, 'bookedServices', id!), payload);
      setService((prev: any) => (prev ? { ...prev, ...payload } : prev));
      setStatus('✓ Vehicle updated successfully');
      setEditingVehicleIndex(null);
      resetVehicleEditForm();
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      safeConsoleError('Vehicle update error', err);
      setStatus('Failed to update vehicle');
    } finally {
      setSavingVehicleIndex(null);
    }
  }

  function cancelEdit() {
    const detectedSource = service.source || (service.sourceLeadId ? 'lead' : 'direct');
    setEditForm({
      companyName: service.companyName || '',
      contactName: service.contactName || '',
      contactPhone: service.contactPhone || '',
      contactEmail: service.contactEmail || '',
      poRef: service.poRef || '',
      companyVat: service.companyVat || '',
      servicesHistory: service.servicesHistory || '',
      firstName: service.firstName || '',
      lastName: service.lastName || '',
      mobileNo: service.mobileNo || '',
      email: service.email || '',
      country: service.country || '',
      state: service.state || '',
      city: service.city || '',
      address: service.address || '',
      source: detectedSource,
      vehicleType: service.vehicleType || '',
      vehicleBrand: service.vehicleBrand || '',
      modelName: service.modelName || '',
      numberPlate: service.numberPlate || '',
      fuelType: service.fuelType || '',
      vinNumber: service.vinNumber || '',
      mulkiyaUrl: service.mulkiyaUrl || '',
    });
    setEditing(false);
    setMulkiyaFiles([]);
    setMulkiyaPreview([]);
  }

  const quotationStatus = quotation?.status || service?.quotationStatus || 'not_created';
  const hasPreInspection = !!(service?.preInspection && (service.preInspection.message || service.preInspection.images?.length || service.preInspection.videos?.length));
  const derivedSource = service?.source || (service?.sourceLeadId ? 'lead' : 'direct');
  const sourceLabelMap: Record<string, string> = {
    lead: 'Lead',
    direct: 'Direct booking',
    referral: 'Referral',
    other: 'Other',
  };
  const sourceLabel = derivedSource ? (sourceLabelMap[derivedSource] || derivedSource) : 'Direct booking';
  const isCancelled = service?.status === 'cancelled';
  const customerType = service?.customerType === 'b2b' ? 'b2b' : 'b2c';
  const customerTypeBadgeClass = customerType === 'b2b'
    ? 'bg-blue-100 text-blue-800'
    : 'bg-green-100 text-green-800';
  const vehiclesList = service
    ? (Array.isArray(service.vehicles) && service.vehicles.length > 0
      ? service.vehicles
      : [{
        vehicleType: service.vehicleType || '',
        vehicleBrand: service.vehicleBrand || '',
        modelName: service.modelName || '',
        numberPlate: service.numberPlate || '',
        fuelType: service.fuelType || '',
        vinNumber: service.vinNumber || '',
        category: service.category || '',
      }])
    : [];
  const mulkiyaUrls = (() => {
    if (!service?.mulkiyaUrl) return [] as string[];
    try {
      const parsed = JSON.parse(service.mulkiyaUrl);
      if (Array.isArray(parsed)) return parsed as string[];
      return parsed ? [parsed as string] : [];
    } catch {
      return service.mulkiyaUrl ? [service.mulkiyaUrl] : [];
    }
  })();
  const progressSteps = [
    { key: 'booking', label: 'Booking Created', done: true },
    // Pre-inspection is optional; it should not block subsequent steps
    { key: 'pre', label: 'Pre-Inspection (optional)', done: true, optional: true, hasData: hasPreInspection },
    { key: 'quote', label: 'Quotation Accepted', done: quotationStatus === 'accepted' },
    { key: 'invoice', label: 'Invoice Generated', done: !!service?.invoiceId },
    { key: 'complete', label: 'Completed', done: service?.status === 'completed' },
  ];
  const nextStepIndex = progressSteps.findIndex((s) => !s.done);
  const activeStepIndex = nextStepIndex === -1 ? progressSteps.length - 1 : nextStepIndex;
  const quotationLabelMap: Record<string, string> = {
    accepted: 'Accepted',
    pending: 'Pending',
    rejected: 'Rejected',
    not_created: 'Not created',
  };
  const quotationBadgeClass = quotationStatus === 'accepted'
    ? 'bg-green-100 text-green-800'
    : quotationStatus === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : quotationStatus === 'rejected'
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-700';
  const canInvoice = quotationStatus === 'accepted';
  const rescheduleDisabled = !!quotation;
  const quotationSeed = service ? {
    customerType: service.customerType || 'b2c',
    companyName: service.companyName || '',
    contactName: service.contactName || '',
    contactEmail: service.contactEmail || service.email || '',
    contactPhone: service.contactPhone || service.mobileNo || '',
    customerName: `${service.firstName || ''} ${service.lastName || ''}`.trim(),
    customerEmail: service.email || '',
    customerMobile: service.mobileNo || '',
    vehicleDetails: {
      type: service.vehicleType || '',
      brand: service.vehicleBrand || '',
      model: service.modelName || '',
      plate: service.numberPlate || '',
    },
    serviceCategory: service.category || '',
    items: [{ description: service.category || 'Service', quantity: 1, rate: 0, amount: 0 }],
    laborCharges: 0,
    discount: 0,
    validityDays: 30,
    notes: '',
    status: 'pending',
    serviceBookingId: service.id,
  } : undefined;

  const currentAdminName = displayName || 'Admin';

  // Cache of UID → { name, email } for fallback where older records lack *_ByName
  const [userInfo, setUserInfo] = useState<Record<string, { name?: string; email?: string }>>({});

  useEffect(() => {
    const uids = new Set<string>();
    if (service?.createdBy) uids.add(service.createdBy as string);
    if (service?.updatedBy) uids.add(service.updatedBy as string);
    if (service?.completedBy) uids.add(service.completedBy as string);
    if (service?.cancelledBy) uids.add(service.cancelledBy as string);
    if (quotation?.createdBy) uids.add(quotation.createdBy as string);
    if (quotation?.updatedBy) uids.add(quotation.updatedBy as string);
    if ((quotation as any)?.acceptedBy) uids.add(((quotation as any).acceptedBy as string));

    const fetchNames = async () => {
      const updates: Record<string, { name?: string; email?: string }> = {};
      await Promise.all(Array.from(uids).map(async (uid) => {
        if (!uid || userInfo[uid]) return;
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          const data = snap.exists() ? (snap.data() as any) : null;
          const name = (data?.displayName as string) || undefined;
          const email = (data?.email as string) || undefined;
          updates[uid] = { name, email };
        } catch {
          updates[uid] = { name: undefined, email: undefined };
        }
      }));
      if (Object.keys(updates).length) {
        setUserInfo((prev) => ({ ...prev, ...updates }));
      }
    };

    fetchNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.createdBy, service?.updatedBy, service?.completedBy, service?.cancelledBy, quotation?.createdBy, quotation?.updatedBy, (quotation as any)?.acceptedBy]);

  const userLabel = (uid?: string, explicitEmail?: string): string => {
    if (explicitEmail) return explicitEmail;
    if (!uid) return '-';
    const info = userInfo[uid];
    return info?.email || uid;
  };

  const historyItems = [
    service?.createdAt ? {
      label: 'Booking Created',
      user: userLabel(service?.createdBy as string, (service as any)?.createdByEmail),
      time: formatHistoryDate(service.createdAt),
    } : null,
    service?.rescheduledAt ? {
      label: 'Service Rescheduled',
      user: userLabel(service?.rescheduledBy as string, (service as any)?.rescheduledByEmail),
      time: formatHistoryDate((service as any)?.rescheduledAt),
      detail: `Rescheduled to ${formatDateTime12(service?.scheduledDate)}`,
    } : null,
    quotation?.createdAt ? {
      label: 'Quotation Created',
      user: userLabel(quotation?.createdBy as string, (quotation as any)?.createdByEmail) || userLabel(service?.createdBy as string, (service as any)?.createdByEmail),
      time: formatHistoryDate(quotation?.createdAt),
    } : null,
    quotation?.updatedAt ? {
      label: 'Quotation Updated',
      user: userLabel(quotation?.updatedBy as string, (quotation as any)?.updatedByEmail),
      time: formatHistoryDate((quotation as any)?.updatedAt),
    } : null,
    quotation?.status === 'accepted' ? {
      label: 'Quotation Accepted',
      user: userLabel((quotation as any)?.acceptedBy as string, (quotation as any)?.acceptedByEmail),
      time: formatHistoryDate((quotation as any)?.acceptedAt),
    } : null,
    service?.invoiceId ? {
      label: 'Invoice Generated',
      user: userLabel(service?.completedBy as string, (service as any)?.completedByEmail),
      time: formatHistoryDate(service?.completedAt || service?.updatedAt),
    } : null,
    service?.status === 'completed' ? {
      label: 'Work Completed',
      user: userLabel(service?.completedBy as string, (service as any)?.completedByEmail),
      time: formatHistoryDate(service?.completedAt || service?.updatedAt),
    } : null,
    service?.status === 'cancelled' ? {
      label: 'Booking Cancelled',
      user: userLabel(service?.cancelledBy as string, (service as any)?.cancelledByEmail),
      time: formatHistoryDate((service as any)?.cancelledAt || service?.updatedAt),
      detail: `Reason: ${(service as any)?.cancelReason || 'No reason provided'}`,
    } : null,
  ].filter((item) => item && item.time) as Array<{ label: string; user: string; time: string; detail?: string }>;

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!service) return <div className="p-6 text-center text-red-600">Service not found</div>;

  return (
    <div className="space-y-6 px-3 sm:px-0 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Service Booking</h1>
          <p className="text-sm text-gray-500 mt-1 break-words">Job Card: {service.jobCardNo}</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.back()}>Back</Button>
      </header>

      {status && (
        <div className={`p-4 rounded ${status.includes('success') || status.includes('completed') || status.includes('rescheduled') ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
          {status}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Breadcrumb */}
          {isCancelled ? (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm font-medium">Job cancelled</div>
          ) : (
            <div className="p-4 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-2">
                <span>Progress</span>
                <span className="text-gray-500">Next: {progressSteps[activeStepIndex]?.label}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-3">
                {progressSteps.map((step, idx) => {
                  const isDone = step.done;
                  const isActive = idx === activeStepIndex;
                  const isOptionalPending = step.optional && step.hasData === false;
                  const circleClass = isOptionalPending
                    ? 'bg-yellow-200 text-yellow-900'
                    : isDone
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-600';
                  const barClass = idx < progressSteps.length - 1
                    ? isOptionalPending
                      ? 'from-yellow-200 to-yellow-200'
                      : isDone
                        ? 'from-green-500 to-green-400'
                        : isActive
                          ? 'from-blue-400 to-blue-300'
                          : 'from-gray-200 to-gray-200'
                    : '';
                  const labelClass = isOptionalPending
                    ? 'text-yellow-800'
                    : isDone
                      ? 'text-gray-800'
                      : isActive
                        ? 'text-blue-700'
                        : 'text-gray-500';
                  return (
                    <div key={step.key} className="flex items-center gap-2 w-full sm:flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shadow ${circleClass}`}>{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className={` sm:text-[11px] text-[12px] font-semibold truncate ${labelClass}`}>{step.label}</p>
                        {idx < progressSteps.length - 1 && (
                          <div className={`hidden sm:block h-1 rounded-full bg-gradient-to-r ${barClass} mt-2`} aria-hidden />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                <span className="text-gray-600">Source:</span>
                <span className="font-medium">{sourceLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled Date:</span>
                <span className="font-medium">{formatDateTime12(service.scheduledDate)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Quotation:</span>
                {quotationLoading ? (
                  <span className="text-xs text-gray-500">Checking…</span>
                ) : (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${quotationBadgeClass}`}>
                    {quotationLabelMap[quotationStatus] || quotationStatus}
                  </span>
                )}
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Job Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${service.status === 'completed' ? 'bg-green-100 text-green-800' : service.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                  {service.status || 'pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer Type:</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${customerTypeBadgeClass}`}>
                  {customerType === 'b2b' ? 'B2B' : 'B2C'}
                </span>
              </div>
            </div>
          </Card>

          {/* Customer Details */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Customer Details</h2>
              {!editing && service.status !== 'cancelled' && service.status !== 'completed' && (
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
                customerType === 'b2b' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Company Name</label>
                        <input
                          type="text"
                          value={editForm.companyName}
                          onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Contact Person</label>
                        <input
                          type="text"
                          value={editForm.contactName}
                          onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Contact Phone</label>
                        <input
                          type="text"
                          value={editForm.contactPhone}
                          onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Contact Email</label>
                        <input
                          type="email"
                          value={editForm.contactEmail}
                          onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      {/* <div>
                        <label className="block text-xs text-gray-600 mb-1">PO / Ref</label>
                        <input
                          type="text"
                          value={editForm.poRef}
                          onChange={(e) => setEditForm({ ...editForm, poRef: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div> */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">VAT / TRN</label>
                        <input
                          type="text"
                          value={editForm.companyVat}
                          onChange={(e) => setEditForm({ ...editForm, companyVat: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    {/* <div>
                      <label className="block text-xs text-gray-600 mb-1">Notes</label>
                      <textarea
                        value={editForm.servicesHistory}
                        onChange={(e) => setEditForm({ ...editForm, servicesHistory: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                        rows={2}
                      />
                    </div> */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Source</label>
                      <select
                        value={editForm.source}
                        onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select Source</option>
                        <option value="lead">Lead</option>
                        <option value="direct">Direct Booking</option>
                        <option value="referral">Referral</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Country</label>
                        <input
                          type="text"
                          value={editForm.country}
                          onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">State</label>
                        <input
                          type="text"
                          value={editForm.state}
                          onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">City</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Address</label>
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleUpdate} className="flex-1 bg-green-600 hover:bg-green-700">
                        💾 Save Changes
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">First Name</label>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Mobile</label>
                      <input
                        type="text"
                        value={editForm.mobileNo}
                        onChange={(e) => setEditForm({ ...editForm, mobileNo: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Source</label>
                      <select
                        value={editForm.source}
                        onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select Source</option>
                        <option value="lead">Lead</option>
                        <option value="direct">Direct Booking</option>
                        <option value="referral">Referral</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Country</label>
                      <input
                        type="text"
                        value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">State</label>
                      <input
                        type="text"
                        value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">City</label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Address</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </>
                )
              ) : (
                <>
                  {customerType === 'b2b' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customer Type:</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${customerTypeBadgeClass}`}>B2B</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Company:</span>
                        <span className="font-medium">{service.companyName || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contact Person:</span>
                        <span className="font-medium">{service.contactName || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contact Phone:</span>
                        <span className="font-medium">{service.contactPhone || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contact Email:</span>
                        <span className="font-medium">{service.contactEmail || '-'}</span>
                      </div>
                      {/* <div className="flex justify-between">
                        <span className="text-gray-600">PO / Ref:</span>
                        <span className="font-medium">{service.poRef || '-'}</span>
                      </div> */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">VAT / TRN:</span>
                        <span className="font-medium">{service.companyVat || '-'}</span>
                      </div>
                      {/* <div className="flex justify-between">
                        <span className="text-gray-600">Notes:</span>
                        <span className="font-medium truncate max-w-[220px]">{service.servicesHistory || '-'}</span>
                      </div> */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Source:</span>
                        <span className="font-medium">{sourceLabel}</span>
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
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customer Type:</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${customerTypeBadgeClass}`}>B2C</span>
                      </div>
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
                        <span className="text-gray-600">Source:</span>
                        <span className="font-medium">{sourceLabel}</span>
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
                </>
              )}
            </div>
          </Card>

          {/* Vehicle Details */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Vehicle Details</h2>
            <div className="space-y-3 text-sm">
              {editing && customerType === 'b2c' ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Vehicle Type</label>
                    <select
                      value={editForm.vehicleType}
                      onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value })}
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
                      onChange={(e) => setEditForm({ ...editForm, vehicleBrand: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Model</label>
                    <input
                      type="text"
                      value={editForm.modelName}
                      onChange={(e) => setEditForm({ ...editForm, modelName: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Number Plate</label>
                    <input
                      type="text"
                      value={editForm.numberPlate}
                      onChange={(e) => setEditForm({ ...editForm, numberPlate: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Fuel Type</label>
                    <select
                      value={editForm.fuelType}
                      onChange={(e) => setEditForm({ ...editForm, fuelType: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">Select Fuel</option>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">VIN (optional)</label>
                    <input
                      type="text"
                      value={editForm.vinNumber}
                      onChange={(e) => setEditForm({ ...editForm, vinNumber: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Enter VIN"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mulkiya Images (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMulkiyaUpload}
                      className="w-full border rounded px-3 py-2 text-sm bg-white cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      💡 To select multiple images: Hold <strong>Ctrl</strong> (Windows) or <strong>Cmd</strong> (Mac) while clicking images
                    </p>
                    {mulkiyaUploading && (
                      <p className="text-[11px] text-gray-600 mt-1">Uploading mulkiya images…</p>
                    )}

                    {mulkiyaPreview.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-600 mb-2">Selected Images ({mulkiyaPreview.length}):</p>
                        <div className="grid grid-cols-3 gap-2">
                          {mulkiyaPreview.map((preview, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={preview}
                                alt={`Mulkiya ${idx + 1}`}
                                className="w-full h-24 object-cover rounded border"
                              />
                              <button
                                type="button"
                                onClick={() => removeMulkiya(idx)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {editForm.mulkiyaUrl && (() => {
                      let urls: string[] = [];
                      try {
                        urls = JSON.parse(editForm.mulkiyaUrl);
                      } catch {
                        urls = editForm.mulkiyaUrl ? [editForm.mulkiyaUrl] : [];
                      }
                      return urls.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-xs text-gray-600 mb-2">Existing Images ({urls.length}):</p>
                          <div className="grid grid-cols-3 gap-2">
                            {urls.map((url, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={url}
                                  alt={`Mulkiya ${idx + 1}`}
                                  className="w-full h-24 object-cover rounded border"
                                />
                                <button
                                  type="button"
                                  aria-label="Remove image"
                                  onClick={() => {
                                    let arr: string[] = [];
                                    try {
                                      arr = JSON.parse(editForm.mulkiyaUrl);
                                    } catch {
                                      arr = editForm.mulkiyaUrl ? [editForm.mulkiyaUrl] : [];
                                    }
                                    const newArr = arr.filter((_, i) => i !== idx);
                                    setEditForm({ ...editForm, mulkiyaUrl: newArr.length ? JSON.stringify(newArr) : '' });
                                  }}
                                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
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
                customerType === 'b2b' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Number of Vehicles:</span>
                      <span className="font-medium">{service.vehicleCount || vehiclesList.length || 1}</span>
                    </div>
                    <div className="space-y-4">
                      {vehiclesList.map((vehicle: any, idx: number) => {
                        const isEditingVehicle = editingVehicleIndex === idx;
                        return (
                          <div
                            key={`${vehicle.numberPlate || vehicle.vinNumber || idx}-${idx}`}
                            className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800">Vehicle {idx + 1}</span>
                                {vehicle.category ? (
                                  <span className="text-[11px] px-2 py-1 rounded bg-blue-100 text-blue-800">Category: {vehicle.category}</span>
                                ) : null}
                              </div>
                              {service.status !== 'cancelled' && service.status !== 'completed' ? (
                                isEditingVehicle ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={saveVehicleEdit}
                                      disabled={savingVehicleIndex === idx}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={cancelVehicleEdit}
                                      disabled={savingVehicleIndex === idx}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startVehicleEdit(idx)}
                                  >
                                    ✏️ Edit
                                  </Button>
                                )
                              ) : null}
                            </div>

                            {isEditingVehicle ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Vehicle Type</label>
                                  <select
                                    value={vehicleEditForm.vehicleType}
                                    onChange={(e) => setVehicleEditForm({ ...vehicleEditForm, vehicleType: e.target.value })}
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
                                    value={vehicleEditForm.vehicleBrand}
                                    onChange={(e) => setVehicleEditForm({ ...vehicleEditForm, vehicleBrand: e.target.value })}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Model</label>
                                  <input
                                    type="text"
                                    value={vehicleEditForm.modelName}
                                    onChange={(e) => setVehicleEditForm({ ...vehicleEditForm, modelName: e.target.value })}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Number Plate</label>
                                  <input
                                    type="text"
                                    value={vehicleEditForm.numberPlate}
                                    onChange={(e) => setVehicleEditForm({ ...vehicleEditForm, numberPlate: e.target.value })}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Fuel Type</label>
                                  <select
                                    value={vehicleEditForm.fuelType}
                                    onChange={(e) => setVehicleEditForm({ ...vehicleEditForm, fuelType: e.target.value })}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                  >
                                    <option value="">Select Fuel</option>
                                    <option value="petrol">Petrol</option>
                                    <option value="diesel">Diesel</option>
                                    <option value="electric">Electric</option>
                                    <option value="hybrid">Hybrid</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">VIN (optional)</label>
                                  <input
                                    type="text"
                                    value={vehicleEditForm.vinNumber}
                                    onChange={(e) => setVehicleEditForm({ ...vehicleEditForm, vinNumber: e.target.value })}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                    placeholder="Enter VIN"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Category (optional)</label>
                                  <input
                                    type="text"
                                    value={vehicleEditForm.category}
                                    onChange={(e) => setVehicleEditForm({ ...vehicleEditForm, category: e.target.value })}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Type:</span>
                                  <span className="font-medium">{vehicle.vehicleType || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Brand:</span>
                                  <span className="font-medium">{vehicle.vehicleBrand || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Model:</span>
                                  <span className="font-medium">{vehicle.modelName || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Number Plate:</span>
                                  <span className="font-medium">{vehicle.numberPlate || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Fuel Type:</span>
                                  <span className="font-medium">{vehicle.fuelType || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">VIN:</span>
                                  <span className="font-medium">{vehicle.vinNumber || '-'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center gap-3 pt-1">
                      <span className="text-gray-600">Mulkiya:</span>
                      {mulkiyaUrls.length > 0 ? (
                        <span className="font-medium text-orange-600">{mulkiyaUrls.length} image(s)</span>
                      ) : (
                        <span className="font-medium">-</span>
                      )}
                    </div>
                    {mulkiyaUrls.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {mulkiyaUrls.map((url, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedMulkiyaIndex(idx)}
                            className="border rounded overflow-hidden hover:border-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <img src={url} alt={`Mulkiya ${idx + 1}`} className="w-full h-20 object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : null}
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
                      <span className="text-gray-600">VIN:</span>
                      <span className="font-medium">{service.vinNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-gray-600">Mulkiya:</span>
                      {mulkiyaUrls.length > 0 ? (
                        <span className="font-medium text-orange-600">{mulkiyaUrls.length} image(s)</span>
                      ) : (
                        <span className="font-medium">-</span>
                      )}
                    </div>
                    {mulkiyaUrls.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {mulkiyaUrls.map((url, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedMulkiyaIndex(idx)}
                            className="border rounded overflow-hidden hover:border-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <img src={url} alt={`Mulkiya ${idx + 1}`} className="w-full h-20 object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fuel Type:</span>
                      <span className="font-medium">{service.fuelType}</span>
                    </div>
                  </>
                )
              )}
            </div>
          </Card>

          {/* Pre-Inspection Capture & View */}
          <Card className="p-6 border-2 border-orange-200 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-orange-700">Pre-Inspection Checklist</h2>
                {hasPreInspection && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">Saved</span>
                )}
              </div>
              {hasPreInspection ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreInspectionList(!showPreInspectionList)}
                  className="text-xs"
                >
                  {showPreInspectionList ? 'Hide Pre-Inspection' : 'Open Pre-Inspection'}
                </Button>
              ) : (
                <span className="text-xs px-3 py-1 rounded border border-yellow-300 bg-yellow-50 text-yellow-800">No inspection yet</span>
              )}
            </div>

            {/* Capture Form */}
            {service.status !== 'completed' && service.status !== 'cancelled' && (
              <div className="space-y-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">Notes</label>
                  <Textarea
                    placeholder="Add pre-inspection notes..."
                    value={preMessage}
                    onChange={(e) => setPreMessage(e.target.value)}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">Upload Images </label>
                  <input type="file" accept="image/*" className='border border-gray-50 bg-white p-1 rounded cursor-pointer' multiple onChange={handlePreImageUpload} />
                  {(preImagePreview.length > 0) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {preImagePreview.map((src, idx) => (
                        <div key={idx} className="relative border rounded overflow-hidden">
                          <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover" />
                          <button
                            type="button"
                            onClick={() => removePreImage(idx)}
                            className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">Upload Videos </label>
                  <input type="file" accept="video/*" className='border border-gray-50 bg-white p-1 rounded cursor-pointer' multiple onChange={handlePreVideoUpload} />
                  {(preVideoPreview.length > 0) && (
                    <div className="space-y-2">
                      {preVideoPreview.map((src, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm truncate">Video {idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <video src={src} className="w-28 h-16 object-cover rounded" controls />
                            <button
                              type="button"
                              onClick={() => removePreVideo(idx)}
                              className="text-xs text-red-600 underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                    onClick={savePreInspection}
                    disabled={savingPreInspection}
                  >
                    {savingPreInspection ? 'Saving...' : 'Save Pre-Inspection'}
                  </Button>
                  {(preMessage || preImagePreview.length > 0 || preVideoPreview.length > 0) && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setPreMessage(service.preInspection?.message || '');
                        setPreImages([]);
                        setPreVideos([]);
                        setPreImagePreview([]);
                        setPreVideoPreview([]);
                      }}
                    >
                      Reset Changes
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Existing Records */}
            {showPreInspectionList && (!service.preInspection || (!service.preInspection.message && (!service.preInspection.images?.length) && (!service.preInspection.videos?.length))) && (
              <div className="p-4 border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm rounded">
                No inspection made yet.
              </div>
            )}

            {showPreInspectionList && service.preInspection && (service.preInspection.message || service.preInspection.images?.length > 0 || service.preInspection.videos?.length > 0) && (
              <div className="space-y-6">
                {service.preInspection.message && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-700">Notes</h3>
                      {service.status !== 'completed' && service.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'bookedServices', service.id), {
                                'preInspection.message': ''
                              });
                              setService({
                                ...service,
                                preInspection: { ...(service.preInspection || {}), message: '' }
                              });
                              setStatus('Removed pre-inspection note');
                            } catch (err) {
                              safeConsoleError('Remove pre-inspection note error', err);
                            }
                          }}
                          className="ml-auto text-xs text-red-600 underline hover:text-red-700"
                        >
                          Remove Note
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 bg-gradient-to-r from-orange-50 to-gray-50 p-4 rounded-lg border border-orange-100 leading-relaxed whitespace-pre-wrap">
                      {service.preInspection.message}
                    </p>
                  </div>
                )}

                {service.preInspection.images && service.preInspection.images.length > 0 && (
                  <div>
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
                        <div
                          key={idx}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedImageIndex(idx)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedImageIndex(idx); }}
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
                            {service.status !== 'completed' && service.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const newImages = service.preInspection.images.filter((_: string, i: number) => i !== idx);
                                    await updateDoc(doc(db, 'bookedServices', service.id), {
                                      'preInspection.images': newImages
                                    });
                                    setService({
                                      ...service,
                                      preInspection: { ...(service.preInspection || {}), images: newImages }
                                    });
                                    setStatus('Removed pre-inspection image');
                                  } catch (err) {
                                    safeConsoleError('Remove pre-inspection image error', err);
                                  }
                                }}
                                className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <p className="text-xs text-white font-medium">Image {idx + 1}</p>
                          </div>
                        </div>
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
                                {service.status !== 'completed' && service.status !== 'cancelled' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const newVideos = service.preInspection.videos.filter((_: string, i: number) => i !== idx);
                                        await updateDoc(doc(db, 'bookedServices', service.id), {
                                          'preInspection.videos': newVideos
                                        });
                                        setService({
                                          ...service,
                                          preInspection: { ...(service.preInspection || {}), videos: newVideos }
                                        });
                                        setStatus('Removed pre-inspection video');
                                      } catch (err) {
                                        safeConsoleError('Remove pre-inspection video error', err);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Quotation</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                {quotationLoading ? (
                  <span className="text-xs text-gray-500">Loading…</span>
                ) : (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${quotationBadgeClass}`}>
                    {quotationLabelMap[quotationStatus] || quotationStatus}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">Invoice unlocks after the quotation is accepted.</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className={`flex-1 ${isCancelled || service.status === 'completed' ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                  onClick={() => setShowQuotationModal(true)}
                  disabled={isCancelled || service.status === 'completed'}
                  title={service.status === 'completed' ? 'Cannot update quotation - work is completed' : ''}
                >
                  {quotation ? 'Update Quotation' : 'Create Quotation'}
                </Button>
                {quotation?.id && (
                  <a
                    href={`/admin/quotation/${quotation.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 px-4 py-2 border rounded text-center text-sm font-medium ${isCancelled ? 'opacity-60 cursor-not-allowed bg-gray-100 text-gray-400' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    tabIndex={isCancelled ? -1 : 0}
                    aria-disabled={isCancelled}
                    style={isCancelled ? { pointerEvents: 'none' } : {}}
                  >
                    View Quotation
                  </a>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Actions</h3>
            <div className="space-y-3">
              {service.status !== 'completed' && service.status !== 'cancelled' && (
                <>
                  <Button
                    variant={rescheduling ? 'default' : 'outline'}
                    className={`w-full ${rescheduleDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (rescheduleDisabled) return;
                      setRescheduling(!rescheduling);
                    }}
                    disabled={rescheduleDisabled}
                    title={rescheduleDisabled ? 'Rescheduling disabled after a quotation is created' : undefined}
                  >
                    {rescheduling ? 'Close' : 'Reschedule'}
                  </Button>
                  <Button
                    className={`w-full ${canInvoice ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 text-gray-500'}`}
                    onClick={markComplete}
                    disabled={!canInvoice}
                    title={canInvoice ? 'Create invoice and mark complete' : 'Requires accepted quotation'}
                  >
                    {canInvoice ? 'Create Invoice & Complete Service' : 'Mark Complete (needs quote)'}
                  </Button>
                  {!canInvoice && (
                    <p className="text-[11px] text-red-600">Accept the quotation before generating an invoice.</p>
                  )}
                </>
              )}
              <Button
                variant="destructive"
                className={`w-full ${service.status === 'completed' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                onClick={() => deleteService()}
                disabled={service.status === 'cancelled' || service.status === 'completed'}
              >
                {service.status === 'cancelled'
                  ? 'Cancelled'
                  : service.status === 'completed'
                    ? 'Work is Completed'
                    : 'Cancel Booking'}
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
          {Array.isArray(service.invoices) && service.invoices.length > 0 && (
            <Card className="p-0 overflow-hidden border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-2 px-6 pt-6 pb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="font-semibold text-gray-900">Invoices Generated</h3>
              </div>
              <div className="text-sm text-gray-600 px-6 pb-2">
                {service.invoices.length} invoice{service.invoices.length > 1 ? 's' : ''} generated for this service.
              </div>
              <div className="divide-y divide-green-100">
                {service.invoices.map((inv: any, idx: number) => {
                  const paid = inv.partialPaidAmount ? parseFloat(inv.partialPaidAmount) : 0;
                  const total = inv.total ? parseFloat(inv.total) : 0;
                  const isPartial = inv.paymentStatus === 'partial';
                  const date = inv.createdAt ? new Date(inv.createdAt) : null;
                  return (
                    <div key={inv.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 bg-white hover:bg-green-50 transition-colors">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="font-medium text-gray-800 truncate">Invoice #{inv.invoiceNumber || inv.id}</span>
                        {date && (
                          <span className="text-xs text-gray-500">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                        {isPartial && (
                          <span className="text-xs text-yellow-800">
                            <span className="font-semibold">Partially Paid:</span> AED {paid.toFixed(2)} | <span className="font-semibold text-orange-700">Remaining:</span> AED {(total - paid).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <a
                        href={`/admin/invoice/${inv.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm transition-colors whitespace-nowrap"
                      >
                        View
                      </a>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {!service.invoices && service.invoiceId && (
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
                <a
                  href={`/admin/invoice/${service.invoiceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center px-4 py-2 rounded font-medium transition-colors"
                  style={{ display: 'inline-flex' }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Invoice
                </a>
              </div>
            </Card>
          )}

          {/* History */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">History</h3>
              <span className="text-[11px] text-gray-500">Latest activity</span>
            </div>
            {historyItems.length === 0 ? (
              <p className="text-sm text-gray-600">No history available yet.</p>
            ) : (
              <div className="space-y-3">
                {historyItems.map((item, idx) => (
                  <div
                    key={`${item.label}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.label}</p>
                        <p className="text-xs text-gray-600 truncate">By: {item.user}</p>
                        {item.detail && (
                          <p className="text-xs text-gray-700 break-words">{item.detail}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 sm:text-right sm:min-w-[160px]">{item.time}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Reschedule Form */}
          {rescheduling && !rescheduleDisabled && service.status !== 'completed' && service.status !== 'cancelled' && (
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

      {/* Mulkiya Image Lightbox Popup */}
      {selectedMulkiyaIndex !== null && service?.mulkiyaUrl && (() => {
        let urls: string[] = [];
        try {
          urls = JSON.parse(service.mulkiyaUrl);
        } catch {
          urls = service.mulkiyaUrl ? [service.mulkiyaUrl] : [];
        }

        const handlePrevMulkiya = () => {
          setSelectedMulkiyaIndex((prev) =>
            prev === null || prev === 0 ? urls.length - 1 : (prev as number) - 1
          );
        };

        const handleNextMulkiya = () => {
          setSelectedMulkiyaIndex((prev) =>
            prev === null ? 0 : ((prev as number) + 1) % urls.length
          );
        };

        return urls.length > 0 ? (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4"
            onClick={() => setSelectedMulkiyaIndex(null)}
          >
            <button
              onClick={() => setSelectedMulkiyaIndex(null)}
              className="absolute top-4 right-4 text-white hover:text-orange-500 transition-colors z-10 p-2 rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handlePrevMulkiya(); }}
              className="absolute left-4 text-white hover:text-orange-500 transition-colors z-10 p-2 rounded-full hover:bg-white/10"
              aria-label="Previous image"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleNextMulkiya(); }}
              className="absolute right-4 text-white hover:text-orange-500 transition-colors z-10 p-2 rounded-full hover:bg-white/10"
              aria-label="Next image"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="max-w-7xl max-h-full w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={urls[selectedMulkiyaIndex!]}
                alt={`Mulkiya image ${(selectedMulkiyaIndex as number) + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="mt-4 text-center">
                <p className="text-white text-sm font-medium">
                  Mulkiya Image {(selectedMulkiyaIndex as number) + 1} of {urls.length}
                </p>
                <a
                  href={urls[selectedMulkiyaIndex!]}
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
        ) : null;
      })()}

      {/* Quotation Modal */}
      {showQuotationModal && service && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowQuotationModal(false)} />
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full z-10 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{quotation ? 'Update Quotation' : 'Create Quotation'}</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowQuotationModal(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <QuotationForm
                quotation={quotation || quotationSeed}
                serviceBookingId={service.id}
                vehiclesList={service?.customerType === 'b2b' ? (Array.isArray(service.vehicles) ? service.vehicles : []) : undefined}
                onCreated={(quoteId, meta) => {
                  setShowQuotationModal(false);
                  setStatus('Quotation saved');
                  if (meta?.status) {
                    setQuotation((prev: any) => ({ ...(prev || { id: quoteId }), id: quoteId, status: meta.status }));
                  }
                }}
                onCancel={() => setShowQuotationModal(false)}
              />
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
                      <p className="font-medium">
                        {service.firstName && service.lastName
                          ? `${service.firstName} ${service.lastName}`
                          : service.companyName
                            ? service.companyName
                            : 'N/A'}
                        <span
                          className={
                            'ml-2 px-2 py-0.5 rounded text-xs font-semibold ' +
                            (service.customerType?.toLowerCase() === 'b2b'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300')
                          }
                        >
                          {service.customerType?.toUpperCase() === 'B2B' ? 'B2B' : 'B2C'}
                        </span>
                      </p>
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
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={e => {
                              const val = e.target.value;
                              updateBillingItem(index, 'quantity', val === '' ? 0 : parseFloat(val));
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Rate"
                            min="0"
                            step="1"
                            value={item.rate === 0 ? '' : item.rate}
                            onChange={e => {
                              const val = e.target.value;
                              updateBillingItem(index, 'rate', val === '' ? 0 : parseFloat(val));
                            }}
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
                    value={laborCharges === 0 ? '' : laborCharges}
                    step="1" 
                    onChange={e => {
                      const val = e.target.value;
                      setLaborCharges(val === '' ? 0 : parseFloat(val));
                    }} 
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
                    value={discount === 0 ? '' : discount}
                    onChange={e => {
                      const val = e.target.value;
                      setDiscount(val === '' ? 0 : parseFloat(val));
                    }}
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

                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus || 'full'}
                    onChange={e => {
                      setPaymentStatus(e.target.value);
                      if (e.target.value === 'full') setPartialPaidAmount('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="full">Full Paid</option>
                    <option value="partial">Partial Paid</option>
                  </select>
                </div>

                {/* Partial Paid Amount */}
                {paymentStatus === 'partial' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount Paid (Min AED 100)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={calculateBillingTotal().grandTotal}
                      step="1"
                      value={partialPaidAmount}
                      onChange={e => {
                        // Allow clearing and typing freely
                        setPartialPaidAmount(e.target.value);
                      }}
                      onBlur={e => {
                        let val = e.target.value;
                        if (val === '' || isNaN(Number(val))) {
                          setPartialPaidAmount('');
                        } else {
                          let num = parseFloat(val);
                          if (num < 100) num = 100;
                          if (num > calculateBillingTotal().grandTotal) num = calculateBillingTotal().grandTotal;
                          setPartialPaidAmount(num.toString());
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="Enter amount paid"
                    />
                    {partialPaidAmount && !isNaN(Number(partialPaidAmount)) && (
                      <div className="mt-2 text-sm">
                        <span className="text-green-700 font-semibold">Partial amount has been paid: AED {parseFloat(partialPaidAmount).toFixed(2)}</span><br />
                        <span className="text-orange-700 font-semibold">Remaining balance to be paid: AED {(calculateBillingTotal().grandTotal - parseFloat(partialPaidAmount)).toFixed(2)}</span>
                      </div>
                    )}
                    
                  </div>
                )}

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
                    {/* General Notes field, always visible in form */}
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="Add any notes for this invoice (optional)"
                        value={partialPaymentNotes}
                        onChange={e => setPartialPaymentNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
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
                    {paymentStatus === 'partial' && partialPaidAmount && !isNaN(Number(partialPaidAmount)) && (
                      <>
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-yellow-800 font-semibold">Partial Amount Paid:</span>
                          <span className="text-yellow-900 font-bold">AED {parseFloat(partialPaidAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-orange-700 font-semibold">Remaining Balance:</span>
                          <span className="text-orange-800 font-bold">AED {(calculateBillingTotal().grandTotal - parseFloat(partialPaidAmount)).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {status && (
                  <div className={`p-3 rounded text-sm ${status.includes('Failed') || status.includes('Please')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                    {status}
                  </div>
                )}

                {/* Partial Payment History */}
                {Array.isArray(service.invoices) && service.invoices.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">Partial Payment History</h4>
                    <div className="space-y-2">
                      {service.invoices
                        .filter((inv: any) => inv.paymentStatus === 'partial')
                        .map((inv: any, idx: number) => {
                          const paid = inv.partialPaidAmount ? parseFloat(inv.partialPaidAmount) : 0;
                          const total = inv.total ? parseFloat(inv.total) : 0;
                          const remaining = total - paid;
                          const date = inv.createdAt ? new Date(inv.createdAt.seconds ? inv.createdAt.seconds * 1000 : inv.createdAt) : null;
                          return (
                            <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <span className="font-medium text-yellow-900">Invoice {inv.invoiceNumber}</span>
                                <span className="text-yellow-700">{date ? date.toLocaleDateString() : 'N/A'}</span>
                              </div>
                              <div className="space-y-0.5 text-yellow-800">
                                <div className="flex justify-between">
                                  <span>Paid:</span>
                                  <span className="font-medium">AED {paid.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Remaining:</span>
                                  <span className="font-medium">AED {remaining.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Terms:</span>
                                  <span className="font-medium">{inv.paymentTerms === 'card' ? 'Card' : inv.paymentTerms === 'cash' ? 'Cash' : inv.paymentTerms === 'bank' ? 'Bank' : inv.paymentTerms === 'tabby' ? 'Tabby/Tamara' : inv.paymentTermsOther || inv.paymentTerms}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {paymentStatus === 'partial' ? (
                  <button
                    onClick={async () => {
                      await handleBillingSavePending();
                      clearBillingState();
                    }}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-lg transition-colors"
                    disabled={partialPaidAmount === '' || isNaN(Number(partialPaidAmount)) || Number(partialPaidAmount) < 100}
                    title={
                      partialPaidAmount === '' || isNaN(Number(partialPaidAmount)) || Number(partialPaidAmount) < 100
                        ? 'Please enter a valid partial paid amount (min 100 AED) to proceed.'
                        : undefined
                    }
                  >
                    Save Invoice (Pending)
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await handleBillingSave();
                      clearBillingState();
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    Save Invoice & Mark Complete
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowBilling(false);
                    clearBillingState();
                  }}
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
                <a
                  href={`/admin/invoice/${createdInvoiceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  View Invoice
                </a>
                <a
                  href={`/admin/invoice/${createdInvoiceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  Download PDF
                </a>
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
