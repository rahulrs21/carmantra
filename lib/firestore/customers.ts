import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Customer, Vehicle, Note, ServiceBooking, InvoiceDoc, ID } from '@/lib/types';

// Collection refs
const customersCol = collection(db, 'customers');

// Auto-sync: find or create customer from email/mobile
export async function findOrCreateCustomer(data: { firstName?: string; lastName?: string; email?: string; mobile?: string; address?: string; city?: string; country?: string; state?: string; }): Promise<ID | null> {
  if (!data.email && !data.mobile) return null;
  
  // Try to find existing by exact email or mobile match
  let existing: Customer[] = [];
  
  if (data.email) {
    const byEmail = await getDocs(query(customersCol, where('email', '==', data.email), limit(1)));
    if (!byEmail.empty) {
      existing = byEmail.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    }
  }
  
  if (existing.length === 0 && data.mobile) {
    const byMobile = await getDocs(query(customersCol, where('mobile', '==', data.mobile), limit(1)));
    if (!byMobile.empty) {
      existing = byMobile.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    }
  }
  
  if (existing.length > 0) {
    // Update if needed
    const c = existing[0];
    const updates: Partial<Customer> = {};
    if (data.firstName && !c.firstName) updates.firstName = data.firstName;
    if (data.lastName && !c.lastName) updates.lastName = data.lastName;
    if (data.email && !c.email) updates.email = data.email;
    if (data.mobile && !c.mobile) updates.mobile = data.mobile;
    if (data.address && !c.address) updates.address = data.address;
    if (data.city && !c.city) updates.city = data.city;
    if (data.country && !c.country) updates.country = data.country;
    if (Object.keys(updates).length > 0) {
      await updateCustomer(c.id!, updates);
    }
    return c.id!;
  }
  
  // Create new customer
  const newCust: Omit<Customer, 'id'|'createdAt'|'updatedAt'> = {
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    email: data.email || '',
    mobile: data.mobile || '',
    address: data.address,
    city: data.city,
    country: data.country,
    status: 'active',
  };
  return await createCustomer(newCust);
}

export async function createCustomer(data: Omit<Customer, 'id'|'createdAt'|'updatedAt'>): Promise<ID> {
  const now = serverTimestamp();
  // Filter out undefined values to avoid Firestore errors
  const cleanData: any = { createdAt: now, updatedAt: now };
  Object.keys(data).forEach(key => {
    const value = (data as any)[key];
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });
  const docRef = await addDoc(customersCol, cleanData);
  return docRef.id;
}

export async function updateCustomer(id: ID, data: Partial<Customer>) {
  await updateDoc(doc(db, 'customers', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCustomer(id: ID) {
  await deleteDoc(doc(db, 'customers', id));
}

export async function getCustomer(id: ID): Promise<Customer | null> {
  const snap = await getDoc(doc(db, 'customers', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Customer;
}

export async function listCustomers(opts?: { search?: string; status?: 'all'|'active'|'inactive'; limitCount?: number; }): Promise<Customer[]> {
  const { search = '', status = 'all', limitCount } = opts || {};

  let q = query(customersCol, orderBy('createdAt', 'desc'));
  // Firestore can't OR easily; for simple search, we'll fetch then filter client-side.
  if (limitCount) q = query(q, limit(limitCount));
  const snap = await getDocs(q);
  let rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Customer[];

  if (status !== 'all') rows = rows.filter(r => r.status === status);
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(r => (
      (r.firstName + ' ' + (r.lastName || '')).toLowerCase().includes(s) ||
      (r.email || '').toLowerCase().includes(s) ||
      (r.mobile || '').toLowerCase().includes(s)
    ));
  }
  
  // Deduplicate by email and mobile to ensure unique customers
  const seen = new Map<string, Customer>();
  const unique: Customer[] = [];
  
  for (const row of rows) {
    const key = row.email || row.mobile || row.id;
    if (!seen.has(key!)) {
      seen.set(key!, row);
      unique.push(row);
    }
  }
  
  return unique;
}

// Vehicles (subcollection under customer)
export async function listVehicles(customerId: ID): Promise<Vehicle[]> {
  const snap = await getDocs(collection(db, 'customers', customerId, 'vehicles'));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

// Aggregate vehicles from all modules (vehicles subcollection, bookedServices, invoices)
export async function listAllCustomerVehicles(customer: Customer): Promise<Vehicle[]> {
  const vehiclesMap = new Map<string, Vehicle>();
  
  // First, get all services to associate with vehicles
  const allServices = await listServiceHistoryForCustomer(customer);
  
  // 1. Get vehicles from subcollection
  try {
    const subVehicles = await listVehicles(customer.id!);
    subVehicles.forEach(v => {
      if (v.plate) {
        const key = v.plate.toLowerCase().replace(/\s/g, '');
        if (!vehiclesMap.has(key)) {
          vehiclesMap.set(key, {
            id: v.id,
            make: v.make || '',
            model: v.model || '',
            year: v.year,
            plate: v.plate,
            vin: v.vin,
            color: v.color,
            fuelType: v.fuelType,
            createdAt: v.createdAt,
            services: [],
          });
        }
      }
    });
  } catch (err) {
    console.error('Error fetching subcollection vehicles:', err);
  }
  
  // 2. Get vehicles from bookedServices and associate services
  try {
    allServices.forEach(s => {
      if (s.numberPlate) {
        const key = s.numberPlate.toLowerCase().replace(/\s/g, '');
        
        // Create or get vehicle entry
        if (!vehiclesMap.has(key)) {
          vehiclesMap.set(key, {
            make: s.vehicleBrand || '',
            model: s.modelName || '',
            plate: s.numberPlate,
            fuelType: s.fuelType,
            color: undefined,
            year: undefined,
            vin: undefined,
            services: [],
          });
        }
        
        // Add service to vehicle
        const vehicle = vehiclesMap.get(key)!;
        if (!vehicle.services) vehicle.services = [];
        vehicle.services.push({
          id: s.id!,
          category: s.category || 'Service',
          status: s.status || 'pending',
          scheduledDate: s.scheduledDate,
          jobCardNo: s.jobCardNo,
        });
      }
    });
  } catch (err) {
    console.error('Error fetching vehicles from bookedServices:', err);
  }
  
  // 3. Get vehicles from invoices
  try {
    const invoices = await listInvoicesForCustomer(customer);
    invoices.forEach((inv: any) => {
      if (inv.vehicleDetails?.plate) {
        const key = inv.vehicleDetails.plate.toLowerCase().replace(/\s/g, '');
        if (!vehiclesMap.has(key)) {
          vehiclesMap.set(key, {
            make: inv.vehicleDetails.brand || '',
            model: inv.vehicleDetails.model || '',
            plate: inv.vehicleDetails.plate,
            fuelType: undefined,
            color: undefined,
            year: undefined,
            vin: undefined,
            services: [],
          });
        }
      }
    });
  } catch (err) {
    console.error('Error fetching vehicles from invoices:', err);
  }
  
  return Array.from(vehiclesMap.values());
}

export async function addVehicle(customerId: ID, vehicle: Omit<Vehicle, 'id'|'createdAt'>) {
  await addDoc(collection(db, 'customers', customerId, 'vehicles'), { ...vehicle, createdAt: serverTimestamp() });
}

export async function updateVehicle(customerId: ID, vehicleId: ID, vehicle: Partial<Vehicle>) {
  await updateDoc(doc(db, 'customers', customerId, 'vehicles', vehicleId), vehicle as any);
}

export async function deleteVehicle(customerId: ID, vehicleId: ID) {
  await deleteDoc(doc(db, 'customers', customerId, 'vehicles', vehicleId));
}

// Notes (subcollection)
export async function listNotes(customerId: ID): Promise<Note[]> {
  const q = query(collection(db, 'customers', customerId, 'notes'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function addNote(customerId: ID, message: string, authorUid?: string) {
  const data: any = { message, createdAt: serverTimestamp() };
  if (authorUid) data.authorUid = authorUid;
  await addDoc(collection(db, 'customers', customerId, 'notes'), data);
}

export async function deleteNote(customerId: ID, noteId: ID) {
  await deleteDoc(doc(db, 'customers', customerId, 'notes', noteId));
}

// Related data from existing collections
export async function listServiceHistoryForCustomer(customer: Customer): Promise<ServiceBooking[]> {
  // Heuristic: match by mobileNo or email in 'bookedServices'
  const rows: ServiceBooking[] = [];
  // Firestore requires two queries; merge client-side
  const byMobile = customer.mobile ? await getDocs(query(collection(db, 'bookedServices'), where('mobileNo', '==', customer.mobile))) : null;
  const byEmail = customer.email ? await getDocs(query(collection(db, 'bookedServices'), where('email', '==', customer.email))) : null;
  const map: Record<string, boolean> = {};
  if (byMobile) byMobile.docs.forEach(d => { rows.push({ id: d.id, ...(d.data() as any) }); map[d.id] = true; });
  if (byEmail) byEmail.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any) }); });
  // Sort by scheduledDate desc
  return rows.sort((a, b) => {
    const ad = a.scheduledDate?.toDate ? a.scheduledDate.toDate() : new Date(a.scheduledDate || 0);
    const bd = b.scheduledDate?.toDate ? b.scheduledDate.toDate() : new Date(b.scheduledDate || 0);
    return (bd as any) - (ad as any);
  });
}

export async function listLeadsForCustomer(customer: Customer): Promise<any[]> {
  if (!customer.email && !customer.mobile) return [];
  const rows: any[] = [];
  const map: Record<string, boolean> = {};
  
  if (customer.email) {
    const byEmail = await getDocs(query(collection(db, 'crm-leads'), where('email', '==', customer.email)));
    byEmail.docs.forEach(d => { rows.push({ id: d.id, ...(d.data() as any), type: 'lead' }); map[d.id] = true; });
  }
  if (customer.mobile) {
    const byPhone = await getDocs(query(collection(db, 'crm-leads'), where('phone', '==', customer.mobile)));
    byPhone.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any), type: 'lead' }); });
  }
  
  // Sort client-side by createdAt desc
  rows.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0));
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0));
    return (bDate as any) - (aDate as any);
  });
  
  return rows;
}

// Combined activity history
export async function getCustomerActivityHistory(customer: Customer): Promise<any[]> {
  const [services, leads, invoices] = await Promise.all([
    listServiceHistoryForCustomer(customer),
    listLeadsForCustomer(customer),
    listInvoicesForCustomer(customer),
  ]);
  
  const activities: any[] = [];
  
  // Map services
  services.forEach(s => {
    activities.push({
      id: s.id,
      type: 'service',
      title: s.category || 'Service Booking',
      description: `Job Card: ${s.jobCardNo || 'N/A'} • Status: ${s.status || 'pending'}`,
      date: s.scheduledDate?.toDate ? s.scheduledDate.toDate() : new Date(s.scheduledDate || 0),
      data: s,
    });
  });
  
  // Map leads
  leads.forEach(l => {
    activities.push({
      id: l.id,
      type: 'lead',
      title: 'Lead Inquiry',
      description: `Service: ${l.service || 'General'} • ${(l.message || '').slice(0, 60)}${(l.message||'').length > 60 ? '...' : ''}`,
      date: l.createdAt?.toDate ? l.createdAt.toDate() : (l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000) : new Date()),
      data: l,
    });
  });
  
  // Map invoices
  invoices.forEach(inv => {
    activities.push({
      id: inv.id,
      type: 'invoice',
      title: 'Invoice Generated',
      description: `Total: AED ${inv.total || 0}`,
      date: inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt || 0),
      data: inv,
    });
  });
  
  // Sort by date descending
  return activities.sort((a, b) => (b.date as any) - (a.date as any));
}

export async function listInvoicesForCustomer(customer: Customer): Promise<InvoiceDoc[]> {
  if (!customer.email) return [];
  const q = query(collection(db, 'invoices'), where('customerEmail', '==', customer.email));
  const snap = await getDocs(q);
  const invoices = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  // Sort client-side by createdAt desc
  return invoices.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return (bDate as any) - (aDate as any);
  });
}
