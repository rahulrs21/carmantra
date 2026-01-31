"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp, getDocs, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/lib/userContext';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, AlertCircle, Calendar, MessageSquare, X } from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'maintenance' | 'service' | 'inspection' | 'other';
  status: 'notStarted' | 'inProgress' | 'completed' | 'verified';
  deadline: string | { seconds: number } | Date;
  createdAt: { seconds: number };
  completedAt?: { seconds: number };
  serviceBookingId?: string;
  jobCardNo?: string;
  observedByUserId?: string;
  observedByRole?: string;
  observedByName?: string;
  companyId?: string;
  vehicleId?: string;
  bookingDetails?: {
    customerName?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    numberPlate?: string;
    serviceCategory?: string;
  };
  b2bDetails?: {
    companyName?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    numberPlate?: string;
    serviceName?: string;
  };
}

interface Comment {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  timestamp: { seconds: number };
}

const TASK_STATUSES = [
  { key: 'notStarted', label: 'Not Started', color: 'bg-gray-100 text-gray-800', icon: '⏳' },
  { key: 'inProgress', label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: '⚙️' },
  { key: 'completed', label: 'Completed', color: 'bg-yellow-100 text-yellow-800', icon: '✓' },
  { key: 'verified', label: 'Verified', color: 'bg-green-100 text-green-800', icon: '✓✓' },
];

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

// Helper function to parse deadline from various formats
function parseDeadlineDate(deadline: string | { seconds: number } | Date | undefined): Date | null {
  if (!deadline) return null;

  try {
    // If it's a Firestore Timestamp object
    if (typeof deadline === 'object' && 'seconds' in deadline) {
      return new Date(deadline.seconds * 1000);
    }
    // If it's already a Date
    if (deadline instanceof Date) {
      return deadline;
    }
    // If it's a string
    if (typeof deadline === 'string') {
      const date = new Date(deadline);
      // Check if the date is valid
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  } catch (error) {
    console.error('Error parsing deadline:', error);
  }
  return null;
}

// Format date as DD/MM/YYYY
function formatDateDDMMYYYY(date: Date | null): string {
  if (!date) return 'No deadline';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// Format date and time as DD/MM/YYYY HH:MM:SS
function formatDateTimeDDMMYYYY(date: Date | null): string {
  if (!date) return 'No date';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export default function EmployeeTasksPage() {
  const { role, user } = useUser();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<string>('thisMonth');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, any>>({});
  const [b2bDetailsCache, setB2bDetailsCache] = useState<Record<string, any>>({});

  // Redirect if not an employee
  useEffect(() => {
    if (role && role !== 'employee') {
      router.push('/admin/dashboard');
    }
  }, [role, router]);

  // Date filter helper functions
  const getDateRangeForFilter = (rangeType: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date, endDate: Date;

    switch (rangeType) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        startDate = customDateStart ? new Date(customDateStart) : today;
        endDate = customDateEnd ? new Date(customDateEnd) : today;
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  };

  // Get current employee ID from logged-in user
  useEffect(() => {
    if (!user?.uid) return;

    const getEmployeeIdFromUser = async () => {
      try {
        // Find employee record by user UID or email
        const employeesSnapshot = await getDocs(
          query(
            collection(db, 'employees'),
            where('email', '==', user.email?.toLowerCase() || '')
          )
        );

        if (employeesSnapshot.docs.length > 0) {
          setEmployeeId(employeesSnapshot.docs[0].id);
        } else {
          console.warn('No employee record found for user:', user.email);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching employee ID:', error);
        setLoading(false);
      }
    };

    getEmployeeIdFromUser();
  }, [user?.uid, user?.email]);

  // Fetch assigned tasks
  useEffect(() => {
    if (!employeeId) return;

    const q = query(
      collection(db, 'tasks'),
      where('assignedTo', 'array-contains', employeeId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const tasksList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Task))
        .sort((a, b) => {
          // Sort by creation date (descending - newest first)
          return b.createdAt.seconds - a.createdAt.seconds;
        });
      setTasks(tasksList);
      setLoading(false);
    });

    return () => unsub();
  }, [employeeId]);

  // Filter tasks
  useEffect(() => {
    let filtered = tasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        task.jobCardNo && task.jobCardNo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter - Filter by deadline for active tasks, by completedAt for finished tasks
    const { startDate, endDate } = getDateRangeForFilter(filterDateRange);
    filtered = filtered.filter(task => {
      // For completed or verified tasks, check completedAt date
      if (task.status === 'completed' || task.status === 'verified') {
        if (task.completedAt) {
          const completedDate = new Date(task.completedAt.seconds * 1000);
          return completedDate >= startDate && completedDate <= endDate;
        }
        // If no completedAt, use createdAt as fallback
        const createdDate = new Date(task.createdAt.seconds * 1000);
        return createdDate >= startDate && createdDate <= endDate;
      }
      
      // For active tasks, check deadline
      const taskDate = new Date(task.createdAt.seconds * 1000);
      return taskDate >= startDate && taskDate <= endDate;
    });

    setFilteredTasks(filtered);
  }, [tasks, filterStatus, filterPriority, searchTerm, filterDateRange, customDateStart, customDateEnd]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Show verification dialog if trying to verify
    if (newStatus === 'verified') {
      setTaskToVerify(taskId);
      setShowVerifyDialog(true);
      return;
    }

    try {
      const updateData: any = { status: newStatus };

      if (newStatus === 'completed') {
        updateData.completedAt = Timestamp.now();
      }

      await updateDoc(doc(db, 'tasks', taskId), updateData);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const confirmVerify = async () => {
    if (!taskToVerify) return;

    try {
      await updateDoc(doc(db, 'tasks', taskToVerify), {
        status: 'verified',
        completedAt: Timestamp.now(),
      });
      setShowVerifyDialog(false);
      setTaskToVerify(null);
    } catch (error) {
      console.error('Error verifying task:', error);
      alert('Failed to verify task');
    }
  };

  const isOverdue = (deadline: string | { seconds: number } | Date, status: string) => {
    const deadlineDate = parseDeadlineDate(deadline);
    return deadlineDate ? deadlineDate < new Date() && status !== 'completed' && status !== 'verified' : false;
  };

  const getTaskStats = (tasksToUse: Task[] = filteredTasks) => {
    return {
      total: tasksToUse.length,
      notStarted: tasksToUse.filter(t => t.status === 'notStarted').length,
      inProgress: tasksToUse.filter(t => t.status === 'inProgress').length,
      completed: tasksToUse.filter(t => t.status === 'completed' || t.status === 'verified').length,
      overdue: tasksToUse.filter(t => isOverdue(t.deadline, t.status)).length,
    };
  };

  // Fetch B2B booking details
  const fetchB2bDetails = async (companyId: string, vehicleId: string, serviceBookingId: string): Promise<{
    companyName: string;
    vehicleBrand: string;
    vehicleModel: string;
    numberPlate: string;
    serviceName: string;
  } | null> => {
    const cacheKey = `${companyId}-${vehicleId}`;
    if (b2bDetailsCache[cacheKey]) {
      return b2bDetailsCache[cacheKey];
    }

    try {
      // Fetch company name
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      const companyName = companyDoc.exists() ? (companyDoc.data()?.name as string) : 'Unknown Company';

      // Fetch vehicle details - Correct path structure
      let vehicleData: Record<string, any> = {};
      try {
        const vehicleDocRef = doc(
          db,
          'companies',
          companyId,
          'services',
          serviceBookingId,
          'vehicles',
          vehicleId
        );
        const vehicleDoc = await getDoc(vehicleDocRef);
        if (vehicleDoc.exists()) {
          vehicleData = vehicleDoc.data() as Record<string, any>;
          console.log('Vehicle data fetched:', vehicleData);
        } else {
          console.warn('Vehicle document not found at path');
        }
      } catch (e) {
        console.error('Error fetching vehicle:', e);
      }

      // Fetch service name
      let serviceName = 'Unknown Service';
      if (serviceBookingId) {
        try {
          const serviceDocRef = doc(db, 'companies', companyId, 'services', serviceBookingId);
          const serviceDoc = await getDoc(serviceDocRef);
          if (serviceDoc.exists()) {
            const serviceData = serviceDoc.data() as Record<string, any>;
            serviceName = (serviceData?.name || serviceData?.serviceName || 'Unknown Service') as string;
            console.log('Service name fetched:', serviceName);
          }
        } catch (e) {
          console.error('Error fetching service name:', e);
        }
      }

      const details = {
        companyName,
        vehicleBrand: (vehicleData?.brand || '') as string,
        vehicleModel: (vehicleData?.model || '') as string,
        numberPlate: (vehicleData?.plateNumber || vehicleData?.plate || '') as string,
        serviceName,
      };

      console.log('Final B2B details:', details);
      setB2bDetailsCache(prev => ({ ...prev, [cacheKey]: details }));
      return details;
    } catch (error) {
      console.error('Error fetching B2B details:', error);
      return null;
    }
  };

  // Fetch B2B details for tasks when they load
  useEffect(() => {
    const fetchAllB2bDetails = async () => {
      for (const task of tasks) {
        if (task.companyId && task.vehicleId && task.serviceBookingId) {
          await fetchB2bDetails(task.companyId, task.vehicleId, task.serviceBookingId);
        }
      }
    };
    fetchAllB2bDetails();
  }, [tasks]);

  const stats = getTaskStats();

  // Open comments modal
  const handleOpenComments = async (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowCommentsModal(true);
    setCommentsLoading(true);

    try {
      const q = query(collection(db, `tasks/${taskId}/comments`));
      const snapshot = await getDocs(q);
      const commentsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Comment))
        .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

      // Fetch user details for comments
      const newCache = { ...userCache };
      for (const comment of commentsList) {
        if (comment.authorId && !newCache[comment.authorId]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', comment.authorId));
            if (userDoc.exists()) {
              newCache[comment.authorId] = userDoc.data();
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
      }
      setUserCache(newCache);
      setComments(commentsList);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  if (role !== 'employee') {
    return null;
  }

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your assigned tasks and track progress</p>
      </div>

       {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            type="text"
            placeholder="🔍 Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-2 border-gray-300"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            {TASK_STATUSES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Priority</option>
            {['Urgent', 'High', 'Medium', 'Low'].map(p => (
              <option key={p} value={p.toLowerCase()}>{p}</option>
            ))}
          </select>

          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom date range inputs */}
        {filterDateRange === 'custom' && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
              <Input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="border-2 border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
              <Input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="border-2 border-gray-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: 'Total', count: stats.total, color: 'blue' },
          { label: 'To Do', count: stats.notStarted, color: 'gray' },
          { label: 'In Progress', count: stats.inProgress, color: 'yellow' },
          { label: 'Done', count: stats.completed, color: 'green' },
          { label: 'Overdue', count: stats.overdue, color: 'red' },
        ].map(stat => (
          <div
            key={stat.label}
            className={`bg-${stat.color}-50 border-2 border-${stat.color}-200 rounded-lg p-4 text-center`}
          >
            <div className={`text-2xl sm:text-3xl font-bold text-${stat.color}-700`}>
              {stat.count}
            </div>
            <p className={`text-xs sm:text-sm text-${stat.color}-600 mt-1 font-medium`}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

     

      {/* Tasks List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <p>Loading your tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No tasks assigned yet</p>
            <p className="text-sm text-gray-400">Check back soon for new assignments</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const overdue = isOverdue(task.deadline, task.status);
            return (
              <div
                key={task.id}
                className={`bg-white rounded-lg shadow-sm border-l-4 ${task.status === 'verified' ? 'border-l-green-600' :
                    task.status === 'completed' ? 'border-l-yellow-500' :
                      task.status === 'inProgress' ? 'border-l-blue-600' :
                        'border-l-orange-600'
                  } border border-gray-200 p-6 hover:shadow-md transition-shadow relative ${overdue ? 'ring-2 ring-red-300' : ''
                  }`}
              >
                {/* Verified Badge */}
                {task.status === 'verified' && (
                  <div className="absolute z-10 top-4 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ✓ Verified
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 break-words">
                        {task.title}
                        {task.jobCardNo && task.companyId && (
                          <>
                            {": "}
                            {task.jobCardNo}
                            <span className="p-2 bg-blue-500 rounded-full text-xs text-white ml-2">B2B Service</span>
                          </>
                        )}
                      </h3>

                      {task.jobCardNo && (
                        task.companyId ? (
                          // B2B Booking link
                          <Link
                            href={`/admin/b2b-booking/companies/${task.companyId}/services/${task.serviceBookingId}/vehicles/${task.vehicleId}`}
                            target="_blank"
                            className='bg-blue-400 p-1 rounded-full px-2 text-xs'
                          >
                            <span className="inline-block text-xs font-semibold text-white hover:text-blue-800 whitespace-nowrap ">
                             View Task ({task.jobCardNo})
                            </span>
                          </Link>
                        ) : (
                          // Booking Service link
                          <Link href={`/admin/book-service/${task.serviceBookingId}`} target="_blank" className='bg-blue-400 p-1 rounded-full px-2 text-xs'>
                            <span className="inline-block text-xs font-semibold text-white hover:text-blue-800 whitespace-nowrap">
                              View Task ({task.jobCardNo})
                            </span>
                          </Link>
                        )
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 break-words">{task.description}</p>

                    {/* Booking Details (if available) */}
                    {task.bookingDetails && (
                      <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {task.bookingDetails.customerName && (
                          <div>
                            <span className="font-semibold text-blue-900">Customer:</span>
                            <p className="text-blue-700">{task.bookingDetails.customerName}</p>
                          </div>
                        )}
                        {task.bookingDetails.vehicleBrand && (
                          <div>
                            <span className="font-semibold text-blue-900">Vehicle:</span>
                            <p className="text-blue-700">{task.bookingDetails.vehicleBrand} {task.bookingDetails.vehicleModel}</p>
                          </div>
                        )}
                        {task.bookingDetails.numberPlate && (
                          <div>
                            <span className="font-semibold text-blue-900">Plate:</span>
                            <p className="text-blue-700">{task.bookingDetails.numberPlate}</p>
                          </div>
                        )}
                        {task.bookingDetails.serviceCategory && (
                          <div>
                            <span className="font-semibold text-blue-900">Service:</span>
                            <p className="text-blue-700">{task.bookingDetails.serviceCategory}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* B2B Booking Details (if available) */}
                    {task.companyId && task.vehicleId && b2bDetailsCache[`${task.companyId}-${task.vehicleId}`] && (
                      <div className="mb-3 p-3 bg-purple-50 rounded border border-purple-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {b2bDetailsCache[`${task.companyId}-${task.vehicleId}`].companyName && (
                          <div>
                            <span className="font-semibold text-purple-900">Company:</span>
                            <p className="text-purple-700">{b2bDetailsCache[`${task.companyId}-${task.vehicleId}`].companyName}</p>
                          </div>
                        )}
                        {(b2bDetailsCache[`${task.companyId}-${task.vehicleId}`].vehicleBrand || b2bDetailsCache[`${task.companyId}-${task.vehicleId}`].vehicleModel) && (
                          <div>
                            <span className="font-semibold text-purple-900">Vehicle:</span>
                            <p className="text-purple-700">{b2bDetailsCache[`${task.companyId}-${task.vehicleId}`].vehicleBrand} {b2bDetailsCache[`${task.companyId}-${task.vehicleId}`].vehicleModel}</p>
                          </div>
                        )}
                        {b2bDetailsCache[`${task.companyId}-${task.vehicleId}`].numberPlate && (
                          <div>
                            <span className="font-semibold text-purple-900">Plate:</span>
                            <p className="text-purple-700">{b2bDetailsCache[`${task.companyId}-${task.vehicleId}`].numberPlate}</p>
                          </div>
                        )}
                        {b2bDetailsCache[`${task.companyId}-${task.vehicleId}`].serviceName && (
                          <div>
                            <span className="font-semibold text-purple-900">Service:</span>
                            <p className="text-purple-700">{task.title}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Task Meta */}
                    <div className="flex flex-wrap gap-3 items-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                      </span>

                      <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full capitalize">
                        {task.category}
                      </span>

                      {task.observedByName && (
                        <span className="text-xs font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full capitalize">
                          {task.observedByName} ({task.observedByRole})
                        </span>
                      )}

                      <div className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-600'
                        }`}>
                        <Calendar className="w-3 h-3" /> Deadline:{' '}
                        {formatDateDDMMYYYY(parseDeadlineDate(task.deadline))}
                        {overdue && ' ⚠️'}
                      </div>

                      {task.createdAt && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="w-3 h-3" /> Created:{' '}
                          {formatDateTimeDDMMYYYY(new Date(task.createdAt.seconds * 1000))  }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex flex-col gap-2 sm:min-w-40 w-full sm:w-auto">
                    {/* View Comments Button */}
                    <button
                      onClick={() => handleOpenComments(task.id)}
                      className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 border border-blue-200"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Comments
                    </button>

                    <hr />

                    {/* Status Buttons */}
                    <div className="space-y-1">
                      {TASK_STATUSES.map(statusOption => {
                        const isCurrentStatus = task.status === statusOption.key;
                        const isVerified = task.status === 'verified';
                        const deadlineDate = parseDeadlineDate(task.deadline);
                        const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
                        
                        // Determine if button should be disabled
                        let isDisabled = isVerified;
                        
                        if (isDeadlinePassed) {
                          // If status is 'notStarted' and deadline passed, disable all buttons except 'notStarted'
                          if (task.status === 'notStarted' && statusOption.key !== 'notStarted') {
                            isDisabled = true;
                          }
                          // If status is 'inProgress' and deadline passed, disable 'completed' and 'verified'
                          if (task.status === 'inProgress' && (statusOption.key === 'completed' || statusOption.key === 'verified')) {
                            isDisabled = true;
                          }
                        }
                        
                        return (
                          <button
                            key={statusOption.key}
                            onClick={() => handleStatusChange(task.id, statusOption.key)}
                            disabled={isDisabled}
                            className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${isCurrentStatus
                                ? `${statusOption.color} ring-2 ring-offset-1 ring-current`
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {statusOption.icon} {statusOption.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Progress</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {task.status === 'completed' || task.status === 'verified' ? '100%' : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${task.status === 'completed'
                          ? 'w-full bg-yellow-500'
                          : task.status === 'verified'
                            ? 'w-full bg-green-500'
                            : task.status === 'inProgress'
                              ? 'w-1/2 bg-blue-500'
                              : 'w-0 bg-gray-300'
                        }`}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Empty State Info */}
      {!loading && tasks.length > 0 && filteredTasks.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            No tasks match your filters. Try adjusting the search or status filter.
          </p>
        </div>
      )}

      {/* Verify Dialog */}
      {showVerifyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Confirm Task Verification</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to verify this task? Once verified, you won't be able to change its status.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVerifyDialog(false);
                  setTaskToVerify(null);
                }}
                className="px-4"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmVerify}
                className="px-4 bg-green-600 hover:bg-green-700"
              >
                Verify Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[96vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Task Comments</h2>
              <button
                onClick={() => {
                  setShowCommentsModal(false);
                  setSelectedTaskId(null);
                  setComments([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {commentsLoading ? (
                <p className="text-center text-gray-500">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-center text-gray-500 text-sm">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {comments.map(comment => {
                    const userData = comment.authorId ? userCache[comment.authorId] : null;
                    const displayName = userData?.displayName || comment.author || 'Unknown User';
                    const displayRole = userData?.role || 'User';

                    return (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{displayName} ({displayRole})</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDateTimeDDMMYYYY(new Date(comment.timestamp.seconds * 1000))}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{comment.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
