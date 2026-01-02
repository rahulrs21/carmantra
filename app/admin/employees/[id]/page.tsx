"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, storage, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Employee, DEFAULT_PERMISSIONS } from '@/lib/types';
import { useUser } from '@/lib/userContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Shield, FileText, User, Lock, Upload, Download, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { ModuleAccess, ModuleAccessComponent } from '@/components/PermissionGate';

interface Document {
  id: string;
  employeeId: string;
  type: 'passport' | 'emirates_id' | 'visa' | 'other';
  fileName: string;
  storagePath: string;
  size: number;
  uploadedAt: any;
}

interface AccountSetup {
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

const documentTypes = [
  { value: 'passport', label: 'Passport' },
  { value: 'emirates_id', label: 'Emirates ID' },
  { value: 'visa', label: 'Visa' },
  { value: 'other', label: 'Other Documents' },
];

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role: currentRole } = useUser();
  const employeeId = params.id as string;

  // Basic employee state
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'documents' | 'account'>('basic');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    joiningDate: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Document management state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [viewingDocUrl, setViewingDocUrl] = useState<string>('');
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);

  // Account setup state
  const [accountEnabled, setAccountEnabled] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [settingupAccount, setSettingupAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountSetup, setAccountSetup] = useState<AccountSetup>({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
  });

  const isAuthorized = currentRole === 'admin' || currentRole === 'manager';

  // Fetch employee and check for existing account
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'employees', employeeId));
        if (docSnap.exists()) {
          const data = docSnap.data() as Employee;
          data.id = docSnap.id;
          setEmployee(data);
          
          const joiningDate = data.joiningDate?.toDate?.() || new Date(data.joiningDate);
          setFormData({
            name: data.name,
            email: data.email || '',
            phone: data.phone || '',
            department: data.department,
            position: data.position,
            joiningDate: joiningDate.toISOString().split('T')[0],
            status: data.status as 'active' | 'inactive',
          });

          // Check for existing user account
          const userQuery = query(collection(db, 'users'), where('employeeId', '==', employeeId));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setAccountEnabled(userData.status !== 'inactive');
            setAccountSetup(prev => ({
              ...prev,
              email: userData.email || '',
              role: userData.role || 'employee',
            }));
          }
        } else {
          toast.error('Employee not found');
          router.push('/admin/employees');
        }
      } catch (error) {
        console.error('Error fetching employee:', error);
        toast.error('Failed to load employee');
        router.push('/admin/employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId, router]);

  // Fetch documents when documents tab is opened
  useEffect(() => {
    if (activeTab === 'documents' && documents.length === 0) {
      fetchDocuments();
    }
  }, [activeTab]);

  // Load image URL when viewing document
  useEffect(() => {
    const loadImageUrl = async () => {
      if (viewingDoc && !viewingDoc.storagePath.endsWith('.pdf')) {
        try {
          const fileRef = ref(storage, viewingDoc.storagePath);
          const url = await getDownloadURL(fileRef);
          setViewingDocUrl(url);
        } catch (error) {
          console.error('Error loading image URL:', error);
          toast.error('Failed to load image preview');
        }
      }
    };
    
    loadImageUrl();
  }, [viewingDoc]);

  const handleSave = async () => {
    if (!isAuthorized) {
      toast.error('You do not have permission to edit employees');
      return;
    }

    if (!formData.name || !formData.department || !formData.position) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'employees', employeeId), {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        department: formData.department,
        position: formData.position,
        joiningDate: Timestamp.fromDate(new Date(formData.joiningDate)),
        status: formData.status,
        updatedAt: Timestamp.now(),
      });

      setEmployee(prev => prev ? { ...prev, ...formData } : null);
      setEditing(false);
      toast.success('Employee updated successfully');
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  // Document management functions
  const fetchDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const docsQuery = query(
        collection(db, 'employeeDocuments'),
        where('employeeId', '==', employeeId)
      );
      const snapshot = await getDocs(docsQuery);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Document));
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentUpload = async (file: File, docType: string) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${employeeId}_${docType}_${Date.now()}`;
      const storageRef = ref(storage, `employeeDocuments/${employeeId}/${fileName}`);

      // Upload file to storage
      await uploadBytes(storageRef, file);

      // Save document metadata to Firestore
      const docData = {
        employeeId,
        type: docType,
        fileName: file.name,
        storagePath: `employeeDocuments/${employeeId}/${fileName}`,
        size: file.size,
        uploadedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'employeeDocuments'), docData);
      
      // Update local state
      setDocuments(prev => [...prev, { id: docRef.id, ...docData } as Document]);
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    setDownloadingDoc(doc.id);
    try {
      const fileRef = ref(storage, doc.storagePath);
      const data = await getBytes(fileRef);
      
      // Create download link
      const url = URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Document downloaded');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDeleteDocument = async (docItem: Document) => {
    setDeletingDoc(docItem);
  };

  const confirmDeleteDocument = async () => {
    if (!deletingDoc) return;

    try {
      // Delete from storage
      const fileRef = ref(storage, deletingDoc.storagePath);
      await deleteObject(fileRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'employeeDocuments', deletingDoc.id));

      // Update local state
      setDocuments(prev => prev.filter(d => d.id !== deletingDoc.id));
      toast.success('Document deleted successfully');
      setDeletingDoc(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // Account management functions
  const handleSetupAccount = async () => {
    if (!accountSetup.email || !accountSetup.password || !accountSetup.confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (accountSetup.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (accountSetup.password !== accountSetup.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSettingupAccount(true);
    try {
      const userQuery = query(collection(db, 'users'), where('employeeId', '==', employeeId));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        // Update existing user document
        const userId = userSnapshot.docs[0].id;
        await updateDoc(doc(db, 'users', userId), {
          email: accountSetup.email,
          role: accountSetup.role,
          displayName: employee?.name || '',
          status: 'active',
          permissions: DEFAULT_PERMISSIONS[accountSetup.role as keyof typeof DEFAULT_PERMISSIONS],
          updatedAt: Timestamp.now(),
        });
        toast.success('Account updated successfully');
      } else {
        // Create new Firebase Auth user
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, accountSetup.email, accountSetup.password);
          const uid = userCredential.user.uid;

          // Create Firestore user document with the same UID
          await setDoc(doc(db, 'users', uid), {
            uid,
            email: accountSetup.email,
            displayName: employee?.name || '',
            role: accountSetup.role,
            employeeId,
            status: 'active',
            isOnline: false,
            permissions: DEFAULT_PERMISSIONS[accountSetup.role as keyof typeof DEFAULT_PERMISSIONS],
            createdAt: Timestamp.now(),
            createdBy: currentRole,
          });
          
          toast.success('USER Role has been created successfully!');
        } catch (authError: any) {
          let errorMessage = 'Failed to create account';
          if (authError.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered';
          } else if (authError.code === 'auth/weak-password') {
            errorMessage = 'Password must be at least 6 characters';
          }
          toast.error(errorMessage);
          setSettingupAccount(false);
          return;
        }
      }

      setAccountEnabled(true);
      setAccountSetup({ email: accountSetup.email, password: '', confirmPassword: '', role: accountSetup.role });
    } catch (error) {
      console.error('Error setting up account:', error);
      toast.error('Failed to setup account');
    } finally {
      setSettingupAccount(false);
    }
  };

  const handleDisableAccount = async () => {
    if (!confirm('Are you sure you want to disable this employee\'s account?')) return;

    try {
      const userQuery = query(collection(db, 'users'), where('employeeId', '==', employeeId));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        await updateDoc(doc(db, 'users', userSnapshot.docs[0].id), {
          status: 'inactive',
          disabledAt: Timestamp.now(),
        });
        setAccountEnabled(false);
        toast.success('Account disabled successfully');
      }
    } catch (error) {
      console.error('Error disabling account:', error);
      toast.error('Failed to disable account');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to access employee details.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading employee details...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center text-gray-500">
        Employee not found
      </div>
    );
  }

  return (
    <ModuleAccessComponent module={ModuleAccess.EMPLOYEES}>
      <div className="space-y-6 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/employees')}
            className="text-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Employees
          </Button>
        </div>

        {/* Employee Name & ID */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="w-8 h-8 text-indigo-600" />
            {employee.name}
          </h1>

          <div className='flex items-center justify-between'>
            <p className="text-gray-600 mt-1">Employee ID: <code className="bg-gray-100 px-2 py-1 rounded">{employeeId}</code></p>
            <p className="text-gray-600 mt-1">Email: <code className="bg-gray-100 px-2 py-1 rounded">{employee.email || '—'}</code>
            </p>
            <p className="text-gray-600 mt-1">Phone: <code className="bg-gray-100 px-2 py-1 rounded">{employee.phone || '—'}</code></p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex-1 px-6 py-3 font-medium text-center transition ${
                activeTab === 'basic'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                Basic Information
              </div>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex-1 px-6 py-3 font-medium text-center transition ${
                activeTab === 'documents'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Visa & Documents
              </div>
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`flex-1 px-6 py-3 font-medium text-center transition ${
                activeTab === 'account'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                User Account
              </div>
            </button>
          </div>

          <div className="p-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                  {!editing && (
                    <Button
                      onClick={() => setEditing(true)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Edit Information
                    </Button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Employee name"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+971 50 454 1234"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                        <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Service">Service</SelectItem>
                            <SelectItem value="Support">Support</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="Management">Management</SelectItem>
                            <SelectItem value="Administration">Administration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                        <Input
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          placeholder="e.g., Sales Executive"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                        <Input
                          type="date"
                          value={formData.joiningDate}
                          onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                        <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setEditing(false)}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="border-l-4 border-indigo-600 pl-4">
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="text-lg font-medium text-gray-900">{employee.name}</p>
                    </div>
                    <div className="border-l-4 border-indigo-600 pl-4">
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-lg font-medium text-gray-900">{employee.email || '—'}</p>
                    </div>
                    <div className="border-l-4 border-indigo-600 pl-4">
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="text-lg font-medium text-gray-900">{employee.phone || '—'}</p>
                    </div>
                    <div className="border-l-4 border-indigo-600 pl-4">
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="text-lg font-medium text-gray-900">{employee.department}</p>
                    </div>
                    <div className="border-l-4 border-indigo-600 pl-4">
                      <p className="text-sm text-gray-600">Position</p>
                      <p className="text-lg font-medium text-gray-900">{employee.position}</p>
                    </div>
                    <div className="border-l-4 border-indigo-600 pl-4">
                      <p className="text-sm text-gray-600">Joining Date</p>
                      <p className="text-lg font-medium text-gray-900">
                        {employee.joiningDate?.toDate?.()?.toLocaleDateString?.() || new Date(employee.joiningDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="border-l-4 border-indigo-600 pl-4">
                      <p className="text-sm text-gray-600">Status</p>
                      <p className={`text-lg font-medium ${employee.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {employee.status?.charAt(0).toUpperCase() + employee.status?.slice(1)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Visa & Documents</h2>

                {/* Upload Section */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    Upload New Document
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documentTypes.map(docType => (
                      <div key={docType.value}>
                        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                          <Upload className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">{docType.label}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="application/pdf,image/jpeg,image/png"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleDocumentUpload(e.target.files[0], docType.value);
                              }
                            }}
                            disabled={uploading}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Max file size: 10MB. Allowed formats: PDF, JPG, PNG</p>
                </div>

                {/* Documents List */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
                  {documentsLoading ? (
                    <p className="text-gray-500 text-center py-8">Loading documents...</p>
                  ) : documents.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{doc.fileName}</p>
                            <p className="text-sm text-gray-600">
                              {doc.type.replace('_', ' ').toUpperCase()} • {(doc.size / 1024).toFixed(2)} KB • {doc.uploadedAt?.toDate?.()?.toLocaleDateString?.() || new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingDoc(doc)}
                              title="View Document"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                           
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteDocument(doc)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Employee User Account</h2>

                {!accountEnabled ? (
                  <div>
                    <Alert className="mb-6 bg-yellow-50 border-yellow-200">
                      <Lock className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        This employee does not have a login account yet. Create one below to enable them to access the system.
                      </AlertDescription>
                    </Alert>

                    <div className="bg-purple-50 rounded-lg p-6 border border-purple-200 space-y-4">
                      <h3 className="font-semibold text-gray-900">Create Employee Account</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email/Username *</label>
                        <Input
                          type="email"
                          value={accountSetup.email}
                          onChange={(e) => setAccountSetup({ ...accountSetup, email: e.target.value })}
                          placeholder="employee@company.com"
                          disabled={settingupAccount}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={accountSetup.password}
                            onChange={(e) => setAccountSetup({ ...accountSetup, password: e.target.value })}
                            placeholder="Minimum 6 characters"
                            disabled={settingupAccount}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={accountSetup.confirmPassword}
                          onChange={(e) => setAccountSetup({ ...accountSetup, confirmPassword: e.target.value })}
                          placeholder="Re-enter password"
                          disabled={settingupAccount}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="mb-2">
                            Employees are assigned the <strong>Employee</strong> role which provides access to:
                          </p>
                          <ul className="list-disc list-inside text-xs space-y-1">
                            <li>Lead management and creation</li>
                            <li>Service management</li>
                            <li>Task management</li>
                            <li>Attendance records</li>
                            <li>Leave applications</li>
                            <li>Salary information</li>
                          </ul>
                        </div>
                        <input type="hidden" value="employee" />
                      </div>

                      <div className="bg-white p-4 rounded border border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">This account will have access to:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>✓ View and create leads</li>
                          <li>✓ View and manage services</li>
                          <li>✓ Create and manage tasks</li>
                          <li>✓ View personal attendance</li>
                          <li>✓ View and apply for leave</li>
                          <li>✓ View salary information</li>
                          <li>✓ View quotations and invoices</li>
                        </ul>
                      </div>

                      <Button
                        onClick={handleSetupAccount}
                        disabled={settingupAccount}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        {settingupAccount ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Alert className="mb-6 bg-green-50 border-green-200">
                      <Lock className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        This employee has an active account and can log in to the system.
                      </AlertDescription>
                    </Alert>

                    <div className="bg-green-50 rounded-lg p-6 border border-green-200 space-y-4">
                      <h3 className="font-semibold text-gray-900">Account Details</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="border-l-4 border-green-600 pl-4">
                          <p className="text-sm text-gray-600">Email/Username</p>
                          <p className="text-lg font-medium text-gray-900">{accountSetup.email}</p>
                        </div>
                        <div className="border-l-4 border-green-600 pl-4">
                          <p className="text-sm text-gray-600">Role</p>
                          <p className="text-lg font-medium text-gray-900">{accountSetup.role === 'employee' ? 'Employee' : 'Staff'}</p>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded border border-green-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">Account Access:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {accountSetup.role === 'employee' ? (
                            <>
                              <li>✓ View personal attendance</li>
                              <li>✓ View leave balances</li>
                              <li>✓ Apply for leave</li>
                              <li>✓ View salary information</li>
                            </>
                          ) : (
                            <>
                              <li>✓ Staff dashboard</li>
                              <li>✓ Team management</li>
                              <li>✓ Reports and analytics</li>
                            </>
                          )}
                        </ul>
                      </div>

                      <Button
                        onClick={handleDisableAccount}
                        variant="destructive"
                        className="w-full"
                      >
                        Disable Account
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Document Modal */}
        <Dialog open={viewingDoc !== null} onOpenChange={(open) => {
          if (!open) {
            setViewingDoc(null);
            setViewingDocUrl('');
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {viewingDoc?.fileName}
              </DialogTitle>
              <DialogDescription>
                {viewingDoc?.type.replace('_', ' ').toUpperCase()} • {viewingDoc && (viewingDoc.size / 1024).toFixed(2)} KB
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center bg-gray-100 rounded-lg min-h-[400px] p-4">
              {viewingDoc && (
                viewingDoc.storagePath.endsWith('.pdf') ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <FileText className="w-24 h-24 text-gray-400" />
                    <p className="text-gray-600 text-center">
                      PDF document cannot be previewed. Please download to view.
                    </p>
                    <Button
                      onClick={() => handleDownloadDocument(viewingDoc)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                ) : viewingDocUrl ? (
                  <img
                    src={viewingDocUrl}
                    alt={viewingDoc.fileName}
                    className="max-w-full max-h-[600px] object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <FileText className="w-24 h-24 text-gray-400" />
                    <p className="text-gray-600">Loading image...</p>
                  </div>
                )
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setViewingDoc(null);
                  setViewingDocUrl('');
                }}
              >
                Close
              </Button>
              {viewingDoc && !viewingDoc.storagePath.endsWith('.pdf') && viewingDocUrl && (
                <Button
                  onClick={() => {
                    setViewingDoc(null);
                    setViewingDocUrl('');
                    handleDownloadDocument(viewingDoc);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deletingDoc !== null} onOpenChange={(open) => !open && setDeletingDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Delete Document
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  <p className="font-semibold mb-2">Are you sure you want to delete this document?</p>
                  <p className="text-sm">File: <strong>{deletingDoc?.fileName}</strong></p>
                  <p className="text-sm">Type: <strong>{deletingDoc?.type.replace('_', ' ').toUpperCase()}</strong></p>
                  <p className="text-sm mt-2 font-semibold">This will permanently remove the document from the system.</p>
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDeletingDoc(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteDocument}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleAccessComponent>
  );
}
