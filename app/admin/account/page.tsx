"use client";

import { useEffect, useState, ChangeEvent, useRef } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useUser } from "@/lib/userContext";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

export default function AccountPage() {
  const { user, displayName, photoURL, role } = useUser();
  const [name, setName] = useState(displayName || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(photoURL);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("CarMantra CRM");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandStatus, setBrandStatus] = useState<string | null>(null);
  const [brandUploading, setBrandUploading] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordResetting, setPasswordResetting] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  useEffect(() => {
    setName(displayName || "");
    setAvatarPreview(photoURL || null);
  }, [displayName, photoURL]);

  useEffect(() => {
    const brandingRef = doc(db, "settings", "branding");
    const unsub = onSnapshot(brandingRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { name?: string; logoUrl?: string };
        setBrandName(data.name || "CarMantra CRM");
        setBrandLogoUrl(data.logoUrl || "");
      }
    });
    return () => unsub();
  }, []);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Account</h1>
        <p className="text-gray-600 dark:text-gray-400">Please sign in to manage your account.</p>
      </div>
    );
  }

  const safeUser = user;

  const initials = (name || safeUser.email || "User").trim().charAt(0).toUpperCase();

  async function saveName() {
    if (!name.trim()) {
      setStatus("Display name cannot be empty.");
      return;
    }
    setSavingName(true);
    setStatus(null);
    try {
      await setDoc(doc(db, "users", safeUser.uid), { displayName: name.trim() }, { merge: true });
      await updateProfile(safeUser, { displayName: name.trim() });
      setStatus("Display name updated.");
    } catch (error) {
      setStatus("Could not update name. Try again.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !safeUser) return;
    setUploading(true);
    setStatus(null);
    try {
      const storageRef = ref(storage, `avatars/${safeUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      await setDoc(doc(db, "users", safeUser.uid), { photoURL: downloadUrl }, { merge: true });
      await updateProfile(safeUser, { photoURL: downloadUrl });
      setAvatarPreview(downloadUrl);
      setStatus("Profile photo updated.");
    } catch (error) {
      setStatus("Could not upload photo. Try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function saveBranding() {
    if (role !== "admin") return;
    setBrandSaving(true);
    setBrandStatus(null);
    try {
      await setDoc(
        doc(db, "settings", "branding"),
        { name: brandName || "CarMantra CRM", logoUrl: brandLogoUrl || "" },
        { merge: true }
      );
      setBrandStatus("Branding saved.");
    } catch (error) {
      setBrandStatus("Could not save branding. Try again.");
    } finally {
      setBrandSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPasswordError(null);
    setPasswordStatus(null);

    if (!currentPasswordVerified) {
      setPasswordError("Please verify your current password first");
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError("New password cannot be blank");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setPasswordError("Password must contain lowercase letters");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("Password must contain uppercase letters");
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError("Password must contain numbers");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    try {
      setPasswordResetting(true);

      if (!safeUser || !safeUser.email) {
        setPasswordError("Unable to verify your email");
        return;
      }

      // Update password
      await updatePassword(safeUser, newPassword);

      setPasswordStatus("✓ Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPasswordVerified(false);

      // Clear status after 3 seconds
      setTimeout(() => {
        setPasswordStatus(null);
      }, 3000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      if (error?.code === "auth/weak-password") {
        setPasswordError("Password is too weak. Please choose a stronger password");
      } else {
        setPasswordError(error?.message || "Failed to update password. Please try again");
      }
    } finally {
      setPasswordResetting(false);
    }
  }

  async function verifyCurrentPassword() {
    setPasswordError(null);

    if (!currentPassword.trim()) {
      setPasswordError("Please enter your current password");
      return;
    }

    try {
      setVerifyingPassword(true);

      if (!safeUser || !safeUser.email) {
        setPasswordError("Unable to verify your email");
        return;
      }

      // Attempt reauthentication to verify password
      const credential = EmailAuthProvider.credential(safeUser.email, currentPassword);
      await reauthenticateWithCredential(safeUser, credential);
      
      setCurrentPasswordVerified(true);
    } catch (error: any) {
      console.error("Password verification error:", error);
      if (error?.code === "auth/wrong-password") {
        setPasswordError("Current password is incorrect");
      } else {
        setPasswordError(error?.message || "Failed to verify password. Please try again");
      }
      setCurrentPasswordVerified(false);
    } finally {
      setVerifyingPassword(false);
    }
  }

  async function handleBrandLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || role !== "admin") return;
    setBrandUploading(true);
    setBrandStatus(null);
    try {
      const storageRef = ref(storage, `branding/logo`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      await setDoc(doc(db, "settings", "branding"), { logoUrl: downloadUrl }, { merge: true });
      setBrandLogoUrl(downloadUrl);
      setBrandStatus("Logo updated.");
    } catch (error) {
      setBrandStatus("Could not upload logo. Try again.");
    } finally {
      setBrandUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Lightbox Modal */}
      {showLightbox && avatarPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={avatarPreview}
              alt={name || "Profile"}
              className="w-full h-auto rounded-lg shadow-2xl max-h-[80vh] object-contain"
            />
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt={name || "User"}
              onClick={() => setShowLightbox(true)}
              className="w-16 h-16 rounded-full object-cover border cursor-pointer hover:opacity-80 transition-opacity"
            />
          ) : (
            <div
              onClick={() => setShowLightbox(true)}
              className="w-16 h-16 rounded-full bg-orange-600 text-white flex items-center justify-center text-xl font-semibold cursor-pointer hover:opacity-80 transition-opacity"
            >
              {initials}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Signed in as</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{name || user.email}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Role: {role || "Member"}</p>
          </div>
        </div>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          {uploading ? "Uploading..." : "Change photo"}
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Update your display name. Your email stays the same.</p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveName}
            disabled={savingName}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 text-sm"
          >
            {savingName ? "Saving..." : "Save name"}
          </button>
          {status && <p className="text-sm text-gray-600 dark:text-gray-400">{status}</p>}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Password</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Update your password. Make sure it's strong and secure.</p>
        </div>

        {passwordStatus && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-700 dark:text-green-400 text-sm font-medium">{passwordStatus}</p>
          </div>
        )}

        {passwordError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">{passwordError}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Current Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (currentPasswordVerified) setCurrentPasswordVerified(false);
                  }}
                  placeholder="Enter your current password"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showCurrentPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={verifyCurrentPassword}
                disabled={verifyingPassword || !currentPassword || currentPasswordVerified}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  currentPasswordVerified
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
                }`}
              >
                {verifyingPassword ? "Verifying..." : currentPasswordVerified ? "✓ Verified" : "Verify"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showNewPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">Password Requirements:</p>
                <div className="space-y-1">
                  <div className={`text-xs flex items-center ${newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${newPassword.length >= 8 ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                    At least 8 characters
                  </div>
                  <div className={`text-xs flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${/[a-z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                    Lowercase letter (a-z)
                  </div>
                  <div className={`text-xs flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${/[A-Z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                    Uppercase letter (A-Z)
                  </div>
                  <div className={`text-xs flex items-center ${/[0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${/[0-9]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                    Number (0-9)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {newPassword && confirmPassword && (
              <p className={`mt-2 text-sm ${newPassword === confirmPassword ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handlePasswordChange}
            disabled={passwordResetting || !currentPasswordVerified || !newPassword || !confirmPassword}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium transition"
          >
            {passwordResetting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>

      {role === "admin" ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Branding</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update CRM name and logo for only admins.</p>
            </div>
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brandName} className="w-12 h-12 rounded border object-cover" />
            ) : (
              <div className="w-12 h-12 rounded bg-orange-600 text-white flex items-center justify-center font-bold">
                {brandName?.[0]?.toUpperCase() || "C"}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">CRM Name</label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter CRM name"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Upload Logo</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input type="file" accept="image/*" className="hidden" onChange={handleBrandLogoChange} />
                  {brandUploading ? "Uploading..." : "Choose file"}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, or SVG. Replaces current logo.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveBranding}
              disabled={brandSaving}
              className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 text-sm"
            >
              {brandSaving ? "Saving..." : "Save branding"}
            </button>
            {brandStatus && <p className="text-sm text-gray-600 dark:text-gray-400">{brandStatus}</p>}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Branding</h2>
          <div className="flex items-center gap-3">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brandName} className="w-10 h-10 rounded border object-cover" />
            ) : (
              <div className="w-10 h-10 rounded bg-orange-600 text-white flex items-center justify-center font-bold">
                {brandName?.[0]?.toUpperCase() || "C"}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">CRM</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{brandName}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Only admins can change branding.</p>
        </div>
      )}
    </div>
  );
}
