"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  // Verify invite token on mount
  useEffect(() => {
    const verifyInvite = async () => {
      try {
        setLoading(true);

        if (!inviteToken) {
          setError('No invitation token provided. Invalid or expired link.');
          return;
        }

        // Find user with this invite token
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('inviteToken', '==', inviteToken));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError('Invalid invitation token. Please contact your administrator.');
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        // Check if invite has expired
        if (userData.inviteExpires) {
          const expiresDate = userData.inviteExpires.toDate();
          if (new Date() > expiresDate) {
            setError('This invitation has expired. Please contact your administrator for a new invite.');
            return;
          }
        }

        // Check if user already has password (already accepted)
        if (userData.status === 'active') {
          setError('This invitation has already been accepted. Please login with your credentials.');
          setTimeout(() => router.push('/admin/login'), 3000);
          return;
        }

        // Clean up any duplicate pending documents with the same email
        const duplicateQuery = query(usersRef, where('email', '==', userData.email), where('status', '==', 'pending'));
        const duplicateDocs = await getDocs(duplicateQuery);
        for (const dupDoc of duplicateDocs.docs) {
          if (dupDoc.id !== userDoc.id) {
            try {
              await deleteDoc(doc(db, 'users', dupDoc.id));
              console.log('✅ Cleaned up duplicate pending document during verification:', dupDoc.id);
            } catch (err) {
              console.warn('⚠️ Could not delete duplicate pending doc:', err);
            }
          }
        }

        setInviteData({
          id: userDoc.id,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          permissions: userData.permissions || [],
          createdAt: userData.createdAt,
        });
      } catch (err: any) {
        console.error('Error verifying invite:', err);
        setError('Failed to verify invitation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verifyInvite();
  }, [inviteToken, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteData) {
      setError('Invitation data not found.');
      return;
    }

    // Validation
    if (!formData.password) {
      setError('Password is required.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        inviteData.email,
        formData.password
      );

      const userId = userCredential.user.uid;

      // Create/update user document with Firebase UID as document ID
      await setDoc(doc(db, 'users', userId), {
        email: inviteData.email,
        displayName: inviteData.displayName,
        role: inviteData.role,
        status: 'active',
        isOnline: true,
        permissions: inviteData.permissions || [],
        createdAt: inviteData.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Delete the old invite document (the one created during user creation)
      try {
        await deleteDoc(doc(db, 'users', inviteData.id));
        console.log('✅ Old invite document deleted:', inviteData.id);
      } catch (deleteErr) {
        console.warn('⚠️ Warning: Could not delete old invite document, but user was created successfully:', deleteErr);
      }

      // Also clean up any other pending documents with the same email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', inviteData.email), where('status', '==', 'pending'));
      const oldDocs = await getDocs(q);
      for (const oldDoc of oldDocs.docs) {
        if (oldDoc.id !== userId) {
          try {
            await deleteDoc(doc(db, 'users', oldDoc.id));
            console.log('✅ Cleaned up duplicate pending document:', oldDoc.id);
          } catch (err) {
            console.warn('⚠️ Could not delete duplicate pending doc:', err);
          }
        }
      }

      console.log('✅ User invitation accepted:', inviteData.email);
      toast.success('Account activated! Redirecting to login...');

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/admin/login');
      }, 2000);
    } catch (authError: any) {
      console.error('Error creating account:', authError);
      let errorMessage = 'Failed to create account.';

      if (authError.code === 'auth/email-already-in-use') {
        errorMessage = 'This email already has an account in the system. Please login with your password, or contact admin to reset your account.';
        setError(errorMessage);
        toast.error(errorMessage);
        
        // Try to update the pending document to active status
        try {
          await setDoc(doc(db, 'users', inviteData.id), {
            email: inviteData.email,
            displayName: inviteData.displayName,
            role: inviteData.role,
            status: 'active',
            isOnline: true,
            permissions: inviteData.permissions || [],
            createdAt: inviteData.createdAt || Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          console.log('✅ Updated pending document to active status');
        } catch (updateErr) {
          console.warn('⚠️ Could not update document status:', updateErr);
        }
        return;
      } else if (authError.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (authError.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">Invitation Invalid</h1>
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push('/admin/login')} className="w-full bg-indigo-600 hover:bg-indigo-700">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome!</h1>
          <p className="text-gray-600 mt-2">Set up your password to get started</p>
        </div>

        {/* Invite Details */}
        {inviteData && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Name:</span>
                <span className="text-sm text-gray-900">{inviteData.displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Email:</span>
                <span className="text-sm text-gray-900">{inviteData.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Role:</span>
                <span className="text-sm text-gray-900 capitalize">{inviteData.role}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={submitting}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={submitting}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Minimum 6 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                disabled={submitting}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={submitting}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2"
          >
            {submitting ? 'Setting up account...' : 'Activate Account'}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
