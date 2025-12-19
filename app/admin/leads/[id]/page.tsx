"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  message?: string;
  createdAt?: { seconds: number } | { toDate: () => Date };
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
    country: '',
    state: '',
    city: '',
    address: '',
  });
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [allBookings, setAllBookings] = useState<any[]>([]);

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
          setLead({ ...(snap.data() as any), id: snap.id });
          // Fetch related bookings
          fetchRelatedBookings(id);
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

  function generateJobCardNo() {
    return 'J' + Date.now().toString().slice(-6);
  }

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
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-3">
                <PermissionGate module="services" action="create">
                  {!showBookService && (
                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      onClick={() => setShowBookService(true)}
                    >
                      📅 Book Service
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

            <Card className="p-6 bg-blue-50">
              <h3 className="font-semibold text-sm mb-2 text-blue-900">Quick Info</h3>
              <p className="text-xs text-blue-800">
                Convert this lead to a booking directly from here. All data will sync to Book Service and Customer modules.
              </p>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
