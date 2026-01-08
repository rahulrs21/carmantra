"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, Timestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { safeConsoleError } from '@/lib/safeConsole';

interface LeadData {
  id: string;
  name: string;
  email: string;
  phone: string;
  service?: string;
}

export default function CustomerBookingFormPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [formData, setFormData] = useState({
    category: '',
    vehicleType: '',
    vehicleBrand: '',
    modelName: '',
    numberPlate: '',
    fuelType: '',
    vinNumber: '',
    country: '',
    state: '',
    city: '',
    address: '',
  });

  const [mulkiyaFiles, setMulkiyaFiles] = useState<File[]>([]);
  const [mulkiyaPreview, setMulkiyaPreview] = useState<string[]>([]);
  const [mulkiyaUploading, setMulkiyaUploading] = useState(false);

  // Verify token and get lead data
  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        setLoading(true);
        const formRef = doc(db, 'bookingForms', token);
        const formSnap = await getDoc(formRef);

        if (!formSnap.exists()) {
          setError('Invalid or expired form link. Please contact support.');
          setLeadData(null);
          return;
        }

        const formDoc = formSnap.data();
        
        // Check if form is already submitted
        if (formDoc.submitted) {
          setError('This form has already been submitted. Please contact support for updates.');
          setLeadData(null);
          return;
        }

        // Check if token is expired (24 hours)
        const createdAt = formDoc.createdAt?.toDate?.() || new Date(formDoc.createdAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
          setError('This form link has expired. Please contact support to request a new one.');
          setLeadData(null);
          return;
        }

        // Get lead data
        const leadRef = doc(db, 'crm-leads', formDoc.leadId);
        const leadSnap = await getDoc(leadRef);

        if (!leadSnap.exists()) {
          setError('Lead information not found.');
          return;
        }

        const lead = leadSnap.data();
        setLeadData({
          id: leadSnap.id,
          name: lead.name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          service: lead.service || '',
        });
      } catch (err: any) {
        safeConsoleError('Error verifying form:', err);
        setError('Error loading form. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleMulkiyaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadData || !token) return;

    // Validation
    if (!formData.category) {
      setSubmitStatus('Please select a service category');
      return;
    }

    if (!formData.vehicleType || !formData.vehicleBrand || !formData.modelName) {
      setSubmitStatus('Please fill in vehicle details');
      return;
    }

    if (!formData.address || !formData.city) {
      setSubmitStatus('Please fill in address details');
      return;
    }

    setSubmitting(true);
    setSubmitStatus('Submitting form...');

    try {
      // Upload mulkiya images if any
      let uploadedMulkiyaUrls: string[] = [];
      if (mulkiyaFiles.length > 0) {
        setMulkiyaUploading(true);
        setSubmitStatus('Uploading mulkiya images...');

        for (const file of mulkiyaFiles) {
          const storageRef = ref(storage, `customer-forms/${token}/${file.name}-${Date.now()}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          uploadedMulkiyaUrls.push(url);
        }

        setMulkiyaUploading(false);
        setSubmitStatus('Completing submission...');
      }

      // Save form submission to Firestore
      await addDoc(collection(db, 'crm-leads', leadData.id, 'customerFormSubmissions'), {
        ...formData,
        mulkiyaUrls: uploadedMulkiyaUrls,
        submittedAt: Timestamp.now(),
        submittedEmail: leadData.email,
      });

      // Mark form as submitted
      await updateDoc(doc(db, 'bookingForms', token), {
        submitted: true,
        submittedAt: Timestamp.now(),
      });

      setSubmitStatus(null);
      setShowSuccessModal(true);
      setTimeout(() => {
        router.push('/');
      }, 5000);
    } catch (err: any) {
      safeConsoleError('Error submitting form:', err);
      setSubmitStatus('Error submitting form. Please try again.');
    } finally {
      setSubmitting(false);
      setMulkiyaUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50">
        <Card className="p-8">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-600 text-center">Loading form...</p>
        </Card>
      </div>
    );
  }

  if (error || !leadData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50 p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Form</h1>
            <p className="text-gray-600 text-sm mb-6">{error || 'Unable to load form.'}</p>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Go to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-orange-50 to-blue-50 py-8 pt-14 px-4">
        <div className='bg-black min-h-[4em] absolute top-0 left-0 right-0'> 

        </div>
      <div className="max-w-2xl mx-auto relative z-10 pt-6">
        {/* Header */}
        <Card className="p-6 mb-6 border-2 border-orange-200">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Book Your Service</h1>
          <p className="text-gray-600">Hi {leadData.name}, please fill in the details below</p>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{leadData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span className="font-medium">{leadData.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service you chosen:</span>
              <span className="font-medium">{leadData.service || '—'}</span>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card className="p-6 relative">
          {submitting && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto" />
                <p className="mt-3 text-sm text-gray-600 font-medium">{submitStatus || 'Submitting...'}</p>
              </div>
            </div>
          )}

          {submitStatus && !submitting && (
            <div className={`mb-4 p-4 rounded ${
              submitStatus.includes('Error')
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
            }`}>
              {submitStatus}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <fieldset disabled={submitting} className="space-y-6">
              {/* Service Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Service Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Vehicle Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Vehicle Type *</label>
                    <select
                      required
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    <label className="block text-sm text-gray-600 mb-2">Brand *</label>
                    <input
                      type="text"
                      required
                      value={formData.vehicleBrand}
                      onChange={(e) => setFormData({ ...formData, vehicleBrand: e.target.value })}
                      placeholder="e.g., BMW, Toyota"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Model *</label>
                    <input
                      type="text"
                      required
                      value={formData.modelName}
                      onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                      placeholder="e.g., X5, Camry"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Number Plate *</label>
                    <input
                      type="text"
                      required
                      value={formData.numberPlate}
                      onChange={(e) => setFormData({ ...formData, numberPlate: e.target.value })}
                      placeholder="e.g., ABC123"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Fuel Type *</label>
                    <select
                      required
                      value={formData.fuelType}
                      onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Fuel</option>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">VIN (optional)</label>
                    <input
                      type="text"
                      value={formData.vinNumber}
                      onChange={(e) => setFormData({ ...formData, vinNumber: e.target.value })}
                      placeholder="Enter VIN"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-2">Mulkiya Images (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMulkiyaUpload}
                      disabled={mulkiyaUploading}
                      className="w-full border rounded px-3 py-2 text-sm bg-white cursor-pointer"
                    />
                    {mulkiyaUploading && <p className="text-xs text-gray-600 mt-1">Uploading images…</p>}

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
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Address Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Country *</label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="e.g., United Arab Emirates"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">State/Emirate *</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g., Dubai"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Dubai"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-2">Full Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter your full address"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={submitting || mulkiyaUploading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {submitting ? 'Submitting...' : 'Submit Form'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </fieldset>
          </form>
        </Card>

        {/* Info */}
        <Card className="p-4 mt-6 bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-800">
            💡 This form is secure and unique to you. Do not share this link with others. If you have questions, contact our support team.
          </p>
        </Card>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <div className="p-8 text-center">
              {/* Success Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Form Submitted!</h2>

              {/* Message */}
              <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                Form submitted successfully! We will book the service shortly.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                You will get an email once the service is booked.
              </p>

              {/* Loading Message */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-xs text-gray-500">Redirecting you to home page...</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
