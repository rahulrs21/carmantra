"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { safeConsoleError } from '@/lib/safeConsole'; 

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  message: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "crm-leads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...(doc.data() as Lead), id: doc.id }));
        setLeads(data);
      },
      (error) => {
        safeConsoleError('Snapshot error:', error);
        setError('Error loading leads: ' + (error?.message || 'Unknown error'));
      }
    );

    return () => unsub();
  }, []);

  // ProtectedRoute ensures only admins reach this page, so render dashboard normally

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
          <h1 className="text-xl font-bold mb-4">Access error</h1>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <div className="flex justify-end">
            <a href="/admin/login" className="text-blue-600 hover:underline">Go to Login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="text-xl font-semibold">Total Leads</h3>
          <p className="text-3xl font-bold mt-2">{leads.length}</p>
        </div>

        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="text-xl font-semibold">Today</h3>
          <p className="text-3xl font-bold mt-2">
            {
              leads.filter((l) => {
                const d = l.createdAt?.seconds
                  ? new Date(l.createdAt.seconds * 1000)
                  : new Date();
                const today = new Date();
                return d.toDateString() === today.toDateString();
              }).length
            }
          </p>
        </div>

        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="text-xl font-semibold">Unread</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Latest Leads</h2>

      <div className="space-y-4">
        {leads.map((lead) => (
          <div key={lead.id} className="p-4 bg-white rounded shadow">
            <h3 className="font-semibold text-lg">{lead.name}</h3>
            <p><strong>Phone:</strong> {lead.phone}</p>
            <p><strong>Email:</strong> {lead.email}</p>
            <p><strong>Service:</strong> {lead.service}</p>
            <p><strong>Message:</strong> {lead.message}</p>
            <p className="text-sm text-gray-500">
              {new Date(lead.createdAt.seconds * 1000).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
