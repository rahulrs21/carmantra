"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useUser } from "@/lib/userContext";
import { updateProfile } from "firebase/auth";

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarPreview ? (
            <img src={avatarPreview} alt={name || "User"} className="w-16 h-16 rounded-full object-cover border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-orange-600 text-white flex items-center justify-center text-xl font-semibold">
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
