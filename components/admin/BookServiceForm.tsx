"use client";

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';

export default function BookServiceForm({
    onSuccess,
    preSelectedDate
}: {
    onSuccess?: () => void;
    preSelectedDate?: Date;
}) {
    // Helper function to format date for datetime-local input
    function formatDateForInput(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    const [formData, setFormData] = useState({
        jobCardNo: '',
        scheduledDate: preSelectedDate ? formatDateForInput(preSelectedDate) : '',
        category: '',
        // Customer
        firstName: '',
        lastName: '',
        mobileNo: '',
        email: '',
        country: '',
        state: '',
        city: '',
        address: '',
        // Vehicle
        vehicleType: '',
        fuelType: '',
        vehicleBrand: '',
        numberPlate: '',
        modelName: '',
    });

    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Pre-inspection checklist state
    const [preInspection, setPreInspection] = useState({
        message: '',
        images: [] as File[],
        videos: [] as File[],
    });

    const [previewFiles, setPreviewFiles] = useState({
        images: [] as string[],
        videos: [] as string[],
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

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
            // Upload images
            for (const file of preInspection.images) {
                const storageRef = ref(storage, `pre-inspections/${jobCardNo}/images/${file.name}-${Date.now()}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                uploadedImages.push(url);
            }

            // Upload videos
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus('Creating booking...');
        setLoading(true);

        try {
            // Validate required fields
            if (!formData.jobCardNo || !formData.category || !formData.firstName || !formData.mobileNo || !formData.vehicleBrand || !formData.numberPlate) {
                setStatus('Please fill in all required fields');
                setLoading(false);
                return;
            }

            // Validate scheduled date/time
            const dateError = getDateTimeError(formData.scheduledDate);
            if (dateError) {
                setStatus(dateError);
                setLoading(false);
                return;
            }

            // Upload pre-inspection files if any
            let preInspectionData: any = {
                message: preInspection.message,
                images: [],
                videos: [],
            };

            if (preInspection.images.length > 0 || preInspection.videos.length > 0) {
                setStatus('Uploading files...');
                const uploadedFiles = await uploadPreInspectionFiles(formData.jobCardNo);
                preInspectionData.images = uploadedFiles.uploadedImages;
                preInspectionData.videos = uploadedFiles.uploadedVideos;
            }

            const scheduledDateObj = formData.scheduledDate ? new Date(formData.scheduledDate) : new Date();

            const docRef = await addDoc(collection(db, 'bookedServices'), {
                jobCardNo: formData.jobCardNo,
                category: formData.category,
                scheduledDate: Timestamp.fromDate(scheduledDateObj),
                // Customer
                firstName: formData.firstName,
                lastName: formData.lastName,
                mobileNo: formData.mobileNo,
                email: formData.email,
                country: formData.country,
                state: formData.state,
                city: formData.city,
                address: formData.address,
                // Vehicle
                vehicleType: formData.vehicleType,
                fuelType: formData.fuelType,
                vehicleBrand: formData.vehicleBrand,
                numberPlate: formData.numberPlate,
                modelName: formData.modelName,
                // Pre-inspection
                preInspection: preInspectionData,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            setStatus('Booking created successfully!');
            setFormData({
                jobCardNo: '',
                scheduledDate: '',
                category: '',
                firstName: '',
                lastName: '',
                mobileNo: '',
                email: '',
                country: '',
                state: '',
                city: '',
                address: '',
                vehicleType: '',
                fuelType: '',
                vehicleBrand: '',
                numberPlate: '',
                modelName: '',
            });
            setPreInspection({
                message: '',
                images: [],
                videos: [],
            });
            setPreviewFiles({
                images: [],
                videos: [],
            });

            setTimeout(() => {
                if (onSuccess) onSuccess();
            }, 1500);
        } catch (err: any) {
            safeConsoleError('Booking error', err);
            setStatus('Error: ' + (err?.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {status && (
                <div className={`p-4 rounded text-sm ${status.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
                    }`}>
                    {status}
                </div>
            )}

            {/* SERVICE DETAILS */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Service Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Job Card No. <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="jobCardNo"
                            value={formData.jobCardNo}
                            onChange={handleChange}
                            placeholder="J000003"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Scheduled Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            name="scheduledDate"
                            value={formData.scheduledDate}
                            onChange={handleChange}
                            min={getMinDateTime()}
                            step="900"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                        {formData.scheduledDate && getDateTimeError(formData.scheduledDate) && (
                            <p className="text-red-600 text-xs mt-1">
                                ⚠️ {getDateTimeError(formData.scheduledDate)}
                            </p>
                        )}
                        <p className="text-gray-500 text-xs mt-1">
                            Bookings available: Weekdays 9 AM - 6 PM (15 min intervals)
                        </p>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        >
                            <option value="">Select Repair Category</option>
                            <option value="Interior Cleaning">Interior Cleaning</option>
                            <option value="Exterior Washing">Exterior Washing</option>
                            <option value="Ceramic Coating">Ceramic Coating</option>
                            <option value="PPF Wrapping">PPF Wrapping</option>
                            <option value="Car Polishing">Car Polishing</option>
                            <option value="Car Tinting">Car Tinting</option>
                            <option value="Pre-Purchase Inspection">Pre-Purchase Inspection</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* CUSTOMER DETAILS */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Customer Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="Washingtone"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="Ochieng"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile No. <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            name="mobileNo"
                            value={formData.mobileNo}
                            onChange={handleChange}
                            placeholder="0792226548"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Samuel@gmail.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            placeholder="Turkey"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            placeholder="Adana"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Town/City</label>
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            placeholder="Adana"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Diamond street"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* VEHICLE DETAILS */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Vehicle DetailsSSSS</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vehicle Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="vehicleType"
                            value={formData.vehicleType}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        >
                            <option value="">Select vehicle type</option>
                            <option value="Car">Car</option>
                            <option value="SUV">SUV</option>
                            <option value="Truck">Truck</option>
                            <option value="Motorcycle">Motorcycle</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fuel Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="fuelType"
                            value={formData.fuelType}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        >
                            <option value="">Select fuel type</option>
                            <option value="Petrol">Petrol</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Electric">Electric</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vehicle Brand <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="vehicleBrand"
                            value={formData.vehicleBrand}
                            onChange={handleChange}
                            placeholder="BMW"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number Plate <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="numberPlate"
                            value={formData.numberPlate}
                            onChange={handleChange}
                            placeholder="ABC-1234"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Model Names <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="modelName"
                            value={formData.modelName}
                            onChange={handleChange}
                            placeholder="3 Series"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* PRE-INSPECTION CHECKLIST */}
            <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-orange-700">Pre-Inspection Checklist</h3>
                <div className="space-y-4 bg-blue-50 p-4 rounded border border-blue-200">
                    {/* Message Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Inspection Notes
                        </label>
                        <textarea
                            value={preInspection.message}
                            onChange={(e) => setPreInspection({ ...preInspection, message: e.target.value })}
                            placeholder="Document any observations about the vehicle condition, damage, scratches, etc..."
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            rows={4}
                        />
                    </div>

                    {/* Images Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Images
                            <span className="text-gray-500 text-xs ml-2">(Multiple photos allowed)</span>
                        </label>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        {previewFiles.images.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                {previewFiles.images.map((preview, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={preview}
                                            alt={`Preview ${index}`}
                                            className="w-full h-24 object-cover rounded border border-gray-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                            {preInspection.images.length} image(s) selected
                        </p>
                    </div>

                    {/* Videos Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Videos
                            <span className="text-gray-500 text-xs ml-2">(Multiple videos allowed)</span>
                        </label>
                        <input
                            type="file"
                            multiple
                            accept="video/*"
                            onChange={handleVideoUpload}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        {previewFiles.videos.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {previewFiles.videos.map((preview, index) => (
                                    <div key={index} className="relative">
                                        <video
                                            src={preview}
                                            className="w-full h-24 object-cover rounded border border-gray-300"
                                            controls
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeVideo(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                            {preInspection.videos.length} video(s) selected
                        </p>
                    </div>

                    <p className="text-gray-600 text-xs bg-white p-2 rounded border border-gray-200">
                        📸 <strong>Pro Tip:</strong> Take photos and videos from multiple angles - front, rear, sides, and any areas of concern. This helps document the condition before service.
                    </p>
                </div>
            </div>

            <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Creating...' : 'Book Service'}
                </Button>
            </div>


        </form>
    );
}
