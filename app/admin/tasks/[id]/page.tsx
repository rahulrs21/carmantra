"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, Timestamp, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModuleAccessComponent, ModuleAccess } from '@/components/PermissionGate';
import { useUser } from '@/lib/userContext';
import { ArrowLeft, Send, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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
  deadline: string;
  createdAt: { seconds: number };
  updatedAt: { seconds: number };
  completedAt?: { seconds: number };
}

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: { seconds: number };
}

const TASK_STATUSES = [
  { key: 'notStarted', label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
  { key: 'inProgress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { key: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { key: 'verified', label: 'Verified', color: 'bg-purple-100 text-purple-800' },
];

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useUser();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

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
    const unsubComments = onSnapshot(q, (snapshot) => {
      const commentsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Comment))
        .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
      setComments(commentsList);
    });

    return () => unsubComments();
  }, [taskId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim() || !task) return;

    setSubmittingComment(true);
    try {
      await addDoc(collection(db, `tasks/${task.id}/comments`), {
        author: 'Current User', // In real app, get from auth
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

  const isOverdue = task ? new Date(task.deadline) < new Date() && task.status !== 'completed' && task.status !== 'verified' : false;

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
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Task Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Description</label>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{task.description}</p>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Created</label>
                    <p className="text-sm text-gray-700 mt-2">
                      {new Date(task.createdAt.seconds * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Deadline</label>
                    <p className={`text-sm mt-2 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                      {new Date(task.deadline).toLocaleDateString()}
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
                  comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{comment.author}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(comment.timestamp.seconds * 1000).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{comment.text}</p>
                    </div>
                  ))
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
                    disabled={!isAuthorized && task.status !== statusOption.key}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 flex items-center gap-2 ${
                      task.status === statusOption.key
                        ? `${statusOption.color} border-current`
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    } ${!isAuthorized && task.status !== statusOption.key ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  {new Date(task.updatedAt.seconds * 1000).toLocaleString()}
                </p>

                {task.completedAt && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">Completed At</p>
                    <p className="text-sm font-medium text-green-700">
                      {new Date(task.completedAt.seconds * 1000).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleAccessComponent>
  );
}
