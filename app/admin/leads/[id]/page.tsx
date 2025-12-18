"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { findOrCreateCustomer } from '@/lib/firestore/customers';
import { formatDateTime, formatDate } from '@/lib/utils';
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
  const [preInspection, setPreInspection] = useState({
    message: '',
    images: [] as File[],
    videos: [] as File[],
  });
  const [previewFiles, setPreviewFiles] = useState({
    images: [] as string[],
    videos: [] as string[],
  });
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

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

  function getMinDateTime(): string {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    if (roundedMinutes === 60) {
      now.setHours(now.getHours() + 1, 0);
    } else {
      now.setMinutes(roundedMinutes);
    }
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${date}T${hours}:${mins}`;
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setPreInspection((prev) => ({
      ...prev,
      images: [...prev.images, ...files],
    }));

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewFiles((prev) => ({
          ...prev,
          images: [...prev.images, reader.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setPreInspection((prev) => ({
      ...prev,
      videos: [...prev.videos, ...files],
    }));

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewFiles((prev) => ({
          ...prev,
          videos: [...prev.videos, reader.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  function removeImage(index: number) {
    setPreInspection((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setPreviewFiles((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  function removeVideo(index: number) {
    setPreInspection((prev) => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
    setPreviewFiles((prev) => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  }

  async function uploadPreInspectionFiles(jobCardNo: string) {
    const uploadedImages: string[] = [];
    const uploadedVideos: string[] = [];

    try {
      for (const file of preInspection.images) {
        const storageRef = ref(storage, `pre-inspections/${jobCardNo}/images/${file.name}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedImages.push(url);
      }

      for (const file of preInspection.videos) {
        const storageRef = ref(storage, `pre-inspections/${jobCardNo}/videos/${file.name}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedVideos.push(url);
      }

      return { uploadedImages, uploadedVideos };
    } catch (err: any) {
      safeConsoleError('File upload error', err);
      throw err;
    }
  }

  async function handleBookService(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !id) return;

    if (!bookingForm.scheduledDate || !bookingForm.category) {
      setBookingStatus('Please fill in all required fields');
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
      const scheduledDateTime = new Date(bookingForm.scheduledDate);
      
      // Upload pre-inspection files if any
      setBookingStatus('Uploading files...');
      const preInspectionData: any = {
        message: preInspection.message || '',
        images: [],
        videos: [],
      };

      if (preInspection.images.length > 0 || preInspection.videos.length > 0) {
        const uploaded = await uploadPreInspectionFiles(jobCardNo);
        preInspectionData.images = uploaded.uploadedImages;
        preInspectionData.videos = uploaded.uploadedVideos;
      }

      setBookingStatus('Creating booking...');
      
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
        preInspection: preInspectionData,
        status: 'pending',
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
    <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 overflow-x-hidden">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
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
              <Card className="p-6 border-2 border-orange-200">
                <h2 className="text-xl font-semibold mb-4 text-orange-700">Book Service from Lead</h2>
                
                {bookingStatus && (
                  <div className={`mb-4 p-3 rounded text-sm ${bookingStatus.includes('✓') ? 'bg-green-50 text-green-800' : bookingStatus.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
                    {bookingStatus}
                  </div>
                )}

                <form onSubmit={handleBookService} className="space-y-4">
                  {/* Service Details */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700">Service Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Scheduled Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          min={getMinDateTime()}
                          value={bookingForm.scheduledDate}
                          onChange={(e) => setBookingForm({...bookingForm, scheduledDate: e.target.value})}
                          className="w-full border rounded px-3 py-2 text-sm"
                        />
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

                  {/* Pre-Inspection Checklist */}
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-semibold text-sm text-gray-700">Pre-Inspection Checklist</h3>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Notes</label>
                      <textarea
                        value={preInspection.message}
                        onChange={(e) => setPreInspection({...preInspection, message: e.target.value})}
                        className="w-full border rounded px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Add any pre-inspection notes..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Upload Images</label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="w-full text-sm"
                        />
                        {previewFiles.images.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {previewFiles.images.map((preview, idx) => (
                              <div key={idx} className="relative group">
                                <img src={preview} alt={`Preview ${idx}`} className="w-full h-20 object-cover rounded border" />
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Upload Videos</label>
                        <input
                          type="file"
                          accept="video/*"
                          multiple
                          onChange={handleVideoUpload}
                          className="w-full text-sm"
                        />
                        {previewFiles.videos.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {previewFiles.videos.map((preview, idx) => (
                              <div key={idx} className="relative group">
                                <video src={preview} className="w-full h-20 object-cover rounded border" />
                                <button
                                  type="button"
                                  onClick={() => removeVideo(idx)}
                                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button type="submit" disabled={bookingLoading} className="bg-orange-600 hover:bg-orange-700">
                      {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowBookService(false)}>
                      Cancel
                    </Button>
                  </div>
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
