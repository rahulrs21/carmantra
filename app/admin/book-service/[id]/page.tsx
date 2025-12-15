"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

  async function markComplete() {
    setStatus('Marking as complete...');
    try {
      await updateDoc(doc(db, 'bookedServices', id!), {
        status: 'completed',
      });
      setService({ ...service, status: 'completed' });
      setStatus('Service marked as completed');
    } catch (err: any) {
      safeConsoleError('Mark complete error', err);
      setStatus('Failed to mark service as completed');
    }
  }

  async function deleteService() {
    if (!confirm('Are you sure you want to delete this booking?')) return;
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

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!service) return <div className="p-6 text-center text-red-600">Service not found</div>;

  const scheduledDate = service.scheduledDate?.toDate
    ? service.scheduledDate.toDate().toLocaleString()
    : new Date(service.scheduledDate).toLocaleString();

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
                <span className="font-medium">{scheduledDate}</span>
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
            <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
            <div className="space-y-3 text-sm">
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
            </div>
          </Card>

          {/* Vehicle Details */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Vehicle Details</h2>
            <div className="space-y-3 text-sm">
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
    </div>
  );
}
