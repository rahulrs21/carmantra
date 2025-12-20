"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { safeConsoleError } from '@/lib/safeConsole';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { findOrCreateCustomer } from '@/lib/firestore/customers';
import { formatDateTime } from '@/lib/utils';
import { ModuleAccess } from '@/components/PermissionGate';

export default function BookServiceList() {
    const router = useRouter();
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [view, setView] = useState<'calendar' | 'list'>('calendar');
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [sortField, setSortField] = useState<'jobCardNo' | 'scheduledDate' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [mulkiyaFiles, setMulkiyaFiles] = useState<File[]>([]);
    const [mulkiyaPreviews, setMulkiyaPreviews] = useState<string[]>([]);
    const mulkiyaInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        jobCardNo: '',
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
        vehicleBrand: '',
        modelName: '',
        numberPlate: '',
        fuelType: '',
        vinNumber: '',
    });

    // Pre-inspection is captured after booking is created (car arrival)

    useEffect(() => {
        const q = query(collection(db, 'bookedServices'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            }));
            setServices(data);
            setLoading(false);
        }, (err: any) => {
            safeConsoleError('Book service list error', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Get calendar days for current month
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const isWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 0 || day === 6;
    };

    const isPastDate = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isDateDisabled = (date: Date) => {
        // Allow viewing past dates but keep weekends blocked for booking
        return isWeekend(date);
    };

    const getServicesByDate = (date: Date) => {
        return services.filter((service) => {
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

    const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];

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
            timeDate.setHours(parseInt(hours), parseInt(minutes), 0);
            return timeDate < today;
        }
        return false;
    };

    const generateJobCardNo = () => {
        const prefix = 'J';
        const timestamp = Date.now().toString().slice(-6);
        return `${prefix}${timestamp}`;
    };

    const openBookingForm = () => {
        setFormData({
            ...formData,
            jobCardNo: generateJobCardNo()
        });
        setMulkiyaFiles([]);
        setMulkiyaPreviews([]);
        setShowBookingForm(true);
    };

    // Pre-inspection uploads are handled later in the booking lifecycle

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime) return;

        if (isPastDate(selectedDate)) {
            alert('You cannot book a service in the past.');
            return;
        }

        if (isDateDisabled(selectedDate) || isTimeDisabled(selectedTime)) {
            alert('Please select a valid date and time within working hours (weekdays, future, 9 AM - 6 PM).');
            return;
        }

        setSubmitting(true);
        try {
            const auth = getAuth();
            if (!auth.currentUser) throw new Error('Not authenticated');
            const actorId = auth.currentUser.uid;
            const actorName = auth.currentUser.displayName || 'Admin';

            const [hours, minutes] = selectedTime.split(':');
            const scheduledDateTime = new Date(selectedDate);
            scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0);

            // Auto-sync customer to Customer module
            await findOrCreateCustomer({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                mobile: formData.mobileNo,
                address: formData.address,
                city: formData.city,
                country: formData.country,
                state: formData.state,
            });

            let mulkiyaUrl = '';
            if (mulkiyaFiles.length) {
                const urls: string[] = [];
                for (const file of mulkiyaFiles) {
                    const storageRef = ref(storage, `mulkiya/${formData.jobCardNo || 'booking'}/${file.name}-${Date.now()}`);
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    urls.push(url);
                }
                mulkiyaUrl = JSON.stringify(urls);
            }

            await addDoc(collection(db, 'bookedServices'), {
                ...formData,
                scheduledDate: Timestamp.fromDate(scheduledDateTime),
                preInspection: {
                    message: '',
                    images: [],
                    videos: [],
                },
                vinNumber: formData.vinNumber,
                mulkiyaUrl,
                status: 'pending',
                quotationStatus: 'not_created',
                quotationId: null,
                createdAt: Timestamp.now(),
                createdBy: actorId,
                createdByName: actorName,
            });

            setShowBookingForm(false);
            setSelectedDate(null);
            setFormData({
                jobCardNo: '',
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
                vehicleBrand: '',
                modelName: '',
                numberPlate: '',
                fuelType: '',
                vinNumber: '',
            });
            setMulkiyaFiles([]);
            setMulkiyaPreviews([]);
            if (mulkiyaInputRef.current) mulkiyaInputRef.current.value = '';
            // Pre-inspection will be captured after vehicle arrival
            alert('Booking created successfully!');
        } catch (err: any) {
            safeConsoleError('Booking creation error', err);
            alert('Failed to create booking');
        } finally {
            setSubmitting(false);
        }
    };

    const updateFormField = (field: string, value: string) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSort = (field: 'jobCardNo' | 'scheduledDate') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortedServices = () => {
        if (!sortField) return services;

        return [...services].sort((a, b) => {
            let aValue, bValue;

            if (sortField === 'jobCardNo') {
                aValue = a.jobCardNo || '';
                bValue = b.jobCardNo || '';
            } else if (sortField === 'scheduledDate') {
                aValue = a.scheduledDate?.toDate ? a.scheduledDate.toDate() : new Date(a.scheduledDate);
                bValue = b.scheduledDate?.toDate ? b.scheduledDate.toDate() : new Date(b.scheduledDate);
            }

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    };

    const WORK_STAGES = ['Not booked', 'Scheduled', 'Quotation', 'Completed'] as const;

    const getWorkStage = (service: any) => {
        let stage = 0;

        if (service.status === 'completed') {
            stage = 3;
        } else if ((service.quotationStatus && service.quotationStatus !== 'not_created') || service.quotationId) {
            stage = 2;
        } else if (service.scheduledDate) {
            stage = 1;
        }

        return { stage, label: WORK_STAGES[stage] };
    };

    const getQuotationMeta = (service: any) => {
        const status = service.quotationStatus || (service.quotationId ? 'pending' : 'not_created');
        const labelMap: Record<string, string> = {
            accepted: 'Accepted',
            pending: 'Pending',
            rejected: 'Rejected',
            not_created: 'Not created',
        };
        const classMap: Record<string, string> = {
            accepted: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800',
            not_created: 'bg-gray-100 text-gray-700',
        };
        return {
            status,
            label: labelMap[status] || status,
            className: classMap[status] || 'bg-gray-100 text-gray-700',
        };
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="p-2"></div>);
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayServices = getServicesByDate(date);
            const disabled = isDateDisabled(date);
            const isSelected = selectedDate?.toDateString() === date.toDateString();

            days.push(
                <div
                    key={day}
                    onClick={() => {
                        if (disabled) return;
                        setSelectedDate(date);
                        setSelectedTime('');
                    }}
                    className={`p-2 sm:p-3 min-h-[88px] border cursor-pointer transition-colors ${disabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isSelected
                            ? 'bg-orange-200 border-orange-500'
                            : 'hover:bg-orange-50'
                        } ${isPastDate(date) ? 'opacity-70' : ''}`}
                >
                    <div className="font-semibold text-xs sm:text-sm mb-1">{day}</div>
                    <div className="text-[11px] sm:text-xs space-y-0.5">
                        {dayServices.slice(0, 2).map((service, i) => (
                            <div
                                key={i}
                                className={`px-1 py-0.5 rounded text-white truncate ${service.status === 'completed'
                                    ? 'bg-green-500'
                                    : service.status === 'cancelled'
                                        ? 'bg-red-500'
                                        : 'bg-blue-500'
                                    }`}
                            >
                                {service.firstName}
                            </div>
                        ))}
                        {dayServices.length > 2 && (
                            <div className="text-gray-500">+{dayServices.length - 2} more</div>
                        )}
                    </div>
                </div>
            );
        }

        return days;
    };

    if (loading) return <div className="p-6 text-center">Loading...</div>;

    return (
        <ModuleAccess module="services">
        <div className="space-y-6 max-w-full w-full overflow-x-hidden">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight break-words">Book Service Calendar</h1>
                    <p className="text-sm text-gray-500 mt-1">Total Bookings: {services.length}</p>
                </div>
                <Button onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')} className="self-start sm:self-auto">
                    {view === 'calendar' ? 'List View' : 'Calendar View'}
                </Button>
            </header>

            {view === 'calendar' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-orange-600">
                                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </h2>
                                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                                        className="flex-1 sm:flex-none"
                                    >
                                        ← Prev
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentDate(new Date())}
                                        className="flex-1 sm:flex-none"
                                    >
                                        Today
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                                        className="flex-1 sm:flex-none"
                                    >
                                        Next →
                                    </Button>
                                    <Button
                                        className="bg-orange-600 hover:bg-orange-700 text-white flex-1 sm:flex-none"
                                        onClick={openBookingForm}
                                        disabled={!selectedDate || isPastDate(selectedDate) || !selectedTime}
                                    >
                                        + Book Service
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-0 border rounded overflow-hidden text-xs sm:text-sm">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div key={day} className="p-2 sm:p-3 text-center font-semibold bg-gray-100 border-b text-orange-600">
                                        {day}
                                    </div>
                                ))}
                                {renderCalendar()}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span>Open</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <span>Completed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                    <span>Cancelled</span>
                                </div>
                            </div>

                            {/* Selected Date Bookings */}
                            {selectedDate && (
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-sm font-semibold mb-3">
                                        Bookings on {selectedDate.toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}: {getServicesByDate(selectedDate).length}
                                    </p>
                                    {getServicesByDate(selectedDate).length > 0 ? (
                                        <div className="space-y-2">
                                            {getServicesByDate(selectedDate).map((service) => (
                                                <div
                                                    key={service.id}
                                                    className="p-3 bg-gray-50 rounded border hover:bg-gray-100 cursor-pointer transition-colors"
                                                    onClick={() => router.push(`/admin/book-service/${service.id}`)}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-semibold text-sm">{service.firstName} {service.lastName}</div>
                                                            <div className="text-xs text-gray-600 mt-1">{service.category}</div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {service.scheduledDate?.toDate
                                                                    ? service.scheduledDate.toDate().toLocaleTimeString('en-US', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })
                                                                    : new Date(service.scheduledDate).toLocaleTimeString('en-US', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${service.status === 'completed'
                                                            ? 'bg-green-100 text-green-800'
                                                            : service.status === 'cancelled'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                            {service.status || 'pending'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No bookings for this date</p>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Time Selector */}
                    <div className="space-y-4">
                        {selectedDate && (
                            <Card className="p-4 sm:p-6 sticky top-6">
                                <h3 className="font-semibold mb-4">Schedule Service</h3>
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-2">Selected Date:</p>
                                    <p className="font-bold text-lg text-orange-600">
                                        {selectedDate.toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 mb-3">Select Time:</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                                        {timeSlots.map((time) => (
                                            <button
                                                key={time}
                                                disabled={isTimeDisabled(time)}
                                                onClick={() => setSelectedTime(time)}
                                                className={`p-2 text-sm rounded border transition-colors ${isTimeDisabled(time)
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
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

                                <Button
                                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                                    onClick={openBookingForm}
                                    disabled={!selectedDate || isPastDate(selectedDate) || !selectedTime}
                                >
                                    + Book Service
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full mt-2"
                                    onClick={() => {
                                        setSelectedDate(null);
                                        setSelectedTime('');
                                    }}
                                >
                                    Clear Selection
                                </Button>

                                {getServicesByDate(selectedDate).length > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-sm font-semibold mb-2">
                                            Bookings on this date: {getServicesByDate(selectedDate).length}
                                        </p>
                                        <div className="space-y-2 max-h-32 overflow-y-auto">
                                            {getServicesByDate(selectedDate).map((service) => (
                                                <div
                                                    key={service.id}
                                                    className="text-xs p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                                                    onClick={() => router.push(`/admin/book-service/${service.id}`)}
                                                >
                                                    <div className="font-semibold">{service.firstName} {service.lastName}</div>
                                                    <div className="text-gray-600">{service.category}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>
                </div>
            ) : (
                /* List View */
                <div className="space-y-4">
                    {/* Sort Controls */}
                    <Card className="p-4">
                        <div className="flex items-center gap-4">
                            <span className="font-semibold text-sm">Sort by:</span>
                            <Button
                                variant={sortField === 'jobCardNo' ? 'default' : 'outline'}
                                onClick={() => handleSort('jobCardNo')}
                                className="gap-2"
                            >
                                Job Card No
                                {sortField === 'jobCardNo' && (
                                    <span className="font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </Button>
                            <Button
                                variant={sortField === 'scheduledDate' ? 'default' : 'outline'}
                                onClick={() => handleSort('scheduledDate')}
                                className="gap-2"
                            >
                                Scheduled Date
                                {sortField === 'scheduledDate' && (
                                    <span className="font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </Button>
                            {sortField && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setSortField(null);
                                        setSortDirection('asc');
                                    }}
                                    className="text-gray-600"
                                >
                                    Clear Sort
                                </Button>
                            )}
                        </div>
                    </Card>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="px-6 py-3 text-left text-sm font-semibold">
                                        <button
                                            onClick={() => handleSort('jobCardNo')}
                                            className="flex items-center gap-2 hover:text-orange-600 transition-colors"
                                        >
                                            Job Card No
                                            {sortField === 'jobCardNo' && (
                                                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">
                                        <button
                                            onClick={() => handleSort('scheduledDate')}
                                            className="flex items-center gap-2 hover:text-orange-600 transition-colors"
                                        >
                                            Scheduled Date
                                            {sortField === 'scheduledDate' && (
                                                <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Work Status</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Quotation</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getSortedServices().length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                            No services found
                                        </td>
                                    </tr>
                                ) : (
                                    getSortedServices().map((service) => {
                                        const quote = getQuotationMeta(service);
                                        const workStage = getWorkStage(service);
                                        const actionLabel = quote.status === 'accepted'
                                            ? 'Invoice'
                                            : quote.status === 'pending'
                                                ? 'Review Quote'
                                                : 'Create Quote';
                                        return (
                                            <tr key={service.id} className="border-b hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm">{service.jobCardNo}</td>
                                                <td className="px-6 py-4 text-sm">{service.firstName} {service.lastName}</td>
                                                <td className="px-6 py-4 text-sm">{service.category}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    {formatDateTime(service.scheduledDate)}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="flex items-center gap-1 text-xs">
                                                        {WORK_STAGES.map((step, idx) => (
                                                            <div key={step} className="flex items-center gap-1">
                                                                <span className={`h-2 w-2 rounded-full ${idx <= workStage.stage ? 'bg-orange-500' : 'bg-gray-300'}`} />
                                                                <span className={`${idx === workStage.stage ? 'font-semibold text-orange-700' : idx < workStage.stage ? 'text-gray-700' : 'text-gray-400'}`}>{step}</span>
                                                                {idx < WORK_STAGES.length - 1 && <span className="text-gray-300 mx-1">›</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${quote.className}`}>
                                                        {quote.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${service.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : service.status === 'cancelled'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {service.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.push(`/admin/book-service/${service.id}`)}
                                                    >
                                                        {actionLabel}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Booking Form Dialog */}
            <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Book Services</DialogTitle>
                    </DialogHeader>

                                        <form onSubmit={handleSubmit} className="space-y-6">
                                                <div className="relative">
                                                    <div className={submitting ? "pointer-events-none filter blur-sm" : ""}>
                                                {/* Service Details */}
                                                <div>
                            <h3 className="text-lg font-semibold mb-3">SERVICE DETAILS</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="jobCardNo">Job Card No.*</Label>
                                    <Input
                                        id="jobCardNo"
                                        value={formData.jobCardNo}
                                        readOnly
                                        className="bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="scheduledDate">Date*</Label>
                                    <Input
                                        id="scheduledDate"
                                        value={selectedDate && selectedTime ?
                                            `${selectedDate.toLocaleDateString()} ${formatTimeLabel(selectedTime)}` : ''}
                                        readOnly
                                        className="bg-gray-50"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label htmlFor="category">Category*</Label>
                                    <Select value={formData.category} onValueChange={(val) => updateFormField('category', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Repair Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="car-wash">Car Wash</SelectItem>
                                            <SelectItem value="car-polishing">Car Polishing</SelectItem>
                                            <SelectItem value="ceramic-coating">Ceramic Coating</SelectItem>
                                            <SelectItem value="ppf-wrapping">PPF Wrapping</SelectItem>
                                            <SelectItem value="car-tinting">Car Tinting</SelectItem>
                                            <SelectItem value="pre-purchase-inspection">Pre-Purchase Inspection</SelectItem>
                                            <SelectItem value="car-passing">Car Passing</SelectItem>
                                            <SelectItem value="car-insurance">Car Insurance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Customer Details */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">CUSTOMER DETAILS</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="firstName">First Name*</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) => updateFormField('firstName', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Last Name*</Label>
                                    <Input
                                        id="lastName"
                                        value={formData.lastName}
                                        onChange={(e) => updateFormField('lastName', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="mobileNo">Mobile No.*</Label>
                                    <Input
                                        id="mobileNo"
                                        value={formData.mobileNo}
                                        onChange={(e) => updateFormField('mobileNo', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email*</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => updateFormField('email', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="country">Country*</Label>
                                    <Input
                                        id="country"
                                        value={formData.country}
                                        onChange={(e) => updateFormField('country', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="state">State</Label>
                                    <Input
                                        id="state"
                                        value={formData.state}
                                        onChange={(e) => updateFormField('state', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="city">Town/City</Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) => updateFormField('city', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="address">Address*</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => updateFormField('address', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Details */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">VEHICLE DETAILS</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <Label htmlFor="vehicleType">Vehicle Type*</Label>
                                    <Select value={formData.vehicleType} onValueChange={(val) => updateFormField('vehicleType', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select vehicle type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sedan">Sedan</SelectItem>
                                            <SelectItem value="suv">SUV</SelectItem>
                                            <SelectItem value="hatchback">Hatchback</SelectItem>
                                            <SelectItem value="truck">Truck</SelectItem>
                                            <SelectItem value="van">Van</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-1">
                                    <Label htmlFor="fuelType">Fuel Type*</Label>
                                    <Select value={formData.fuelType} onValueChange={(val) => updateFormField('fuelType', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select fuel type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="petrol">Petrol</SelectItem>
                                            <SelectItem value="diesel">Diesel</SelectItem>
                                            <SelectItem value="electric">Electric</SelectItem>
                                            <SelectItem value="hybrid">Hybrid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <Label htmlFor="vehicleBrand">Vehicle Brand*</Label>
                                    <Input
                                        id="vehicleBrand"
                                        value={formData.vehicleBrand}
                                        onChange={(e) => updateFormField('vehicleBrand', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <Label htmlFor="numberPlate">Number Plate*</Label>
                                    <Input
                                        id="numberPlate"
                                        value={formData.numberPlate}
                                        onChange={(e) => updateFormField('numberPlate', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <Label htmlFor="vinNumber">VIN (optional)</Label>
                                    <Input
                                        id="vinNumber"
                                        value={formData.vinNumber}
                                        onChange={(e) => updateFormField('vinNumber', e.target.value)}
                                        placeholder="Enter VIN"
                                    />
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <Label htmlFor="modelName">Model Name*</Label>
                                    <Input
                                        id="modelName"
                                        value={formData.modelName}
                                        onChange={(e) => updateFormField('modelName', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <Label htmlFor="mulkiyaUpload">Mulkiya (optional)</Label>
                                    <Input
                                        id="mulkiyaUpload"
                                        className='cursor-pointer'
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        ref={mulkiyaInputRef}
                                        onChange={async (e) => {
                                            const fileList = e.target.files;
                                            if (!fileList || fileList.length === 0) return;
                                            const newFiles = Array.from(fileList);
                                            setMulkiyaFiles((prev) => [...prev, ...newFiles]);
                                            const readers = newFiles.map((file) =>
                                                new Promise<string>((resolve) => {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => resolve(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                })
                                            );
                                            const results = await Promise.all(readers);
                                            setMulkiyaPreviews((prev) => [...prev, ...results]);
                                            if (mulkiyaInputRef.current) mulkiyaInputRef.current.value = '';
                                        }}
                                    />
                                    {mulkiyaPreviews.length > 0 && (
                                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {mulkiyaPreviews.map((src, idx) => (
                                                <div key={idx} className="relative">
                                                    <img
                                                        src={src}
                                                        alt={`Mulkiya preview ${idx + 1}`}
                                                        className="w-full h-24 object-cover rounded border cursor-pointer"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label="Remove image"
                                                        onClick={() => {
                                                            setMulkiyaFiles((prev) => prev.filter((_, i) => i !== idx));
                                                            setMulkiyaPreviews((prev) => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black"
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

                        {/* Pre-Inspection Checklist */}
                        <div className="pt-4 border-t border-gray-200">
                            <h3 className="text-lg font-semibold mb-3 text-orange-700">Pre-Inspection Checklist</h3>
                            <p className="text-sm text-gray-600">
                                Pre-inspection is recorded after the vehicle arrives for its scheduled slot. You can capture notes, photos, and videos from the booking detail page once the car is on-site.
                            </p>
                        </div>

                                                {/* Submit Button */}
                                                <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                type="submit"
                                className="flex-1 bg-orange-600 hover:bg-orange-700"
                                disabled={submitting}
                            >
                                {submitting ? 'Submitting...' : 'Submit'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                                                onClick={() => setShowBookingForm(false)}
                                                                disabled={submitting}
                            >
                                Close
                            </Button>
                        </div>
                                                    </div>
                                                    {submitting && (
                                                        <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                                            <div className="flex flex-col items-center">
                                                                <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                                                <p className="mt-3 text-sm font-semibold text-orange-700">Booking...</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
        </ModuleAccess>
    );
}
