"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate, ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';
import { useUser } from '@/lib/userContext';
import { X, Plus, Edit2, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  assignedToNames: string[];
  createdBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'maintenance' | 'service' | 'inspection' | 'other';
  status: 'notStarted' | 'inProgress' | 'completed' | 'verified';
  deadline: string | { seconds: number } | Date;
  createdAt: { seconds: number };
  updatedAt: { seconds: number };
  completedAt?: { seconds: number };
  comments: number;
  observedByUserId?: string;
  observedByRole?: string;
  observedByName?: string;
  jobCardNo?: string;
  companyId?: string;
  serviceBookingId?: string;
  vehicleId?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface ObserverUser {
  id: string;
  name: string;
  role: string;
}

const TASK_CATEGORIES = ['Maintenance', 'Service', 'Inspection', 'Other'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const TASK_STATUSES = [
  { key: 'notStarted', label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
  { key: 'inProgress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { key: 'completed', label: 'Completed', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'verified', label: 'Verified', color: 'bg-green-300 text-green-800' },
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

export default function TaskManagementPage() {
  const { role } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [observerUsers, setObserverUsers] = useState<ObserverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('thisMonth');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');

  // Form state with proper typing
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    assignedTo: string[];
    observedByUserId: string;
    observedByRole: 'admin' | 'manager' | 'sales' | 'accounts' | '';
    observedByName: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: 'maintenance' | 'service' | 'inspection' | 'other';
    deadline: string;
  }>({
    title: '',
    description: '',
    assignedTo: [],
    observedByUserId: '',
    observedByRole: '',
    observedByName: '',
    priority: 'medium',
    category: 'maintenance',
    deadline: '',
  });

  const isAuthorized = role && ['admin', 'manager', 'sales'].includes(role);

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

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'employees'));
        const empList = snapshot.docs
          .map(doc => ({
            id: doc.id,
            name: doc.data().name || '',
            email: doc.data().email || '',
          }))
          .filter(emp => emp.email ? true : false)
          .sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(empList);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch observer users from users collection
  useEffect(() => {
    const fetchObserverUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const usersList = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.displayName || data.name || 'User',
              role: data.role || '',
            };
          })
          .filter(user => ['admin', 'manager', 'sales', 'accounts'].includes(user.role))
          .sort((a, b) => a.name.localeCompare(b.name));
        setObserverUsers(usersList);
      } catch (error) {
        console.error('Error fetching observer users:', error);
      }
    };
    fetchObserverUsers();
  }, []);

  // Fetch tasks
  useEffect(() => {
    const q = query(collection(db, 'tasks'));
    const unsub = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];

      setTasks(taskList.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || formData.assignedTo.length === 0 || !formData.deadline) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const assignedNames = formData.assignedTo
        .map(id => employees.find(emp => emp.id === id)?.name || '')
        .filter(Boolean);

      const taskData = {
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo,
        assignedToNames: assignedNames,
        createdBy: 'system', // In real app, get from auth
        priority: formData.priority,
        category: formData.category,
        status: 'notStarted',
        deadline: formData.deadline,
        observedByUserId: formData.observedByUserId,
        observedByRole: formData.observedByRole,
        observedByName: formData.observedByName,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        comments: 0,
      };

      if (editingTaskId) {
        await updateDoc(doc(db, 'tasks', editingTaskId), {
          ...taskData,
          updatedAt: Timestamp.now(),
        });
        alert('Task updated successfully');
        setEditingTaskId(null);
      } else {
        await addDoc(collection(db, 'tasks'), taskData);
        alert('Task created successfully');
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        assignedTo: [],
        observedByUserId: '',
        observedByRole: '',
        observedByName: '',
        priority: 'medium',
        category: 'maintenance',
        deadline: '',
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      alert('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;

    // Date filter
    const { startDate, endDate } = getDateRangeForFilter(filterDateRange);
    const taskDate = new Date(task.createdAt.seconds * 1000);
    const matchesDate = taskDate >= startDate && taskDate <= endDate;

    return matchesSearch && matchesStatus && matchesPriority && matchesDate;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'inProgress':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'verified':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const isOverdue = (deadline: string | { seconds: number } | Date | undefined) => {
    const deadlineDate = parseDeadlineDate(deadline);
    if (!deadlineDate) return false;
    return deadlineDate < new Date() ? true : false;
  };

  return (
    <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Task Management</h1>
            <p className="text-sm text-gray-500 mt-1">Create and assign tasks to employees</p>
          </div>
          {isAuthorized && (
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showCreateForm ? 'Cancel' : 'New Task'}
            </Button>
          )}
        </div>

        {/* Create Task Modal Popup */}
        {isAuthorized && showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-white">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  {editingTaskId ? '✏️ Edit Task' : '➕ Create New Task'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingTaskId(null);
                    setFormData({
                      title: '',
                      description: '',
                      assignedTo: [],
                      observedByUserId: '',
                      observedByRole: '',
                      observedByName: '',
                      priority: 'medium',
                      category: 'maintenance',
                      deadline: '',
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6">
                <form onSubmit={handleCreateTask} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title *</label>
                    <Input
                      type="text"
                      placeholder="e.g., Service Vehicle Oil Change"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="border-2 border-gray-300 focus:border-orange-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      placeholder="Detailed task description..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
                      rows={4}
                    />
                  </div>

                  {/* Assign To */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Assign To *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                      {employees.map(emp => (
                        <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.assignedTo.includes(emp.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedTo: [...prev.assignedTo, emp.id],
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedTo: prev.assignedTo.filter(id => id !== emp.id),
                                }));
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-700">{emp.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Priority & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Priority *</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-orange-500"
                      >
                        {TASK_PRIORITIES.map(p => (
                          <option key={p} value={p.toLowerCase()}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-orange-500"
                      >
                        {TASK_CATEGORIES.map(c => (
                          <option key={c} value={c.toLowerCase()}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Observed By */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Observed By</label>
                    <select
                      value={formData.observedByUserId}
                      onChange={(e) => {
                        const selectedUser = observerUsers.find(u => u.id === e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          observedByUserId: e.target.value,
                          observedByRole: (selectedUser?.role as 'admin' | 'manager' | 'sales' | 'accounts') || '',
                          observedByName: selectedUser?.name || '',
                        }));
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    >
                      <option value="">Select Observer...</option>
                      {observerUsers.length === 0 ? (
                        <option disabled>No users found with admin roles</option>
                      ) : (
                        observerUsers.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} - {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </option>
                        ))
                      )}
                    </select>
                    {formData.observedByName && (
                      <p className="text-xs text-gray-600 mt-1">
                        Selected: {formData.observedByName} ({formData.observedByRole})
                      </p>
                    )}
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline *</label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="border-2 border-gray-300 focus:border-orange-500"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingTaskId(null);
                        setFormData({
                          title: '',
                          description: '',
                          assignedTo: [],
                          observedByUserId: '',
                          observedByRole: '',
                          observedByName: '',
                          priority: 'medium',
                          category: 'maintenance',
                          deadline: '',
                        });
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {editingTaskId ? 'Update Task' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

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
              {TASK_PRIORITIES.map(p => (
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

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <h2 className="font-bold text-lg text-gray-800">
              Tasks ({filteredTasks.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <p>Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No tasks found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Title</th>
                    <th className="hidden md:table-cell text-left px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Assigned To</th>
                    <th className="hidden sm:table-cell text-left px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Priority</th>
                    <th className="hidden sm:table-cell text-left px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="hidden lg:table-cell text-left px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Observer</th>
                    <th className="hidden lg:table-cell text-left px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Deadline</th>
                    <th className="text-center px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => (
                    <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div> 
                          <p className="text-xs font-medium text-gray-900 break-words">
                            {task.title}
                            {task.jobCardNo && task.companyId && (
                              <>
                                {": "}
                                {task.jobCardNo} 
                              </>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {task.category}
                            {task.jobCardNo && task.companyId && (
                              <> 
                                <span className=" text-xs text-blue-500 ml-2">| B2B Service</span>
                              </>
                            )}  
                          </p>
                        </div>
                      </td>

                      <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                        <div className="text-xs text-gray-700 space-y-1">
                          {task.assignedToNames.slice(0, 2).map((name, idx) => (
                            <p key={idx}>{name}</p>
                          ))}
                          {task.assignedToNames.length > 2 && (
                            <p className="text-gray-500">+{task.assignedToNames.length - 2} more</p>
                          )}
                        </div>
                      </td>

                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </td>

                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${TASK_STATUSES.find(s => s.key === task.status)?.color || ''
                            }`}>
                            {TASK_STATUSES.find(s => s.key === task.status)?.label}
                          </span>
                        </div>
                      </td>

                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                        {task.observedByName ? (
                          <span className="text-xs font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full capitalize">
                            {task.observedByName} ({task.observedByRole})
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>

                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                        <span className={`text-xs font-medium ${isOverdue(task.deadline) && task.status !== 'completed' && task.status !== 'verified'
                            ? 'text-red-600 font-bold'
                            : 'text-gray-700'
                          }`}>
                          {formatDateDDMMYYYY(parseDeadlineDate(task.deadline))}
                        </span>
                      </td>

                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {isAuthorized && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  const deadlineDate = parseDeadlineDate(task.deadline);
                                  const deadlineString = deadlineDate
                                    ? deadlineDate.toISOString().split('T')[0]
                                    : '';
                                  const formDataToSet: typeof formData = {
                                    title: task.title,
                                    description: task.description,
                                    assignedTo: task.assignedTo,
                                    observedByUserId: task.observedByUserId || '',
                                    observedByRole: (task.observedByRole as 'admin' | 'manager' | 'sales' | 'accounts' | '') || '',
                                    observedByName: task.observedByName || '',
                                    priority: task.priority as any,
                                    category: task.category as any,
                                    deadline: deadlineString,
                                  };
                                  setFormData(formDataToSet);
                                  setShowCreateForm(true);
                                }}
                                disabled={task.status === 'verified'}
                                className={`p-1.5 rounded transition-colors ${task.status === 'verified'
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-blue-600 hover:bg-blue-100'
                                  }`}
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={task.status === 'verified'}
                                className={`p-1.5 rounded transition-colors ${task.status === 'verified'
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-red-600 hover:bg-red-100'
                                  }`}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <Link href={`/admin/tasks/${task.id}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModuleAccessComponent>
  );
}
