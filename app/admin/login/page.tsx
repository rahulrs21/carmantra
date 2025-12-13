"use client";

import { useState } from "react";
import { useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
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
      if (role !== 'admin') {
        // Not an admin — sign out and show error
        await signOut(auth);
        if (!role) {
          setError("Your account is missing an admin role in Firestore. Create a user doc in 'users/{uid}' with role: 'admin', or run the create_admin_doc script.");
        } else {
          setError("You are not authorized to access the admin area.");
        }
        return;
      }

      router.push("/admin");
    } catch (err: any) {
      // Show specific Firebase auth error codes for debugging (better UX than generic message)
      safeConsoleError('Login error', err);
      const msg = err?.code ? `${err.code.replace('auth/', '').replace(/-/g, ' ')}` : 'invalid email or password';
      setError(msg.charAt(0).toUpperCase() + msg.slice(1));
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

  const handleReset = async () => {
    setResetMessage("");
    setError("");
    if (!email) {
      setError('Enter your email to reset password');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Password reset email sent — check your inbox');
    } catch (err: any) {
      safeConsoleError('Reset error', err);
      const msg = err?.code ? `${err.code.replace('auth/', '').replace(/-/g, ' ')}` : 'unable to send reset email';
      setError(msg.charAt(0).toUpperCase() + msg.slice(1));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">

        <h1 className="text-2xl font-bold mb-4 text-center">Admin Login</h1>

        {error && <p className="text-red-600 mb-3">{error}</p>}
        {grantError === 'permission_denied' && (
          <p className="text-yellow-600 mb-3">We were unable to read your role from Firestore due to permissions. If you need admin access, request it below or ask the site owner to add a users/{'{uid}'} doc with role: 'admin'.</p>
        )}
        {grantError === 'permission_denied' && (
          <div className="bg-gray-50 border rounded p-3 text-sm text-gray-700">
            <p className="mb-2">Quick instructions for the site owner:</p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto">node scripts/create_admin_doc.js {lastAttemptUid ? lastAttemptUid : '<UID>'} &lt;email&gt; "Display Name"</pre>
          </div>
        )}
        {requestMessage && <p className="text-green-600 mb-3">{requestMessage}</p>}
        {resetMessage && <p className="text-green-600 mb-3">{resetMessage}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              className="w-full border p-3 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative ">
            <label className="block mb-1 font-medium">Password</label>

            <div className="flex items-center justify-between">

              <input
                type={show ? "text" : "password"}
                className="w-full border p-3 rounded pr-10"
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
            className={`w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>

          <div className="text-center mt-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={requestAdminAccess}
              className="text-sm text-blue-600 hover:underline"
              disabled={requestingAdmin}
            >
              {requestingAdmin ? 'Requesting…' : 'Request Admin Access'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
