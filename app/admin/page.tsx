"use client";

import { useEffect, useMemo, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import MetricCard from '@/components/admin/MetricCard';
import { safeConsoleError } from '@/lib/safeConsole';
// Local date/time formatting helpers for DD/MM/YYYY and 12-hour clock
import { ModuleAccess, PermissionGate } from '@/components/PermissionGate';
import { useUser } from '@/lib/userContext';

interface Lead {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  message?: string;
  createdAt?: { seconds: number; nanoseconds?: number } | { toDate: () => Date };
}

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check authentication state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "crm-leads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...(doc.data() as Lead), id: doc.id }));
        setLeads(data);
        setLoading(false);
      },
      (error) => {
        safeConsoleError('Snapshot error:', error);
        setError('Error loading leads: ' + (error?.message || 'Unknown error'));
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Fetch booked services
  useEffect(() => {
    const q = query(collection(db, "bookedServices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      setServices(data);
    }, (err) => {
      safeConsoleError('Services snapshot error:', err);
    });
    return () => unsub();
  }, []);

  // Fetch customers
  useEffect(() => {
    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      setCustomers(data);
    }, (err) => {
      safeConsoleError('Customers snapshot error:', err);
    });
    return () => unsub();
  }, []);

  // Fetch invoices
  useEffect(() => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      setInvoices(data);
    }, (err) => {
      safeConsoleError('Invoices snapshot error:', err);
    });
    return () => unsub();
  }, []);

  // Fetch quotations
  useEffect(() => {
    const q = query(collection(db, "quotations"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      setQuotations(data);
    }, (err) => {
      safeConsoleError('Quotations snapshot error:', err);
    });
    return () => unsub();
  }, []);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return leads.filter((l) => {
      const d = toDate(l.createdAt);
      return d && d.toDateString() === today;
    }).length;
  }, [leads]);

  const [filterService, setFilterService] = useState<string | null>(null);
  const [rangeType, setRangeType] = useState<'30d' | 'yesterday' | 'today' | 'custom'>('30d');
  const [customRange, setCustomRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [selectedRange, setSelectedRange] = useState<any>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  function toDate(ts?: Lead['createdAt']) {
    try {
      if (!ts) return null;
      if ('toDate' in ts && typeof ts.toDate === 'function') return ts.toDate();
      if (typeof (ts as any).seconds === 'number') return new Date((ts as any).seconds * 1000);
    } catch (e) {
      // ignore
    }
    return null;
  }

  function formatDateOnly(date: Date | null | undefined) {
    if (!date) return '-';
    const d = date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function formatDateTime12(ts?: Lead['createdAt'] | Date | null) {
    const d = ts instanceof Date ? ts : toDate(ts as any);
    if (!d) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hh = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${minutes} ${period}`;
  }

  function formatHourLabel(hour: number) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(h12).padStart(2, '0')}:00 ${period}`;
  }

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function endOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  const activeRange = useMemo(() => {
    const now = new Date();
    if (rangeType === '30d') {
      const end = endOfDay(now);
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      return { start, end, isDaily: true };
    }
    if (rangeType === 'today') {
      const start = startOfDay(now);
      const end = endOfDay(now);
      return { start, end, isDaily: false };
    }
    if (rangeType === 'yesterday') {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const start = startOfDay(y);
      const end = endOfDay(y);
      return { start, end, isDaily: false };
    }
    if (rangeType === 'custom') {
      const { from, to } = customRange;
      if (!from || !to) return null;
      const start = startOfDay(from);
      const end = endOfDay(to);
      const diff = Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000));
      return { start, end, isDaily: diff > 0 };
    }
    return null;
  }, [rangeType, customRange]);

  function inRange(date: Date) {
    if (!activeRange) return false;
    return date >= activeRange.start && date <= activeRange.end;
  }

  const analytics = useMemo(() => {
    if (!activeRange) return { series: [], serviceBreakdown: [] };
    const { start, end, isDaily } = activeRange;

    // hourly series for single-day ranges
    if (!isDaily) {
      const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
      const services = new Map<string, number>();
      for (const l of leads) {
        const d = toDate(l.createdAt);
        if (!d) continue;
        if (!(d >= start && d <= end)) continue;
        hours[d.getHours()].count += 1;
        const svc = l.service || 'Unknown';
        services.set(svc, (services.get(svc) || 0) + 1);
      }
      const series = hours.map((h) => ({ date: formatHourLabel(h.hour), count: h.count }));
      const serviceBreakdown = Array.from(services.entries()).map(([name, value]) => ({ name, value }));
      return { series, serviceBreakdown };
    }

    // daily series for multi-day ranges
    const dayMap = new Map<number, number>();
    const services = new Map<string, number>();
    // initialize days
    for (let t = start.getTime(); t <= end.getTime(); t += 24 * 3600 * 1000) {
      dayMap.set(new Date(t).getTime(), 0);
    }

    for (const l of leads) {
      const d = toDate(l.createdAt);
      if (!d) continue;
      if (!(d >= start && d <= end)) continue;
      const key = startOfDay(d).getTime();
      if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1);
      const svc = l.service || 'Unknown';
      services.set(svc, (services.get(svc) || 0) + 1);
    }

    const series = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => Number(a.date) - Number(b.date));
    const serviceBreakdown = Array.from(services.entries()).map(([name, value]) => ({ name, value }));
    return { series, serviceBreakdown };
  }, [leads, activeRange]);

  const filteredLeads = useMemo(() => {
    if (!activeRange) return [];
    const byService = filterService ? leads.filter((l) => (l.service || 'Unknown') === filterService) : leads;
    return byService.filter((l) => {
      const d = toDate(l.createdAt);
      if (!d) return false;
      return d >= activeRange.start && d <= activeRange.end;
    }).slice(0, 50);
  }, [leads, filterService, activeRange]);

  function downloadCSV(filename: string, rows: string[][]) {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportServiceCSV() {
    const rows = [['Service', 'Count'], ...analytics.serviceBreakdown.map(s => [s.name, String(s.value)])];
    downloadCSV('service-breakdown.csv', rows);
  }

  function exportLeadsCSV() {
    const rows = [['Name','Service','Phone','Email','Message','Date'], ...filteredLeads.map(l => [l.name || '', l.service || '', l.phone || '', l.email || '', (l.message||'').replace(/\n/g,' '), formatDateTime12(l.createdAt)])];
    downloadCSV('leads.csv', rows);
  }

  const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

  const rangeLabel = useMemo(() => {
    if (rangeType === '30d') return 'Last 30 days';
    if (rangeType === 'today') return 'Today';
    if (rangeType === 'yesterday') return 'Yesterday';
    if (rangeType === 'custom' && customRange.from && customRange.to) return `${formatDateOnly(customRange.from)} — ${formatDateOnly(customRange.to)}`;
    return 'Custom range';
  }, [rangeType, customRange]);

  // `activeRange` contains `isDaily` so no separate `isDaily` memo is needed

  // small helpers for the metric cards
  const series = analytics.series || [];
  const todaySeries = series.length ? series[series.length - 1].count : 0;
  const yesterdaySeries = series.length > 1 ? series[series.length - 2].count : 0;
  const todayChange = yesterdaySeries === 0 ? todaySeries === 0 ? 0 : 100 : Math.round(((todaySeries - yesterdaySeries) / Math.max(1, yesterdaySeries)) * 100);
  const unreadCount = leads.filter(l => (l as any).read === false).length;

  function scrollToLeads() {
    const el = document.querySelector('table.w-full');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const moduleCards = [
    {
      key: 'services',
      render: () => (
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6 hover:shadow-lg dark:hover:shadow-gray-600 transition-shadow cursor-pointer h-full min-h-[200px] flex flex-col"
          onClick={() => (window.location.href = '/admin/book-service')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Services</p>
              <h3 className="text-3xl font-bold text-blue-600">{services.length}</h3>
              <p className="text-xs text-gray-400 mt-2">Booked services</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          {services.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Pending</span>
                <span className="font-medium">{services.filter((s) => s.status === 'pending').length}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-500">Completed</span>
                <span className="font-medium text-green-600">{services.filter((s) => s.status === 'completed').length}</span>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'customers',
      render: () => (
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6 hover:shadow-lg dark:hover:shadow-gray-600 transition-shadow cursor-pointer h-full min-h-[200px] flex flex-col"
          onClick={() => (window.location.href = '/admin/customers')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Customers</p>
              <h3 className="text-3xl font-bold text-green-600 dark:text-green-500">{customers.length}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Registered</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'revenue',
      render: () => (
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6 hover:shadow-lg dark:hover:shadow-gray-600 transition-shadow cursor-pointer h-full min-h-[200px] flex flex-col"
          onClick={() => (window.location.href = '/admin/invoice')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
              <h3 className="text-3xl font-bold text-purple-600">{invoices.length}</h3>
              <p className="text-xs text-gray-400 mt-2">Generated invoices</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          {invoices.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-medium">AED {invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'quotations',
      render: () => (
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6 hover:shadow-lg dark:hover:shadow-gray-600 transition-shadow cursor-pointer h-full min-h-[200px] flex flex-col"
          onClick={() => (window.location.href = '/admin/quotation')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Quotations</p>
              <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-500">{quotations.length}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Sent</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const metricCards = [
    {
      key: 'total-leads',
      render: () => (
        <div className="h-full min-h-[100px]">
          <MetricCard
            title="Total Leads"
            value={leads.length}
            trendData={analytics.series.map((s) => ({ date: String(s.date), value: s.count }))}
            color={COLORS[0]}
            onClick={() => {
              setFilterService(null);
              scrollToLeads();
            }}
          />
        </div>
      ),
    },
    {
      key: 'today',
      render: () => (
        <div className="h-full min-h-[100px]">
          <MetricCard
            title="Today"
            value={todayCount}
            subtitle={`${todayChange >= 0 ? '+' : ''}${todayChange}% vs yesterday`}
            trendData={analytics.series.slice(-7).map((s) => ({ date: String(s.date), value: s.count }))}
            color={COLORS[1]}
            onClick={() => {
              setFilterService(null);
              scrollToLeads();
            }}
          />
        </div>
      ),
    },
    {
      key: 'unread',
      render: () => (
        <div className="h-full min-h-[100px]">
          <MetricCard
            title="Unread"
            value={unreadCount}
            subtitle={unreadCount ? `${unreadCount} unread` : 'All read'}
            color={COLORS[2]}
            onClick={() => {
              setFilterService(null);
              scrollToLeads();
            }}
          />
        </div>
      ),
    },
  ];

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
    <ModuleAccess module="dashboard">
      <div className={`space-y-6 lg:space-y-8 ${!isLoggedIn ? 'blur-sm pointer-events-none select-none' : ''}`}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold dark:text-white break-words">Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of recent leads and activity</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <span className="uppercase tracking-wide text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">Updated</span>
          <span className="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDateTime12(new Date())}</span>
        </div>
      </header>

      {/* Module Overview Section */}
      <section className="sm:hidden">
        <Carousel opts={{ align: 'start', dragFree: true }}>
          <CarouselContent>
            {moduleCards.map(({ key, render }) => (
              <CarouselItem key={key} className="basis-[88%] h-full">
                {render()}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      <section className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
        {moduleCards.map(({ key, render }) => (
          <div key={key}>{render()}</div>
        ))}
      </section>

      {/* Leads Metrics Section */}
      <section className="sm:hidden">
        <Carousel opts={{ align: 'start', dragFree: true }}>
          <CarouselContent>
            {metricCards.map(({ key, render }) => (
              <CarouselItem key={key} className="basis-[88%] h-full">
                {render()}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      <section className="hidden sm:grid grid-cols-3 gap-4">
        {metricCards.map(({ key, render }) => (
          <div key={key}>{render()}</div>
        ))}
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold">Analytics</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-xs sm:text-sm text-gray-500 hidden md:block">Leads trends & service breakdown</div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
                <div className="inline-flex rounded-md shadow-sm bg-white items-center flex-shrink-0">
                  <button className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap ${rangeType==='30d' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`} onClick={() => { setRangeType('30d'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}>Last 30d</button>
                  <button className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap ${rangeType==='yesterday' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`} onClick={() => { setRangeType('yesterday'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}>Yesterday</button>
                  <button className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap ${rangeType==='today' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`} onClick={() => { setRangeType('today'); setCustomRange({ from: null, to: null }); setSelectedRange(undefined); }}>Today</button>
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button className={`px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap ${rangeType==='custom' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`} onClick={() => setIsPopoverOpen(true)}>Custom</button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto">
                      <div className="flex flex-col gap-2">
                        <Calendar
                          mode="range"
                          selected={selectedRange}
                          onSelect={(r: any) => {
                            setSelectedRange(r);
                            // auto-apply when both dates are selected
                            if (r?.from && r?.to) {
                              setCustomRange({ from: r.from, to: r.to });
                              setRangeType('custom');
                              // setIsPopoverOpen(false);
                            } else if (r instanceof Date) {
                              setCustomRange({ from: r, to: r });
                              setRangeType('custom');
                              // setIsPopoverOpen(false);
                            }
                          }}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedRange(undefined); setCustomRange({ from: null, to: null }); setIsPopoverOpen(false); }}>Clear</Button>
                          <Button size="sm" onClick={() => {
                            // support DayPicker range object { from, to } or a single Date
                            if (!selectedRange) return setIsPopoverOpen(false);
                            let from: Date | null = null;
                            let to: Date | null = null;
                            if (selectedRange.from || selectedRange.to) {
                              from = selectedRange.from || selectedRange.to || null;
                              to = selectedRange.to || selectedRange.from || null;
                            } else if (selectedRange instanceof Date) {
                              from = selectedRange;
                              to = selectedRange;
                            }
                            if (from && to) {
                              setCustomRange({ from, to });
                              setRangeType('custom');
                            }
                            setIsPopoverOpen(false);
                          }}>Apply</Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-2 w-full sm:w-auto">
                  <button className="text-xs sm:text-sm text-indigo-600 hover:underline" onClick={exportServiceCSV}>Export services CSV</button>
                  <button className="text-xs sm:text-sm text-indigo-600 hover:underline" onClick={exportLeadsCSV}>Export leads CSV</button>
                </div>
              </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 relative rounded-xl shadow dark:shadow-gray-700 p-4 lg:col-span-2 overflow-hidden">
            <h3 className="text-sm text-gray-600 dark:text-gray-300 mb-4 sm:mb-10">Leads ({rangeLabel})</h3>
            <ChartContainer config={{ count: { label: 'Leads', color: '#4f46e5' } }} className="h-64 sm:h-72 aspect-auto flex relative -left-8 sm:-left-5 justify-center w-[calc(100%+3rem)] -mx-6 sm:w-full sm:mx-0">
              {analytics.series.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-gray-400">No data for selected range</div>
              ) : (
                <LineChart data={analytics.series} margin={{ left: 0, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e6f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d: any) => {
                      const useDaily = !!activeRange?.isDaily;
                      if (useDaily) {
                        try {
                          const t = typeof d === 'number' ? new Date(d) : new Date(String(d));
                          return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        } catch (e) {
                          return String(d);
                        }
                      }
                      return String(d);
                    }}
                    interval={activeRange?.isDaily ? 'preserveStartEnd' : 3}
                  />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip
                    content={<ChartTooltipContent hideIndicator labelKey="date" />}
                    formatter={(value: any) => [value, 'Leads']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Legend content={(props) => <ChartLegendContent {...(props as any)} />} />
                </LineChart>
              )}
            </ChartContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-700 p-4">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Services breakdown</h3>
            <div className="h-56 sm:h-48 pt-4 sm:pt-0">
              <ChartContainer
                config={analytics.serviceBreakdown.reduce((acc, s, i) => ({ ...acc, [s.name]: { label: s.name, color: COLORS[i % COLORS.length] } }), {} as any)}
                className="h-full aspect-auto flex justify-center items-center"
              >
                <PieChart>
                  <Pie
                    data={analytics.serviceBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={32}
                    outerRadius={64}
                    paddingAngle={4}
                    cy="55%"
                  >
                    {analytics.serviceBreakdown.map((entry, idx) => (
                      <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} onClick={() => setFilterService(entry.name)} style={{ cursor: 'pointer' }} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" content={(props) => <ChartLegendContent {...(props as any)} />} />
                  <RechartsTooltip content={<ChartTooltipContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[260px] text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-2">Service</th>
                    <th className="text-right px-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.serviceBreakdown.length === 0 && (
                    <tr><td colSpan={2} className="py-3 text-center text-gray-400">No data</td></tr>
                  )}
                  {analytics.serviceBreakdown.map((s) => (
                    <tr key={s.name} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setFilterService(s.name)}>
                      <td className="py-2 px-2 flex items-center gap-2"><span className="w-2 h-2 rounded" style={{ background: COLORS[analytics.serviceBreakdown.indexOf(s) % COLORS.length] }} />{s.name}</td>
                      <td className="py-2 px-2 text-right font-medium">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard-leads">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold">Latest Leads</h2>
          <div className="text-xs sm:text-sm text-gray-500">Showing recent 50 leads</div>
        </div>

        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-700 overflow-hidden">
          {filterService && (
            <div className="p-3 border-b dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Filtered by service: <span className="font-medium">{filterService}</span></div>
              <div className="flex items-center gap-2 flex-wrap">
                <button className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap" onClick={() => setFilterService(null)}>Clear filter</button>
                <button className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap" onClick={exportLeadsCSV}>Export filtered leads</button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Mobile cards */}
              <div className="md:hidden space-y-3 px-3 pb-3">
                {filteredLeads.length === 0 && (
                  <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 text-sm text-gray-500 dark:text-gray-300">No leads</div>
                )}
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="rounded-lg border bg-white dark:bg-gray-900 p-4 shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm dark:text-white break-words">{lead.name || '—'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 break-words">{lead.service || '—'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 break-words">{lead.message ? `${lead.message.slice(0, 80)}${lead.message.length>80 ? '…' : ''}` : ''}</div>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime12(lead.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                      {lead.phone && <span className="whitespace-nowrap">{lead.phone}</span>}
                      {lead.email && <span className="break-all">{lead.email}</span>}
                    </div>
                    <div className="flex gap-2">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Email</a>
                      ) : null}
                      <a href={`/admin/leads/${lead.id}`} className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">View</a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-auto min-w-[600px] text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Name</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Service</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Phone</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Email</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Date</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No leads</td>
                      </tr>
                    )}
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="border-t dark:border-gray-700 last:border-b dark:last:border-gray-700">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top">
                          <div className="font-medium text-sm dark:text-white break-words">{lead.name || '—'}</div>
                          <div className="text-xs text-gray-400 break-words">{lead.message ? `${lead.message.slice(0, 60)}${lead.message.length>60? '…': ''}` : ''}</div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top text-sm dark:text-gray-300 whitespace-nowrap">{lead.service || '—'}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top text-sm dark:text-gray-300 whitespace-nowrap">{lead.phone || '—'}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top">
                          <div className="text-xs sm:text-sm dark:text-gray-300 break-all">{lead.email || '—'}</div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime12(lead.createdAt)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 align-top">
                          <div className="flex gap-2 flex-wrap">
                            {lead.email ? (
                              <a href={`mailto:${lead.email}`} className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">Email</a>
                            ) : null}
                            <a href={`/admin/leads/${lead.id}`} className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap">View</a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
      </div>
    </ModuleAccess>
  );
}
