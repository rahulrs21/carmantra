"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, Timestamp, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModuleAccessComponent, ModuleAccess } from '@/components/PermissionGate';
import { useUser } from '@/lib/userContext';
import { ArrowLeft, Send, Clock, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
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
  jobCardNo?: string;
  serviceBookingId?: string;
  companyId?: string;
  vehicleId?: string;
}

interface Comment {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  timestamp: { seconds: number };
}

const TASK_STATUSES = [
  { key: 'notStarted', label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
  { key: 'inProgress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { key: 'completed', label: 'Completed', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'verified', label: 'Verified', color: 'bg-green-100 text-green-800' },
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

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role, displayName, user, loading: userLoading } = useUser();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, any>>({});

  const isAuthorized = role && ['admin', 'manager', 'sales'].includes(role);

  // Fetch task
  useEffect(() => {
    if (!taskId) return;

    const taskRef = doc(db, 'tasks', taskId);
    const unsubTask = onSnapshot(taskRef, (docSnap) => {
      if (docSnap.exists()) {
        setTask({ id: docSnap.id, ...docSnap.data() } as Task);
      }
      setLoading(false);
    });

    return () => unsubTask();
  }, [taskId]);

  // Fetch comments
  useEffect(() => {
    if (!taskId) return;

    const q = query(collection(db, `tasks/${taskId}/comments`));
    const unsubComments = onSnapshot(q, async (snapshot) => {
      const commentsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Comment))
        .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

      // Fetch user details for comments with authorId
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
    });

    return () => unsubComments();
  }, [taskId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    // Show verification dialog if trying to verify
    if (newStatus === 'verified') {
      setShowVerifyDialog(true);
      return;
    }

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };

      if (newStatus === 'completed') {
        updateData.completedAt = Timestamp.now();
      }

      await updateDoc(doc(db, 'tasks', task.id), updateData);
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const confirmVerify = async () => {
    if (!task) return;

    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        status: 'verified',
        updatedAt: Timestamp.now(),
        completedAt: Timestamp.now(),
      });
      setShowVerifyDialog(false);
    } catch (error) {
      console.error('Error verifying task:', error);
      alert('Failed to verify task');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim() || !task) return;

    setSubmittingComment(true);
    try {
      await addDoc(collection(db, `tasks/${task.id}/comments`), {
        author: `${displayName || user?.displayName || user?.email?.split('@')[0] || 'Unknown'} (${role || 'User'})`,
        authorId: user?.uid || '',
        text: commentText,
        timestamp: Timestamp.now(),
      });
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const isOverdue = task ? (() => {
    const deadlineDate = parseDeadlineDate(task.deadline);
    return deadlineDate ? deadlineDate < new Date() && task.status !== 'completed' && task.status !== 'verified' : false;
  })() : false;

  if (loading) {
    return (
      <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
        <div className="p-8 text-center text-gray-500">Loading task...</div>
      </ModuleAccessComponent>
    );
  }

  if (!task) {
    return (
      <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
        <div className="p-8 text-center text-gray-500">Task not found</div>
      </ModuleAccessComponent>
    );
  }

  return (
    <ModuleAccessComponent module={ModuleAccess.ACCOUNTS}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/tasks">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>



          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{task.title}</h1>
          <h3 className="text-lg font-bold text-gray-900 break-words">

            {task.jobCardNo && task.companyId && (
              <>
                {": "}
                {task.jobCardNo}
                <span className="p-2 bg-blue-500 rounded-full text-xs text-white ml-2">B2B Service</span>
              </>
            )}
          </h3>
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Task Details</h2>

              <div className="space-y-4 ">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{task.description}</p>
                  </div>
                  <div>
                    {/* Conditional View Task Button */}
                    {task.serviceBookingId && (
                      task.companyId ? (
                        // B2B Booking link
                        <Link
                          href={`/admin/b2b-booking/companies/${task.companyId}/services/${task.serviceBookingId}/vehicles/${task.vehicleId}`}
                          target="_blank"
                        >
                          <span className="inline-block text-xs font-semibold text-blue-600 hover:text-blue-800 underline whitespace-nowrap">
                            {task.jobCardNo}
                          </span>
                        </Link>
                      ) : (
                        // Booking Service link
                        <Link href={`/admin/book-service/${task.serviceBookingId}`} target="_blank">
                          <div className="flex items-center gap-2">
                            <span className="inline-block text-xs font-semibold text-blue-600 hover:text-blue-800  whitespace-nowrap">
                              <span className='py-2 px-3 mr-2 bg-blue-500 text-white rounded decoration-white'>View Job</span>
                              {task.jobCardNo}
                            </span>
                          </div>
                        </Link>
                      )
                    )}
                  </div>
                </div>



                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Category</label>
                    <p className="text-sm text-gray-700 mt-2 capitalize">{task.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Priority</label>
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Assigned To</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {task.assignedToNames.map((name, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>


                  <div>
                    <label className="text-sm font-semibold text-gray-700">Task Status</label>
                    <div className="mt-2">
                      {task.status === 'completed' || task.status === 'verified' ? (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">    
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      ) : (     
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">    
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Created</label>
                    <p className="text-sm text-gray-700 mt-2">
                      {formatDateDDMMYYYY(new Date(task.createdAt.seconds * 1000))}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Deadline</label>
                    <p className={`text-sm mt-2 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                      {formatDateDDMMYYYY(parseDeadlineDate(task.deadline))}
                      {isOverdue && ' ⚠️ OVERDUE'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Comments</h2>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="mb-6">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 border-2 border-gray-300"
                  />
                  <Button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">No comments yet</p>
                ) : (
                  comments.map(comment => {
                    const userData = comment.authorId ? userCache[comment.authorId] : null;
                    const displayName = userData?.displayName || comment.author || 'Unknown User';
                    const displayRole = userData?.role || 'User';

                    return (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{displayName} ({displayRole})</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDateTimeDDMMYYYY(new Date(comment.timestamp.seconds * 1000))}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{comment.text}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Status & Actions */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Status</h2>

              <div className="space-y-2">
                {TASK_STATUSES.map(statusOption => (
                  <button
                    key={statusOption.key}
                    onClick={() => handleStatusChange(statusOption.key)}
                    disabled={(!isAuthorized && task.status !== statusOption.key) || task.status === 'verified'}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 flex items-center gap-2 ${task.status === statusOption.key
                      ? `${statusOption.color} border-current`
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      } ${(!isAuthorized && task.status !== statusOption.key) || task.status === 'verified' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {statusOption.key === 'inProgress' && <Clock className="w-4 h-4" />}
                    {(statusOption.key === 'completed' || statusOption.key === 'verified') && <CheckCircle2 className="w-4 h-4" />}
                    {statusOption.key === 'notStarted' && <AlertCircle className="w-4 h-4" />}
                    {statusOption.label}
                  </button>
                ))}
              </div>

              {/* Activity Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3">Last Updated</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatDateTimeDDMMYYYY(new Date(task.updatedAt.seconds * 1000))}
                </p>

                {task.completedAt && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">Completed At</p>
                    <p className="text-sm font-medium text-green-700">
                      {formatDateTimeDDMMYYYY(new Date(task.completedAt.seconds * 1000))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
                  onClick={() => setShowVerifyDialog(false)}
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
      </div>
    </ModuleAccessComponent>
  );
}
