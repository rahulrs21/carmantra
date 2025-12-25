"use client";

import { useState } from "react";
import { useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { getUserRole } from '@/lib/getUserRole';
import { useRouter } from "next/navigation";
import { safeConsoleError } from '@/lib/safeConsole';
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [requestingAdmin, setRequestingAdmin] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [lastAttemptUid, setLastAttemptUid] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const searchParams = useSearchParams();
  const grantError = searchParams?.get('error');

  const [show, setShow] = useState(false);


  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Verify role from users collection (supports both 'users' and 'user')
      const uid = result.user.uid;
      let role;
      try {
        setLastAttemptUid(uid);
        role = await getUserRole(uid);
      } catch (err: any) {
        if (err?.code === 'permission-denied') {
          // Sign out and show a helpful error message.
          await signOut(auth);
          setError("Unable to read your role from Firestore due to permissions. If you believe you should be an admin, request access below or ask the site owner to run the create_admin_doc script.");
          return;
        }
        // For other errors, continue to treat as missing role
        role = null;
      }
      
      // Check if user has a valid role (admin, manager, sales, support, viewer)
      const validRoles = ['admin', 'manager', 'sales', 'support', 'viewer'];
      if (!role || !validRoles.includes(role)) {
        // No valid role — sign out and show error
        await signOut(auth);
        if (!role) {
          setError("Your account is missing a role in Firestore. Please contact the administrator to assign you a role.");
        } else {
          setError("You are not authorized to access the admin area.");
        }
        return;
      }

      // Update last login timestamp
      try {
        await updateDoc(doc(db, 'users', uid), {
          lastLogin: Timestamp.now()
        });
      } catch (err) {
        // Silently fail if can't update lastLogin
        safeConsoleError('Failed to update lastLogin:', err);
      }

      router.push("/admin");
    } catch (err: any) {
      // Show specific Firebase auth error codes for debugging (better UX than generic message)
      safeConsoleError('Login error', err);
      
      // Provide user-friendly error messages
      let msg = 'Invalid email or password';
      if (err?.code) {
        switch (err.code) {
          case 'auth/invalid-credential':
            msg = 'Invalid email or password. Please check your credentials.';
            break;
          case 'auth/user-not-found':
            msg = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            msg = 'Incorrect password. Please try again.';
            break;
          case 'auth/invalid-email':
            msg = 'Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            msg = 'This account has been disabled.';
            break;
          case 'auth/too-many-requests':
            msg = 'Too many failed login attempts. Please try again later or reset your password.';
            break;
          default:
            msg = err.code.replace('auth/', '').replace(/-/g, ' ');
            msg = msg.charAt(0).toUpperCase() + msg.slice(1);
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  async function requestAdminAccess() {
    setRequestingAdmin(true);
    setRequestMessage('');
    try {
      const body = {
        name: email || 'Unknown',
        email: email || '',
        phone: '',
        service: 'Admin Access Request',
        message: `Requesting admin role for account: ${email}. UID: ${lastAttemptUid || 'unknown'}. Please run scripts/create_admin_doc.js with the user's uid to add role: 'admin'.`,
      };
      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (json?.success) {
        setRequestMessage('Admin access requested — site owner will be notified.');
      } else {
        setRequestMessage('Failed to send admin request. Please contact the site owner directly.');
      }
    } catch (err: any) {
      safeConsoleError('Request admin access error', err);
      setRequestMessage('Failed to send admin request. Check your network connection or contact the site owner.');
    } finally {
      setRequestingAdmin(false);
    }
  }

  const handleReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setForgotError("");
    setResetMessage("");
    
    if (!forgotEmail) {
      setForgotError('Please enter your email address');
      return;
    }

    try {
      setForgotLoading(true);
      const resp = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const json = await resp.json();
      if (json?.success) {
        setResetMessage('✓ Request received! The admin will reset your password. Please contact the admin for your new credentials.');
        setForgotEmail('');
        // Close modal after 30 seconds
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetMessage('');
        }, 30000);
      } else {
        setForgotError(json?.message || 'Failed to send password reset email');
      }
    } catch (err: any) {
      safeConsoleError('Reset error', err);
      setForgotError('Failed to send reset email. Please check your network connection.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2083&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      
      {!showForgotPassword ? (
        // Login Form
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-sm relative z-10 border border-gray-200">

          <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">Admin Login</h1>

          {error && <p className="text-red-600 mb-3 text-sm">{error}</p>}
          {grantError === 'permission_denied' && (
            <p className="text-yellow-600 mb-3 text-sm">We were unable to read your role from Firestore due to permissions. If you need admin access, request it below or ask the site owner to add a users/{'{uid}'} doc with role: 'admin'.</p>
          )}
          {grantError === 'permission_denied' && (
            <div className="bg-gray-50 border rounded p-3 text-sm text-gray-700">
              <p className="mb-2">Quick instructions for the site owner:</p>
              <pre className="bg-white p-2 rounded text-xs overflow-auto">node scripts/create_admin_doc.js {lastAttemptUid ? lastAttemptUid : '<UID>'} &lt;email&gt; "Display Name"</pre>
            </div>
          )}
          {requestMessage && <p className="text-green-600 mb-3 text-sm">{requestMessage}</p>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="w-full border p-3 rounded text-gray-900 placeholder-gray-500"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <label className="block mb-1 font-medium text-gray-700">Password</label>

              <div className="flex items-center justify-between">

                <input
                  type={show ? "text" : "password"}
                  className="w-full border p-3 rounded pr-10 text-gray-900 placeholder-gray-500"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>

              </div>

            </div>

            <button
              className={`w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition font-medium ${forgotLoading || loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={forgotLoading || loading}
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
          </form>

        </div>
      ) : (
        // Forgot Password Modal
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-sm relative z-10 border border-gray-200">
          
          <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">Reset Password</h1>
          <p className="text-center text-gray-600 text-sm mb-6">Enter your email address and we'll send you a link to reset your password</p>

          {resetMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700 text-sm font-medium">{resetMessage}</p>
            </div>
          )}

          {!resetMessage ? (
            <>
              {forgotError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700 text-sm font-medium">{forgotError}</p>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition font-medium ${forgotLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Sending…' : 'Send link to my email'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail('');
                    setForgotError('');
                    setResetMessage('');
                  }}
                  className="w-full text-gray-600 hover:text-gray-800 p-2 rounded-lg transition font-medium"
                >
                  Back to Login
                </button>
              </form>
            </>
          ) : (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotEmail('');
                  setForgotError('');
                  setResetMessage('');
                }}
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Back to Login
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
