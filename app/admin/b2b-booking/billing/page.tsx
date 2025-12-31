"use client";

import { useEffect, useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { B2BCompany, B2BService, B2BVehicle } from '@/lib/types/b2b.types';
import { companiesService, vehiclesService, servicesService } from '@/lib/firestore/b2b-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase.js';

interface BillingData {
  company: B2BCompany | null;
  vehicles: B2BVehicle[];
  services: B2BService[];
  dateRange: DateRange | undefined;
  totalAmount: number;
}

export default function B2BBillingPage() {
  const [companies, setCompanies] = useState<B2BCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>();
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch companies
  useEffect(() => {
    const q = query(collection(db, 'b2b-companies'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setCompanies(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as B2BCompany)));
      },
      (error) => {
        console.error('Companies snapshot error:', error);
      }
    );
    return () => unsub();
  }, []);

  const handleGenerateBilling = async () => {
    if (!selectedCompanyId || !dateRange?.from || !dateRange?.to) {
      alert('Please select a company and date range');
      return;
    }

    setLoading(true);
    try {
      const company = await companiesService.fetchCompanyById(selectedCompanyId);
      const services = await servicesService.fetchServices(selectedCompanyId, dateRange.from, dateRange.to);

      const totalAmount = (services.services || []).reduce((sum: number, s: B2BService) => sum + (s.totalAmount || 0), 0);

      setBillingData({
        company,
        vehicles: [],
        services: services.services || [],
        dateRange,
        totalAmount,
      });

      setShowPreview(true);
    } catch (error) {
      console.error('Error generating billing:', error);
      alert('Failed to generate billing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">B2B Billing & Quotation</h1>
        <p className="text-gray-600 mt-1">Generate bills and quotations for companies based on vehicles and services</p>
      </div>

      {/* Filters Card */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Company *</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">-- Choose a company --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
              <PopoverTrigger asChild>
                <button className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 text-left h-10">
                  {dateRange?.from && dateRange?.to
                    ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                    : 'Select date range *'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4">
                <Calendar
                  mode="range"
                  selected={tempDateRange}
                  onSelect={setTempDateRange}
                  numberOfMonths={2}
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setDateRange(tempDateRange);
                      setIsDatePopoverOpen(false);
                    }}
                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setTempDateRange(undefined);
                      setDateRange(undefined);
                      setIsDatePopoverOpen(false);
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerateBilling}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Generating...' : 'Generate Bill & Quotation'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Billing Preview Dialog */}
      {billingData && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bill & Quotation Preview</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 p-6 bg-white border rounded-lg">
              {/* Header */}
              <div className="border-b pb-6">
                <h2 className="text-2xl font-bold text-gray-900">{billingData.company?.name}</h2>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-gray-600">Contact Person</p>
                    <p className="font-medium">{billingData.company?.contactPerson}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{billingData.company?.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-medium">{billingData.company?.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">VAT Number</p>
                    <p className="font-medium">{billingData.company?.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Period */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Billing Period</p>
                <p className="text-lg font-semibold text-gray-900">
                  {billingData.dateRange?.from?.toLocaleDateString()} -{' '}
                  {billingData.dateRange?.to?.toLocaleDateString()}
                </p>
              </div>

              {/* Vehicles & Services */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Vehicles & Services</h3>
                <div className="space-y-4">
                  {billingData.services.length === 0 ? (
                    <p className="text-gray-500 text-center py-6">No services found for the selected period</p>
                  ) : (
                    <>
                      {billingData.services.map((service) => (
                        <div key={service.id} className="border rounded-lg p-4 mb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-gray-900">{service.title || 'Service'}</h4>
                              <p className="text-sm text-gray-600">{service.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">AED {service.totalAmount?.toFixed(2) || '0.00'}</p>
                              <p className="text-sm text-gray-600">{service.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-lg font-semibold text-gray-900">Total Services</p>
                  <p className="text-lg font-semibold text-gray-900">{billingData.services.length}</p>
                </div>
                <div className="border-t pt-4 flex justify-between items-center">
                  <p className="text-xl font-bold text-gray-900">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-600">AED {billingData.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-md"
                >
                  Print Bill
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-md"
                >
                  Print Quotation
                </button>
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
