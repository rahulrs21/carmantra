"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/lib/userContext';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'maintenance' | 'service' | 'inspection' | 'other';
  status: 'notStarted' | 'inProgress' | 'completed' | 'verified';
  deadline: string;
  createdAt: { seconds: number };
  completedAt?: { seconds: number };
}

const TASK_STATUSES = [
  { key: 'notStarted', label: 'Not Started', color: 'bg-gray-100 text-gray-800', icon: '⏳' },
  { key: 'inProgress', label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: '⚙️' },
  { key: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800', icon: '✓' },
  { key: 'verified', label: 'Verified', color: 'bg-purple-100 text-purple-800', icon: '✓✓' },
];

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function EmployeeTasksPage() {
  const { role } = useUser();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // Redirect if not an employee
  useEffect(() => {
    if (role && role !== 'employee') {
      router.push('/admin/dashboard');
    }
  }, [role, router]);

  // Get current employee ID (would come from auth context in real app)
  useEffect(() => {
    // For demo, we'll fetch first employee
    const getEmployeeId = async () => {
      const snapshot = await getDocs(collection(db, 'employees'));
      if (snapshot.docs.length > 0) {
        setEmployeeId(snapshot.docs[0].id);
      }
    };
    getEmployeeId();
  }, []);

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
          // Sort by deadline first
          const deadlineA = new Date(a.deadline).getTime();
          const deadlineB = new Date(b.deadline).getTime();
          if (deadlineA !== deadlineB) return deadlineA - deadlineB;
          // Then by priority
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
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
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  }, [tasks, filterStatus, filterPriority, searchTerm]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
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

  const isOverdue = (deadline: string, status: string) => {
    return new Date(deadline) < new Date() && status !== 'completed' && status !== 'verified';
  };

  const getTaskStats = () => {
    return {
      total: tasks.length,
      notStarted: tasks.filter(t => t.status === 'notStarted').length,
      inProgress: tasks.filter(t => t.status === 'inProgress').length,
      completed: tasks.filter(t => t.status === 'completed' || t.status === 'verified').length,
      overdue: tasks.filter(t => isOverdue(t.deadline, t.status)).length,
    };
  };

  const stats = getTaskStats();

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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          </div>
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
                  className={`bg-white rounded-lg shadow-sm border-l-4 border-l-orange-600 border border-gray-200 p-6 hover:shadow-md transition-shadow ${
                    overdue ? 'ring-2 ring-red-300' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Task Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{task.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>

                      {/* Task Meta */}
                      <div className="flex flex-wrap gap-3 items-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                        </span>

                        <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full capitalize">
                          {task.category}
                        </span>

                        <div className={`flex items-center gap-1 text-xs font-medium ${
                          overdue ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {new Date(task.deadline).toLocaleDateString()}
                          {overdue && ' ⚠️'}
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col gap-2 sm:min-w-40">
                      {/* Status Buttons */}
                      <div className="space-y-1">
                        {TASK_STATUSES.map(statusOption => {
                          const isCurrentStatus = task.status === statusOption.key;
                          return (
                            <button
                              key={statusOption.key}
                              onClick={() => handleStatusChange(task.id, statusOption.key)}
                              className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isCurrentStatus
                                  ? `${statusOption.color} ring-2 ring-offset-1 ring-current`
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
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
                        className={`h-2 rounded-full transition-all ${
                          task.status === 'completed' || task.status === 'verified'
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
      </div>
    );
}
