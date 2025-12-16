"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCustomer, listInvoicesForCustomer, listAllCustomerVehicles, updateCustomer, listServiceHistoryForCustomer } from '@/lib/firestore/customers';
import type { Customer, Vehicle, InvoiceDoc, ServiceBooking } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import VehicleForm from '@/components/admin/customers/VehicleForm';
import NotesSection from '@/components/admin/customers/NotesSection';
import ActivityHistory from '@/components/admin/customers/ActivityHistory';
import CustomerForm from '@/components/admin/customers/CustomerForm';

export default function CustomerProfilePage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [latestBooking, setLatestBooking] = useState<ServiceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    const cust = await getCustomer(id);
    setCustomer(cust);
    if (cust) {
      const [vs, invs, services] = await Promise.all([
        listAllCustomerVehicles(cust),
        listInvoicesForCustomer(cust),
        listServiceHistoryForCustomer(cust),
      ]);
      setVehicles(vs);
      setInvoices(invs);
      // Get latest booking for address fallback
      if (services.length > 0) {
        setLatestBooking(services[0]);
      }
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!customer) return <div className="p-6 text-red-600">Customer not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
          <div className="text-sm text-gray-600">{customer.email} • {customer.mobile}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button
            className={customer.status === 'active' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-green-600 hover:bg-green-700 text-white'}
            onClick={async () => {
              if (!customer?.id) return;
              setSavingStatus(true);
              const next = customer.status === 'active' ? 'inactive' : 'active';
              await updateCustomer(customer.id, { status: next });
              setCustomer({ ...customer, status: next });
              setSavingStatus(false);
            }}
            disabled={savingStatus}
          >
            {customer.status === 'active' ? (savingStatus ? 'Deactivating…' : 'Deactivate') : (savingStatus ? 'Activating…' : 'Activate')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Details and Vehicles */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Customer Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Status:</span> <span className="font-medium">{customer.status}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="font-medium">{customer.email}</span></div>
              <div><span className="text-gray-500">Mobile:</span> <span className="font-medium">{customer.mobile}</span></div>
              <div><span className="text-gray-500">Address:</span> <span className="font-medium">{customer.address || latestBooking?.address || '-'}</span></div>
              <div><span className="text-gray-500">City:</span> <span className="font-medium">{customer.city || latestBooking?.city || '-'}</span></div>
              <div><span className="text-gray-500">Country:</span> <span className="font-medium">{customer.country || latestBooking?.country || '-'}</span></div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Vehicles</h2>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowAddVehicle(true)}>Add Vehicle</Button>
            </div>
            {vehicles.length === 0 ? (
              <div className="text-sm text-gray-500">No vehicles found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {vehicles.map((v, idx) => (
                  <div key={v.id || `vehicle-${idx}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50 flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-base truncate">
                          {v.make} {v.model}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Plate:</span> {v.plate}
                        </div>
                        {(v.year || v.vin || v.color || v.fuelType) && (
                          <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                            {v.year && <div>Year: {v.year}</div>}
                            {v.fuelType && <div>Fuel: {v.fuelType}</div>}
                            {v.color && <div>Color: {v.color}</div>}
                            {v.vin && <div className="truncate">VIN: {v.vin}</div>}
                          </div>
                        )}
                      </div>
                      {v.id && (
                        <div className="ml-2 flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Saved
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Service History for this vehicle */}
                    {v.services && v.services.length > 0 && (
                      <div className="mt-auto pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-700">Service History</h4>
                          <span className="text-xs text-gray-500">
                            {v.services.length}
                          </span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {v.services.map((service, sIdx) => (
                            <div key={service.id || sIdx} className="text-xs bg-white p-2 rounded border border-gray-100">
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <div className="font-medium text-gray-800 flex-1 truncate">{service.category}</div>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                                  service.status === 'completed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : service.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {service.status || 'pending'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                {service.jobCardNo && (
                                  <div className="text-gray-500 truncate">Job: {service.jobCardNo}</div>
                                )}
                                <a 
                                  href={`/admin/book-service/${service.id}`}
                                  className="text-orange-600 hover:text-orange-700 hover:underline ml-auto"
                                >
                                  View
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-xs text-gray-500">
              Showing vehicles from customer profile, service bookings, and invoices
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Complete Activity History</h2>
              <span className="text-xs text-gray-500">Services • Leads • Invoices</span>
            </div>
            <ActivityHistory customer={customer} />
          </Card>
        </div>

        {/* Right: Invoices & Notes */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Invoices</h2>
            {invoices.length === 0 ? (
              <div className="text-sm text-gray-500">No invoices</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {invoices.slice(0, 6).map(inv => (
                  <li key={inv.id} className="flex items-center justify-between">
                    <span>#{inv.id?.slice(0,6)} • AED {inv.total}</span>
                    <a href={`/admin/invoice/${inv.id}`} className="text-orange-600 hover:underline">View</a>
                  </li>
                ))}
              </ul>
            )}
            {invoices.length > 6 && (
              <div className="text-xs text-gray-500 mt-2">+{invoices.length - 6} more…</div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Notes</h2>
            <NotesSection customerId={customer.id!} />
          </Card>
        </div>
      </div>

      {showAddVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddVehicle(false)} />
          <div className="bg-white rounded-lg shadow-lg max-w-xl w-full z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Vehicle</h3>
              <button className="text-gray-500" onClick={() => setShowAddVehicle(false)}>Close</button>
            </div>
            <VehicleForm customerId={customer.id!} onSaved={() => { setShowAddVehicle(false); refresh(); }} />
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowEdit(false)} />
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Customer</h3>
              <button className="text-gray-500" onClick={() => setShowEdit(false)}>Close</button>
            </div>
            {/* Reuse CustomerForm for editing */}
            {/* We pass id so the form calls updateCustomer */}
            <CustomerForm initial={customer} onSaved={() => { setShowEdit(false); refresh(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
