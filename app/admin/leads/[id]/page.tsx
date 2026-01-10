"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { findOrCreateCustomer } from '@/lib/firestore/customers';
import { formatDateTime } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';
import { useUser } from '@/lib/userContext';
import { hasPermission } from '@/lib/permissions';

interface Lead {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  mode?: string;
  message?: string;
  createdAt?: { seconds: number } | { toDate: () => Date };
}

interface CustomerFormSubmission {
  id: string;
  category: string;
  vehicleType: string;
  vehicleBrand: string;
  modelName: string;
  numberPlate: string;
  fuelType: string;
  vinNumber: string;
  country: string;
  state: string;
  city: string;
  address: string;
  mulkiyaUrls?: string[];
  submittedAt?: Timestamp | { seconds: number } | { toDate: () => Date };
  submittedEmail?: string;
  [key: string]: any;
}

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useUser();
  const id = params?.id as string | undefined;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedBookings, setRelatedBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [showBookService, setShowBookService] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    scheduledDate: '',
    category: '',
    vehicleType: '',
    vehicleBrand: '',
    modelName: '',
    numberPlate: '',
    fuelType: '',
    vinNumber: '',
    mulkiyaUrl: '',
    country: '',
    state: '',
    city: '',
    address: '',
  });
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [mulkiyaFiles, setMulkiyaFiles] = useState<File[]>([]);
  const [mulkiyaPreview, setMulkiyaPreview] = useState<string[]>([]);
  const [mulkiyaUploading, setMulkiyaUploading] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [sendingFormLink, setSendingFormLink] = useState(false);
  const [formLinkModal, setFormLinkModal] = useState(false);
  const [formLink, setFormLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [customerFormSubmissions, setCustomerFormSubmissions] = useState<CustomerFormSubmission[]>([]);
  const [viewingSubmissionId, setViewingSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'crm-leads', id));
        if (!snap.exists()) {
          setError('Lead not found');
          setLead(null);
        } else {
          const leadData = snap.data() as any;
          setLead({ ...leadData, id: snap.id });
          // Fetch related bookings
          fetchRelatedBookings(id);
          // Fetch notes
          setNotes(leadData.notes || []);
          // Fetch customer form submissions
          fetchCustomerFormSubmissions(id);
        }
      } catch (err: any) {
        safeConsoleError('Lead fetch error', err);
        setError(err?.message || 'Unable to fetch lead');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    const bookingsQuery = query(collection(db, 'bookedServices'));
    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        setAllBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => safeConsoleError('All bookings fetch error', err)
    );

    return () => unsubscribe();
  }, []);

  async function fetchRelatedBookings(leadId: string) {
    setBookingsLoading(true);
    try {
      const q = query(
        collection(db, 'bookedServices'),
        where('sourceLeadId', '==', leadId)
      );
      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRelatedBookings(bookings);
    } catch (err: any) {
      safeConsoleError('Error fetching bookings', err);
    } finally {
      setBookingsLoading(false);
    }
  }

  async function fetchCustomerFormSubmissions(leadId: string) {
    try {
      const submissionsRef = collection(db, 'crm-leads', leadId, 'customerFormSubmissions');
      const q = query(submissionsRef);
      const snapshot = await getDocs(q);
      const submissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CustomerFormSubmission));
      
      // Helper function to safely convert timestamp to Date
      const getTime = (timestamp: any): number => {
        if (!timestamp) return 0;
        if (typeof timestamp.toDate === 'function') {
          return timestamp.toDate().getTime();
        }
        if (typeof timestamp.seconds === 'number') {
          return new Date(timestamp.seconds * 1000).getTime();
        }
        return 0;
      };
      
      setCustomerFormSubmissions(submissions.sort((a, b) => {
        const aTime = getTime(a.submittedAt);
        const bTime = getTime(b.submittedAt);
        return bTime - aTime;
      }));
    } catch (err: any) {
      safeConsoleError('Error fetching customer form submissions:', err);
    }
  }

  function generateJobCardNo() {
    return 'J' + Date.now().toString().slice(-6);
  }

  const handleMulkiyaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setMulkiyaFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMulkiyaPreview((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMulkiya = (index: number) => {
    setMulkiyaFiles((prev) => prev.filter((_, i) => i !== index));
    setMulkiyaPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  ];

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  const isDateDisabled = (date: Date) => isWeekend(date);

  const getServicesByDate = (date: Date) => {
    return allBookings.filter((service) => {
      const serviceDate = service.scheduledDate?.toDate
        ? service.scheduledDate.toDate()
        : new Date(service.scheduledDate);
      return (
        serviceDate.getDate() === date.getDate() &&
        serviceDate.getMonth() === date.getMonth() &&
        serviceDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const formatTimeLabel = (time: string) => {
    const [h, m] = time.split(':');
    let hour = Number(h);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${m} ${suffix}`;
  };

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim() || !id) return;

    setSavingNote(true);
    try {
      const updatedNotes = [
        ...notes,
        {
          id: Date.now().toString(),
          text: newNote.trim(),
          createdAt: Timestamp.now(),
          createdBy: role || 'User',
        }
      ];
      
      await updateDoc(doc(db, 'crm-leads', id), {
        notes: updatedNotes,
      });

      setNotes(updatedNotes);
      setNewNote('');
    } catch (err: any) {
      safeConsoleError('Error adding note', err);
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!id) return;
    
    try {
      const updatedNotes = notes.filter((note) => note.id !== noteId);
      await updateDoc(doc(db, 'crm-leads', id), {
        notes: updatedNotes,
      });
      setNotes(updatedNotes);
    } catch (err: any) {
      safeConsoleError('Error deleting note', err);
    }
  }

  const isTimeDisabled = (time: string) => {
    if (!selectedDate) return false;
    if (isPastDate(selectedDate)) return true;
    const today = new Date();
    if (selectedDate.toDateString() === today.toDateString()) {
      const [hours, minutes] = time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return timeDate < today;
    }
    return false;
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [] as JSX.Element[];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border bg-gray-50" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayServices = getServicesByDate(date);
      const disabled = isDateDisabled(date);
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <button
          type="button"
          key={day}
          onClick={() => !disabled && setSelectedDate(date)}
          className={`p-2 min-h-[96px] border text-left transition-colors focus:outline-none ${
            disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isSelected
                ? 'bg-orange-100 border-orange-500 shadow-inner'
                : 'hover:bg-orange-50'
          } ${isPastDate(date) ? 'opacity-80' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-sm">{day}</span>
            {dayServices.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {dayServices.length}
              </span>
            )}
          </div>
          <div className="mt-1 space-y-1 text-[11px]">
            {dayServices.slice(0, 2).map((service, idx) => (
              <div
                key={idx}
                className={`px-1 py-0.5 rounded text-white truncate ${
                  service.status === 'completed'
                    ? 'bg-green-500'
                    : service.status === 'cancelled'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                }`}
              >
                {service.firstName || 'Booking'}
              </div>
            ))}
            {dayServices.length > 2 && (
              <div className="text-gray-500">+{dayServices.length - 2} more</div>
            )}
          </div>
        </button>
      );
    }

    return days;
  };

  async function handleSendFormLink() {
    if (!lead?.email || !id) {
      alert('❌ Customer email not found');
      return;
    }

    setSendingFormLink(true);
    try {
      const response = await fetch('/api/send-form-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: id,
          email: lead.email,
          name: lead.name,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('API Error:', data);
        alert(`❌ ${data.error || 'Failed to send form'}`);
        return;
      }

      // Extract the token and build the form link
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const token = data.token;
      const link = `${appUrl}/customer/book-service/${token}`;
      
      setFormLink(link);
      setFormLinkModal(true);
      setCopySuccess(false);
    } catch (error: any) {
      safeConsoleError('Error sending form link:', error);
      alert(`❌ Error: ${error.message || 'Error sending form link'}`);
    } finally {
      setSendingFormLink(false);
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleWhatsAppShare = () => {
    const message = `Hi ${lead?.name || 'there'},\n\nPlease fill out your booking form using this link:\n\n${formLink}\n\nThis link expires in 24 hours.\n\nThank you!`;
    const encodedMessage = encodeURIComponent(message);
    const phone = lead?.phone?.replace(/\D/g, '') || '';
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  async function handleBookService(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !id) return;

    if (!selectedDate || !selectedTime) {
      setBookingStatus('Select a date and time before booking');
      return;
    }

    if (isDateDisabled(selectedDate) || isTimeDisabled(selectedTime)) {
      setBookingStatus('Please choose a weekday slot in working hours');
      return;
    }

    const scheduledDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    scheduledDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    if (scheduledDateTime < new Date()) {
      setBookingStatus('Selected time is in the past');
      return;
    }

    if (!bookingForm.category) {
      setBookingStatus('Please select a service category');
      return;
    }

    setBookingLoading(true);
    setBookingStatus('Creating booking...');

    try {
      const nameParts = (lead.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Sync customer to Customer module
      await findOrCreateCustomer({
        firstName,
        lastName,
        email: lead.email,
        mobile: lead.phone,
        address: bookingForm.address,
        city: bookingForm.city,
        country: bookingForm.country,
        state: bookingForm.state,
      });

      // Create booking
      const jobCardNo = generateJobCardNo();
      
      // Upload mulkiya images if provided
      let uploadedMulkiyaUrls: string[] = [];
      if (mulkiyaFiles.length > 0) {
        setMulkiyaUploading(true);
        setBookingStatus('Uploading mulkiya images...');
        
        for (const file of mulkiyaFiles) {
          const storageRef = ref(storage, `mulkiya/${jobCardNo}/${file.name}-${Date.now()}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          uploadedMulkiyaUrls.push(url);
        }
        
        setMulkiyaUploading(false);
        setBookingStatus('Creating booking...');
      }
      
      const bookingRef = await addDoc(collection(db, 'bookedServices'), {
        jobCardNo,
        category: bookingForm.category,
        scheduledDate: Timestamp.fromDate(scheduledDateTime),
        firstName,
        lastName,
        mobileNo: lead.phone || '',
        email: lead.email || '',
        country: bookingForm.country,
        state: bookingForm.state,
        city: bookingForm.city,
        address: bookingForm.address,
        vehicleType: bookingForm.vehicleType,
        vehicleBrand: bookingForm.vehicleBrand,
        modelName: bookingForm.modelName,
        numberPlate: bookingForm.numberPlate,
        fuelType: bookingForm.fuelType,
        vinNumber: bookingForm.vinNumber,
        mulkiyaUrl: uploadedMulkiyaUrls.length > 0 ? JSON.stringify(uploadedMulkiyaUrls) : bookingForm.mulkiyaUrl,
        preInspection: {
          message: '',
          images: [],
          videos: [],
        },
        status: 'pending',
        quotationStatus: 'not_created',
        quotationId: null,
        createdAt: Timestamp.now(),
        sourceLeadId: id,
      });

      // Update lead status
      await updateDoc(doc(db, 'crm-leads', id), {
        status: 'converted',
        convertedAt: Timestamp.now(),
      });

      // Send booking confirmation email
      try {
        const customerEmail = lead.email;
        const customerName = lead.name || 'Customer';
        const customerPhone = lead.phone || '';

        if (customerEmail) {
          console.log('📧 Sending booking confirmation email to:', customerEmail);

          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emailType: 'booking-confirmation',
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              service: bookingForm.category,
              jobCardNo,
              scheduledDate: scheduledDateTime.toISOString(),
              vehicleDetails: {
                vehicleBrand: bookingForm.vehicleBrand,
                modelName: bookingForm.modelName,
                numberPlate: bookingForm.numberPlate,
              },
            }),
          });

          const emailResult = await emailResponse.json();

          if (!emailResponse.ok || !emailResult.success) {
            console.warn('⚠️ Email sending warning:', emailResult.error || 'Unknown error');
          } else {
            console.log('✅ Booking email sent successfully:', {
              to: customerEmail,
              resendId: emailResult.id,
            });
          }
        } else {
          console.warn('⚠️ No customer email provided for booking confirmation');
        }
      } catch (emailErr: any) {
        console.error('❌ Booking confirmation email error:', emailErr);
        // Don't fail the booking if email fails
      }

      setBookingStatus('✓ Service booked successfully!');
      setTimeout(() => {
        router.push(`/admin/book-service/${bookingRef.id}`);
      }, 1500);
      setSelectedTime('09:00');
      
      // Refresh related bookings
      if (id) fetchRelatedBookings(id);
    } catch (err: any) {
      safeConsoleError('Booking error', err);
      setBookingStatus('Error: ' + err.message);
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className="p-1 sm:p-6 max-w-7xl w-full mx-auto space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight break-words">Lead Details</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 break-all">Lead ID: {id}</p>
        </div>
        <Button variant="outline" className="self-start sm:self-auto" onClick={() => router.push('/admin/leads')}>Back to Leads</Button>
      </div>

      {loading ? (
        <Card className="p-6">Loading…</Card>
      ) : error ? (
        <Card className="p-6 bg-red-50 text-red-700">{error}</Card>
      ) : lead ? (
        <div className={`grid grid-cols-1 ${showBookService ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 w-full`}>
          {/* Lead Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 w-full">
              <h2 className="text-xl font-semibold mb-4">Lead Information</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-right sm:text-left">
                    {bookingsLoading ? (
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">Loading...</span>
                    ) : relatedBookings.length > 0 ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        relatedBookings[0].status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : relatedBookings[0].status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        {relatedBookings[0].status || 'pending'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">Not Booked</span>
                    )}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-right sm:text-left break-words max-w-full">{lead.name || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium text-right sm:text-left break-words max-w-full">{lead.phone || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-right sm:text-left break-all max-w-full">{lead.email || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span className="text-gray-600">Service Interest:</span>
                  <span className="font-medium text-right sm:text-left break-words max-w-full">{lead.service || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span className="text-gray-600">Service Mode:</span>
                  <span className="font-medium text-right sm:text-left break-words max-w-full">
                    {lead.mode ? (
                      lead.mode === 'drive-to-garage' ? 'Drive to Garage (Free)' :
                      lead.mode === 'pick-up-service' ? 'Pick-up Service (+AED 150.00)' :
                      lead.mode === 'home-service' ? 'Home Service (+AED 100.00)' :
                      lead.mode
                    ) : '—'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span className="text-gray-600">Received:</span>
                  <span className="font-medium text-right sm:text-left break-words max-w-full">{formatDateTime(lead.createdAt)}</span>
                </div>
                {lead.message && (
                  <div className="pt-3 border-t">
                    <div className="text-gray-600 mb-2">Message:</div>
                    <div className="whitespace-pre-wrap break-words bg-gray-50 p-3 rounded">{lead.message}</div>
                  </div>
                )}
              </div>
            </Card>

            {/* Book Service Form */}
            {showBookService && (
              <Card className="p-6 border-2 border-orange-200 relative overflow-hidden lg:-mx-4 xl:-mx-8">
                {bookingLoading && (
                  <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-lg">
                    <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" aria-label="Booking in progress" />
                  </div>
                )}
                <h2 className="text-xl font-semibold mb-4 text-orange-700">Book Service from Lead</h2>
                
                {bookingStatus && (
                  <div className={`mb-4 p-3 rounded text-sm ${bookingStatus.includes('✓') ? 'bg-green-50 text-green-800' : bookingStatus.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
                    {bookingStatus}
                  </div>
                )}

                <form onSubmit={handleBookService}>
                  <fieldset disabled={bookingLoading} className="space-y-4">
                    {/* Service Details */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-gray-700">Service Details</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="lg:col-span-2 border rounded-lg p-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-500">Select Date</p>
                              <p className="font-semibold text-orange-700">
                                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                              >
                                ← Prev
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentDate(new Date())}
                              >
                                Today
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                              >
                                Next →
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-600 border-b">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                              <div key={day} className="py-2">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7">{renderCalendarDays()}</div>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500" />Open</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500" />Completed</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500" />Cancelled</div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="border rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500">Selected Date</p>
                            <p className="font-semibold text-sm text-gray-800">
                              {selectedDate
                                ? selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                  })
                                : 'No date selected'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{formatTimeLabel(selectedTime)}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-2 text-orange-700"
                              onClick={() => {
                                setSelectedDate(null);
                                setSelectedTime('09:00');
                              }}
                            >
                              Clear Selection
                            </Button>
                          </div>

                          <div className="border rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500 mb-2">Select Time</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto hide-scrollbar">
                              {timeSlots.map((time) => (
                                <button
                                  key={time}
                                  type="button"
                                  disabled={isTimeDisabled(time)}
                                  onClick={() => setSelectedTime(time)}
                                  className={`p-2 text-sm rounded border transition-colors ${
                                    isTimeDisabled(time)
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                      : selectedTime === time
                                        ? 'bg-orange-500 text-white border-orange-500'
                                        : 'border-gray-300 hover:bg-orange-50'
                                  }`}
                                >
                                  {formatTimeLabel(time)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Show remaining fields only after date and time are selected */}
                    {selectedDate && selectedTime ? (
                      <>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Service Category *</label>
                          <select
                            required
                            value={bookingForm.category}
                            onChange={(e) => setBookingForm({...bookingForm, category: e.target.value})}
                            className="w-full border rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select Service</option>
                            <option value="ppf-wrapping">PPF Wrapping</option>
                            <option value="ceramic-coating">Ceramic Coating</option>
                            <option value="car-tinting">Car Tinting</option>
                            <option value="car-wash">Car Wash</option>
                            <option value="car-polishing">Car Polishing</option>
                            <option value="car-insurance">Car Insurance</option>
                            <option value="car-passing">Car Passing</option>
                            <option value="pre-purchase-inspection">Pre-Purchase Inspection</option>
                            <option value="instant-help">Instant Help</option>
                          </select>
                        </div>

                        {/* Vehicle Details */}
                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm text-gray-700">Vehicle Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Vehicle Type</label>
                              <select
                                value={bookingForm.vehicleType}
                                onChange={(e) => setBookingForm({...bookingForm, vehicleType: e.target.value})}
                                className="w-full border rounded px-3 py-2 text-sm"
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
                                value={bookingForm.vehicleBrand}
                                onChange={(e) => setBookingForm({...bookingForm, vehicleBrand: e.target.value})}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="e.g., BMW, Toyota"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Model</label>
                              <input
                                type="text"
                                value={bookingForm.modelName}
                                onChange={(e) => setBookingForm({...bookingForm, modelName: e.target.value})}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="e.g., X5, Camry"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Number Plate</label>
                              <input
                                type="text"
                                value={bookingForm.numberPlate}
                                onChange={(e) => setBookingForm({...bookingForm, numberPlate: e.target.value})}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="e.g., ABC123"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Fuel Type</label>
                              <select
                                value={bookingForm.fuelType}
                                onChange={(e) => setBookingForm({...bookingForm, fuelType: e.target.value})}
                                className="w-full border rounded px-3 py-2 text-sm"
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
                                value={bookingForm.vinNumber}
                                onChange={(e) => setBookingForm({ ...bookingForm, vinNumber: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="Enter VIN"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-600 mb-1">Mulkiya Images (optional)</label>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleMulkiyaUpload}
                                className="w-full border rounded px-3 py-2 text-sm bg-white"
                              />
                              {mulkiyaUploading && (
                                <p className="text-[11px] text-gray-600 mt-1">Uploading mulkiya images…</p>
                              )}
                              
                              {/* Preview uploaded images */}
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
                              
                              {bookingForm.mulkiyaUrl && (
                                <div className="flex items-center gap-3 text-xs text-gray-700 mt-2">
                                  <span className="font-semibold">Current:</span>
                                  <a
                                    href={bookingForm.mulkiyaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-orange-600 underline"
                                  >
                                    View Mulkiya
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Address Details */}
                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm text-gray-700">Address Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Country</label>
                              <input
                                type="text"
                                value={bookingForm.country}
                                onChange={(e) => setBookingForm({...bookingForm, country: e.target.value})}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="e.g., United Arab Emirates"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">State</label>
                              <input
                                type="text"
                                value={bookingForm.state}
                                onChange={(e) => setBookingForm({...bookingForm, state: e.target.value})}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="e.g., Dubai"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">City</label>
                              <input
                                type="text"
                                value={bookingForm.city}
                                onChange={(e) => setBookingForm({...bookingForm, city: e.target.value})}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="e.g., Dubai"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-600 mb-1">Address</label>
                              <input
                                type="text"
                                value={bookingForm.address}
                                onChange={(e) => setBookingForm({...bookingForm, address: e.target.value})}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="Full address"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50 text-center">
                        <p className="text-sm text-orange-800 font-medium">
                          📅 Please select a date and time to continue
                        </p>
                      </div>
                    )}

                    {/* Pre-Inspection is captured on the booking detail page after scheduling. */}

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button type="submit" disabled={bookingLoading} className="bg-orange-600 hover:bg-orange-700">
                        {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowBookService(false)} disabled={bookingLoading}>
                        Cancel
                      </Button>
                    </div>
                  </fieldset>
                </form>
              </Card>
            )}

            {/* Related Bookings */}
            <Card className="p-6 w-full">
              <h2 className="text-xl font-semibold mb-4">Booking Status</h2>
              {bookingsLoading ? (
                <div className="text-sm text-gray-500">Loading bookings...</div>
              ) : relatedBookings.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      ✓ Booked ({relatedBookings.length})
                    </span>
                  </div>
                  {relatedBookings.map((booking) => {
                    const canViewBooking = hasPermission(role, 'services', 'view');
                    return (
                    <div
                      key={booking.id}
                      className={`p-4 bg-gray-50 rounded border transition-colors ${
                        canViewBooking ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'
                      }`}
                      onClick={canViewBooking ? () => router.push(`/admin/book-service/${booking.id}`) : undefined}
                    >
                      <div className="flex justify-between items-start gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm">{booking.firstName} {booking.lastName}</div>
                          <div className="text-xs text-gray-600 mt-1">{booking.category}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Job Card: {booking.jobCardNo}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Scheduled: {formatDateTime(booking.scheduledDate)}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${booking.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}>
                          {booking.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded border">
                  <p className="font-medium mb-1">Not Booked Yet</p>
                  <p className="text-xs">This lead hasn't been converted to a booking. Use the "Book Service" button to create a booking.</p>
                </div>
              )}
            </Card>

            {/* Notes Section */}
            <Card className="p-6 w-full">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="mb-6 pb-6 border-b">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-medium">Add Note</label>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Type your note here..."
                      className="w-full border rounded px-3 py-2 text-sm min-h-20 resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={savingNote}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={savingNote || !newNote.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {savingNote ? 'Saving…' : 'Add Note'}
                  </Button>
                </div>
              </form>

              {/* Notes List */}
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note, index) => (
                    <div key={note.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500">
                            {note.createdBy} • {formatDateTime(note.createdAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium flex-shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{note.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded border">
                  <p>No notes yet. Add one to get started.</p>
                </div>
              )}
            </Card>

            
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-3">
                <PermissionGate module="services" action="create">
                  {!showBookService  && !relatedBookings.length && (
                    <>
                      {customerFormSubmissions.length == 0 && (

                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={handleSendFormLink}
                          disabled={sendingFormLink}
                        >
                          {sendingFormLink ? '📧 Sending...' : '📧 Send Booking Form'}
                        </Button>
                      )}
                      <Button 
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        onClick={() => setShowBookService(true)}
                      >
                        📅 Book Service Directly
                      </Button>
                    </>
                  )}
                  {!showBookService && relatedBookings.length > 0 && (
                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      onClick={() => setShowBookService(true)}
                    >
                      📅 Add Another Service
                    </Button>
                  )}
                </PermissionGate>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/admin/customers`)}
                >
                  View as Customer
                </Button>
              </div>
            </Card>

            {/* Customer Form Submissions */}
            <Card className="p-6 w-full">
              <h2 className="text-xl font-semibold mb-4">Customer Form Submissions</h2>
              {customerFormSubmissions.length > 0 ? (
                <div className="space-y-4">
                  {customerFormSubmissions.map((submission) => (
                    <div key={submission.id} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 mb-2">
                            ✅ Submitted on {formatDateTime(submission.submittedAt)}
                          </p>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium text-gray-700">Service:</span> <span className="text-gray-600">{submission.category || 'N/A'}</span></div>
                            <div><span className="font-medium text-gray-700">Vehicle:</span> <span className="text-gray-600">{submission.vehicleBrand} {submission.modelName} ({submission.vehicleType})</span></div>
                            <div><span className="font-medium text-gray-700">Number Plate:</span> <span className="text-gray-600">{submission.numberPlate}</span></div>
                            <div><span className="font-medium text-gray-700">Location:</span> <span className="text-gray-600">{submission.city}, {submission.state}, {submission.country}</span></div>
                            <div><span className="font-medium text-gray-700">Address:</span> <span className="text-gray-600">{submission.address}</span></div>
                          </div>
                          
                          {submission.mulkiyaUrls && submission.mulkiyaUrls.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-2">📸 Mulkiya Images ({submission.mulkiyaUrls.length}):</p>
                              <button
                                onClick={() => setViewingSubmissionId(submission.id)}
                                className="inline-block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors font-medium"
                              >
                                View All Images
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded border">
                  <p className="font-medium mb-1">No Form Submissions Yet</p>
                  <p className="text-xs">Customer form submissions will appear here when the customer completes the booking form.</p>
                </div>
              )}
            </Card>

            <Card className="p-6 bg-blue-50">
              <h3 className="font-semibold text-sm mb-2 text-blue-900">Quick Info</h3>
              <p className="text-xs text-blue-800">
                Send a form link to the customer to fill in their booking details, or convert this lead to a booking directly.
              </p>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Images Popup Modal */}
      {viewingSubmissionId && (() => {
        const submission = customerFormSubmissions.find(s => s.id === viewingSubmissionId);
        return submission?.mulkiyaUrls && submission.mulkiyaUrls.length > 0 ? (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl shadow-xl max-h-[90vh] overflow-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-blue-700">📸 Mulkiya Images</h3>
                    <p className="text-sm text-gray-600 mt-1">Viewing {submission.mulkiyaUrls.length} image(s)</p>
                  </div>
                  <button
                    onClick={() => setViewingSubmissionId(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Images Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {submission.mulkiyaUrls.map((url, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <img
                        src={url}
                        alt={`Mulkiya Image ${idx + 1}`}
                        className="max-w-full max-h-96 rounded-lg border-2 border-gray-200"
                      />
                      <p className="text-xs text-gray-600 mt-2">Image {idx + 1}</p>
                    </div>
                  ))}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setViewingSubmissionId(null)}
                  className="w-full mt-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </Card>
          </div>
        ) : null;
      })()}

      {/* Form Link Modal */}
      {formLinkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-green-700">✅ Form Link Sent!</h3>
                  <p className="text-sm text-gray-600 mt-1">Email sent to {lead?.email}</p>
                </div>
                <button
                  onClick={() => setFormLinkModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Message */}
              <p className="text-sm text-gray-700 mb-4">
                Customer will receive an email with a link to fill in their booking details. You can also share the link via other channels.
              </p>

              {/* Form Link Display */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <p className="text-xs text-gray-600 mb-2 font-medium">BOOKING FORM LINK</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white p-2 rounded border flex-1 overflow-x-auto text-gray-800 font-mono break-all">
                    {formLink}
                  </code>
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-2 rounded text-xs font-medium flex-shrink-0 transition-colors ${
                      copySuccess
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    {copySuccess ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">⏱️ Link expires in 24 hours</p>
              </div>

              {/* Share Options */}
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium text-gray-600">SHARE VIA</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    📋 Copy Link
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setFormLinkModal(false)}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}