"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { safeConsoleError } from "@/lib/safeConsole";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams?.get("oobCode");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Validate the reset code when page loads
  useEffect(() => {
    const validateCode = async () => {
      if (!oobCode) {
        setError("Invalid password reset link. Missing reset code.");
        setValidating(false);
        return;
      }

      try {
        // Verify the reset code is valid
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setValidating(false);
      } catch (err: any) {
        safeConsoleError("Reset code validation error", err);
        
        let errorMsg = "Invalid or expired password reset link.";
        if (err?.code === "auth/expired-action-code") {
          errorMsg = "This password reset link has expired. Please request a new one.";
        } else if (err?.code === "auth/invalid-action-code") {
          errorMsg = "This password reset link is invalid. Please request a new one.";
        }
        
        setError(errorMsg);
        setValidating(false);
      }
    };

    validateCode();
  }, [oobCode]);

  const validatePassword = () => {
    const errors: string[] = [];
    
    if (!password) {
      errors.push("Password cannot be blank");
    } else {
      if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
      }
      if (!/[a-z]/.test(password)) {
        errors.push("Password must contain lowercase letters");
      }
      if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain uppercase letters");
      }
      if (!/[0-9]/.test(password)) {
        errors.push("Password must contain numbers");
      }
    }
    
    if (!confirmPassword) {
      errors.push("Please confirm your password");
    } else if (password !== confirmPassword) {
      errors.push("Passwords do not match");
    }
    
    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    
    // Real-time validation feedback
    if (value) {
      const errors: string[] = [];
      if (value.length < 8) {
        errors.push("At least 8 characters");
      } else {
        if (!/[a-z]/.test(value)) errors.push("Lowercase letter");
        if (!/[A-Z]/.test(value)) errors.push("Uppercase letter");
        if (!/[0-9]/.test(value)) errors.push("Number");
      }
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors = validatePassword();
    if (errors.length > 0) {
      setError(errors.join(". "));
      return;
    }

    try {
      setLoading(true);
      
      if (!oobCode) {
        setError("Invalid reset code.");
        return;
      }

      // Confirm the new password using the reset code
      await confirmPasswordReset(auth, oobCode, password);
      
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/admin/login");
      }, 3000);
    } catch (err: any) {
      safeConsoleError("Password reset error", err);
      
      let errorMsg = "Failed to reset password. Please try again.";
      if (err?.code === "auth/weak-password") {
        errorMsg = "Password is too weak. Please choose a stronger password.";
      } else if (err?.code === "auth/expired-action-code") {
        errorMsg = "This password reset link has expired. Please request a new one.";
      } else if (err?.code === "auth/invalid-action-code") {
        errorMsg = "This password reset link is invalid. Please request a new one.";
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
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
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="bg-white/95 backdrop-blur-md p-8 rounded-xl shadow-2xl w-full max-w-sm relative z-10 border border-gray-200">
        
        {validating ? (
          <div className="text-center py-8">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 mt-4">Validating reset link...</p>
          </div>
        ) : success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Password Reset!</h1>
            <p className="text-gray-600 mb-4">Your password has been successfully reset.</p>
            <p className="text-sm text-gray-500">Redirecting to login in 3 seconds...</p>
          </div>
        ) : error && !email ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Reset Link Invalid</h1>
            <p className="text-red-600 mb-6">{error}</p>
            <a
              href="/admin/login"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Back to Login
            </a>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">Reset Password</h1>
            <p className="text-center text-gray-600 text-sm mb-6">Create a strong password for your account</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password Field */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Enter new password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Requirements */}
                {password && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-blue-900 mb-2">Password Requirements:</p>
                    <div className="space-y-1">
                      <div className={`text-xs flex items-center ${password.length >= 8 ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${password.length >= 8 ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                        At least 8 characters
                      </div>
                      <div className={`text-xs flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${/[a-z]/.test(password) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                        Lowercase letter (a-z)
                      </div>
                      <div className={`text-xs flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${/[A-Z]/.test(password) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                        Uppercase letter (A-Z)
                      </div>
                      <div className={`text-xs flex items-center ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${/[0-9]/.test(password) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                        Number (0-9)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {password && confirmPassword && (
                  <p className={`mt-2 text-sm ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                    {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className={`w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition font-medium ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={loading || passwordErrors.length > 0}
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>

              <a
                href="/admin/login"
                className="block w-full text-center text-gray-600 hover:text-gray-800 p-2 rounded-lg transition font-medium text-sm"
              >
                Back to Login
              </a>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
