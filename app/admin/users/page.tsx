"use client";

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc, setDoc, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { UserAccount, UserRole, DEFAULT_PERMISSIONS, Permission } from '@/lib/types';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/permissions';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/lib/userContext';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, Trash2, Edit2, Search, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';
import { ModuleAccess, PermissionGate } from '@/components/PermissionGate';

export default function UsersPage() {
  const { user: currentUser, role: currentRole } = useUser();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'viewer' as UserRole,
    sendInvite: false,
    customPermissions: [] as Permission[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);

  // Check if current user is admin
  const isAdmin = currentRole === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserAccount[];
      setUsers(data);
      setLoading(false);
    });

    // Set current user as online
    if (currentUser?.uid) {
      // Mark user as online immediately
      const markOnline = async () => {
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            isOnline: true,
            lastLogin: Timestamp.now(),
          });
        } catch (error) {
          // User doc might not exist yet
          console.debug('Could not update online status:', error);
        }
      };

      markOnline();

      // Set a heartbeat to keep user marked as online (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        updateDoc(doc(db, 'users', currentUser.uid), {
          isOnline: true,
          lastActivityAt: Timestamp.now(),
        }).catch(() => {
          // Silently fail if document doesn't exist
        });
      }, 30000);

      // Cleanup: set user as offline when component unmounts or user logs out
      return () => {
        clearInterval(heartbeatInterval);
        updateDoc(doc(db, 'users', currentUser.uid), {
          isOnline: false,
        }).catch(() => {
          // Silently fail
        });
        unsubscribe();
      };
    }

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleOpenDialog = (user?: UserAccount) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        displayName: user.displayName || '',
        role: user.role,
        sendInvite: false,
        customPermissions: user.permissions || DEFAULT_PERMISSIONS[user.role],
      });
      setUseCustomPermissions(!!user.permissions && user.permissions.length > 0);
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: 'viewer',
        sendInvite: false,
        customPermissions: DEFAULT_PERMISSIONS['viewer'],
      });
      setUseCustomPermissions(false);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setUseCustomPermissions(false);
  };

  const togglePermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    setFormData(prev => {
      const permissions = [...prev.customPermissions];
      const moduleIndex = permissions.findIndex(p => p.module === module);
      
      if (moduleIndex >= 0) {
        const updated = { ...permissions[moduleIndex] };
        switch (action) {
          case 'view': updated.canView = !updated.canView; break;
          case 'create': updated.canCreate = !updated.canCreate; break;
          case 'edit': updated.canEdit = !updated.canEdit; break;
          case 'delete': updated.canDelete = !updated.canDelete; break;
        }
        permissions[moduleIndex] = updated;
      }
      
      return { ...prev, customPermissions: permissions };
    });
  };

  const getPermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    const perm = formData.customPermissions.find(p => p.module === module);
    if (!perm) return false;
    switch (action) {
      case 'view': return perm.canView;
      case 'create': return perm.canCreate;
      case 'edit': return perm.canEdit;
      case 'delete': return perm.canDelete;
      default: return false;
    }
  }; 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only administrators can manage users');
      return;
    }

    setSubmitting(true);

    try {
      if (editingUser) {
        // Update existing user
        await updateDoc(doc(db, 'users', editingUser.id!), {
          displayName: formData.displayName,
          role: formData.role,
          permissions: DEFAULT_PERMISSIONS[formData.role],
          updatedAt: Timestamp.now(),
        });
        toast.success('User updated successfully');
      } else {
        // Create new user
        if (formData.sendInvite) {
          // Generate invite token and save to Firestore
          const inviteToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
          const inviteExpires = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days

          await addDoc(collection(db, 'users'), {
            email: formData.email,
            displayName: formData.displayName,
            role: formData.role,
            status: 'pending',
            isOnline: false,
            permissions: useCustomPermissions ? formData.customPermissions : DEFAULT_PERMISSIONS[formData.role],
            inviteToken,
            inviteExpires,
            createdAt: Timestamp.now(),
            createdBy: currentUser?.uid,
          });

          // TODO: Send email with invite link
          const inviteLink = `${window.location.origin}/admin/accept-invite?token=${inviteToken}`;
          console.log('Invite link:', inviteLink);
          toast.success(`User invited! Send this link: ${inviteLink}`);
        } else {
          // Create user with email/password
          if (!formData.password) {
            toast.error('Password is required');
            setSubmitting(false);
            return;
          }

          try {
            // Create Firebase Authentication user
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const newUserId = userCredential.user.uid;

            // Create Firestore document with the same UID
            await setDoc(doc(db, 'users', newUserId), {
              email: formData.email,
              displayName: formData.displayName,
              role: formData.role,
              status: 'active',
              isOnline: true,
              permissions: DEFAULT_PERMISSIONS[formData.role],
              createdAt: Timestamp.now(),
              createdBy: currentUser?.uid,
            });

            toast.success('User created successfully. They can now login with their credentials.');
          } catch (authError: any) {
            // Handle Firebase Auth errors
            let errorMessage = 'Failed to create user';
            if (authError.code === 'auth/email-already-in-use') {
              errorMessage = 'This email is already registered';
            } else if (authError.code === 'auth/weak-password') {
              errorMessage = 'Password should be at least 6 characters';
            } else if (authError.code === 'auth/invalid-email') {
              errorMessage = 'Invalid email address';
            }
            toast.error(errorMessage);
            setSubmitting(false);
            return;
          }
        }
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error('Error managing user:', error);
      toast.error(error.message || 'Failed to manage user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!isAdmin) {
      toast.error('Only administrators can delete users');
      return;
    }

    // Find the user to delete
    const userToDelete = users.find(u => u.id === userId);
    
    // Prevent deleting the last admin
    if (userToDelete?.role === 'admin' && adminCount <= 1) {
      toast.error('Cannot delete the last administrator. At least one admin must remain.');
      return;
    }

    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const toggleStatus = async (user: UserAccount) => {
    if (!isAdmin) {
      toast.error('Only administrators can change user status');
      return;
    }

    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'users', user.id!), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count total admin users
  const adminCount = users.filter(u => u.role === 'admin').length;
  
  // Protected admin email - cannot be edited or deleted
  const PROTECTED_ADMIN_EMAIL = 'rahulrs2448@gmail.com';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to access user management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ModuleAccess module="users">
      <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <Users className="w-8 h-8" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage user accounts and permissions</p>
        </div>
        <PermissionGate module="users" action="create">
          <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </PermissionGate>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Users</div>
          <div className="text-2xl font-bold text-indigo-600">{users.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.status === 'active').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {users.filter(u => u.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Inactive</div>
          <div className="text-2xl font-bold text-gray-600">
            {users.filter(u => u.status === 'inactive').length}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by email, name, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || user.email}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                              {(user.displayName || user.email)
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                          )}
                          {/* Online Status Indicator - Only show when online */}
                          {user.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.displayName || 'No name'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={user.status === 'active' ? 'default' : user.status === 'pending' ? 'secondary' : 'outline'}
                        className={
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.lastLogin ? formatDateTime(user.lastLogin) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(user)}
                          className="text-xs"
                          disabled={user.email === PROTECTED_ADMIN_EMAIL}
                          title={user.email === PROTECTED_ADMIN_EMAIL ? 'This admin account is protected' : ''}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <PermissionGate module="users" action="edit">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(user)}
                            disabled={user.email === PROTECTED_ADMIN_EMAIL}
                            className="disabled:opacity-50 disabled:cursor-not-allowed"
                            title={user.email === PROTECTED_ADMIN_EMAIL ? 'This admin account is protected and cannot be edited' : 'Edit user'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </PermissionGate>
                        <PermissionGate module="users" action="delete">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id!)}
                            disabled={user.email === PROTECTED_ADMIN_EMAIL || (user.role === 'admin' && adminCount <= 1)}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              user.email === PROTECTED_ADMIN_EMAIL 
                                ? 'This admin account is protected and cannot be deleted' 
                                : user.role === 'admin' && adminCount <= 1 
                                ? 'Cannot delete the last administrator' 
                                : 'Delete user'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user information and role' : 'Create a new user account with specific permissions'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>

              {!editingUser && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        disabled={formData.sendInvite}
                        required={!formData.sendInvite}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={formData.sendInvite}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sendInvite"
                      checked={formData.sendInvite}
                      onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="sendInvite" className="font-normal cursor-pointer">
                      Send invite link instead (user sets their own password)
                    </Label>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => {
                  const newRole = value as UserRole;
                  setFormData({ 
                    ...formData, 
                    role: newRole,
                    customPermissions: DEFAULT_PERMISSIONS[newRole]
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                    <SelectItem value="manager">Manager (Most Access)</SelectItem>
                    <SelectItem value="sales">Sales (Leads & Quotes)</SelectItem>
                    <SelectItem value="support">Support (View & Edit)</SelectItem>
                    <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Permissions Toggle */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="customPermissions"
                  checked={useCustomPermissions}
                  onChange={(e) => setUseCustomPermissions(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="customPermissions" className="font-normal cursor-pointer">
                  Customize permissions for this user
                </Label>
              </div>

              {/* Custom Permissions Table */}
              {useCustomPermissions && (
                <div className="border rounded-lg overflow-hidden mt-4">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-sm">Module Permissions</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Module</th>
                          <th className="px-2 py-2 text-center font-medium text-gray-600">View</th>
                          <th className="px-2 py-2 text-center font-medium text-gray-600">Create</th>
                          <th className="px-2 py-2 text-center font-medium text-gray-600">Edit</th>
                          <th className="px-2 py-2 text-center font-medium text-gray-600">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {formData.customPermissions.map((perm) => (
                          <tr key={perm.module} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium capitalize">{perm.module}</td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => togglePermission(perm.module, 'view')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {getPermission(perm.module, 'view') ? (
                                  <CheckSquare size={18} className="inline" />
                                ) : (
                                  <Square size={18} className="inline" />
                                )}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => togglePermission(perm.module, 'create')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {getPermission(perm.module, 'create') ? (
                                  <CheckSquare size={18} className="inline" />
                                ) : (
                                  <Square size={18} className="inline" />
                                )}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => togglePermission(perm.module, 'edit')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {getPermission(perm.module, 'edit') ? (
                                  <CheckSquare size={18} className="inline" />
                                ) : (
                                  <Square size={18} className="inline" />
                                )}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => togglePermission(perm.module, 'delete')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {getPermission(perm.module, 'delete') ? (
                                  <CheckSquare size={18} className="inline" />
                                ) : (
                                  <Square size={18} className="inline" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </ModuleAccess>
  );
}
