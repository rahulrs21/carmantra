import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Customer, Vehicle, Note, ServiceBooking, InvoiceDoc, ID } from '@/lib/types';

// Collection refs
const customersCol = collection(db, 'customers');

// Auto-sync: find or create customer from email/mobile
export async function findOrCreateCustomer(data: { firstName?: string; lastName?: string; email?: string; mobile?: string; address?: string; city?: string; country?: string; state?: string; customerType?: 'b2c' | 'b2b'; companyName?: string; contactName?: string; contactEmail?: string; contactPhone?: string; servicesHistory?: string; }): Promise<ID | null> {
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
    if (data.customerType && !c.customerType) updates.customerType = data.customerType;
    if (data.companyName && !c.companyName) updates.companyName = data.companyName;
    if (data.contactName && !c.contactName) updates.contactName = data.contactName;
    if (data.contactEmail && !c.contactEmail) updates.contactEmail = data.contactEmail;
    if (data.contactPhone && !c.contactPhone) updates.contactPhone = data.contactPhone;
    if (data.servicesHistory && !c.servicesHistory) updates.servicesHistory = data.servicesHistory;
    if (Object.keys(updates).length > 0) {
      await updateCustomer(c.id!, updates);
    }
    return c.id!;
  }
  
  // Create new customer
  const newCust: Omit<Customer, 'id'|'createdAt'|'updatedAt'> = {
    customerType: data.customerType,
    companyName: data.companyName,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    servicesHistory: data.servicesHistory,
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
      // Handle B2C: single vehicle (numberPlate field)
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
            vin: s.vinNumber,
            services: [],
          });
        } else {
          // Update missing fields with more complete data
          const existing = vehiclesMap.get(key)!;
          if (!existing.vin) existing.vin = s.vinNumber;
          if (!existing.make) existing.make = s.vehicleBrand || '';
          if (!existing.model) existing.model = s.modelName || '';
          if (!existing.fuelType) existing.fuelType = s.fuelType;
        }
        
        // Add service to vehicle (prevent duplicates by checking service ID)
        const vehicle = vehiclesMap.get(key)!;
        if (!vehicle.services) vehicle.services = [];
        const serviceExists = vehicle.services.some(svc => svc.id === s.id);
        if (!serviceExists) {
          vehicle.services.push({
            id: s.id!,
            category: s.category || 'Service',
            status: s.status || 'pending',
            scheduledDate: s.scheduledDate,
            jobCardNo: s.jobCardNo,
          });
        }
      }
      
      // Handle B2B: multiple vehicles in array
      // Process ALL vehicles in the booking
      if (s.vehicles && Array.isArray(s.vehicles) && s.vehicles.length > 0) {
        s.vehicles.forEach((v: any) => {
          const plate = v.numberPlate || v.plate;
          if (plate) {
            const key = plate.toLowerCase().replace(/\s/g, '');
            
            // Create or get vehicle entry
            if (!vehiclesMap.has(key)) {
              vehiclesMap.set(key, {
                make: v.vehicleBrand || v.brand || '',
                model: v.modelName || v.model || '',
                plate: plate,
                fuelType: v.fuelType,
                color: undefined,
                year: undefined,
                vin: v.vinNumber || v.vin,
                services: [],
              });
            } else {
              // Update missing fields with more complete data
              const existing = vehiclesMap.get(key)!;
              if (!existing.vin) existing.vin = v.vinNumber || v.vin;
              if (!existing.make) existing.make = v.vehicleBrand || v.brand || '';
              if (!existing.model) existing.model = v.modelName || v.model || '';
              if (!existing.fuelType) existing.fuelType = v.fuelType;
            }
            
            // Add service to vehicle with the vehicle's own category (prevent duplicates)
            const vehicle = vehiclesMap.get(key)!;
            if (!vehicle.services) vehicle.services = [];
            const serviceExists = vehicle.services.some(svc => svc.id === s.id);
            if (!serviceExists) {
              vehicle.services.push({
                id: s.id!,
                category: v.category || s.category || 'Service',  // Use vehicle's category first
                status: s.status || 'pending',
                scheduledDate: s.scheduledDate,
                jobCardNo: s.jobCardNo,
              });
            }
          }
        });
      }
    });
  } catch (err) {
    console.error('Error fetching vehicles from bookedServices:', err);
  }
  
  // 3. Get vehicles from invoices (both B2C and B2B)
  try {
    const invoices = await listInvoicesForCustomer(customer);
    invoices.forEach((inv: any) => {
      // B2C: single vehicle in vehicleDetails
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
            vin: inv.vehicleDetails.vin,
            services: [],
          });
        } else {
          // Update missing fields
          const existing = vehiclesMap.get(key)!;
          if (!existing.vin) existing.vin = inv.vehicleDetails.vin;
          if (!existing.make) existing.make = inv.vehicleDetails.brand || '';
          if (!existing.model) existing.model = inv.vehicleDetails.model || '';
        }
      }
      
      // B2B: multiple vehicles in array
      if (inv.vehicles && Array.isArray(inv.vehicles)) {
        inv.vehicles.forEach((v: any) => {
          const plate = v.numberPlate || v.plate;
          if (plate) {
            const key = plate.toLowerCase().replace(/\s/g, '');
            if (!vehiclesMap.has(key)) {
              vehiclesMap.set(key, {
                make: v.vehicleBrand || v.brand || '',
                model: v.modelName || v.model || '',
                plate: plate,
                fuelType: v.fuelType,
                color: undefined,
                year: undefined,
                vin: v.vinNumber || v.vin,
                services: [],
              });
            } else {
              // Update missing fields
              const existing = vehiclesMap.get(key)!;
              if (!existing.vin) existing.vin = v.vinNumber || v.vin;
              if (!existing.make) existing.make = v.vehicleBrand || v.brand || '';
              if (!existing.model) existing.model = v.modelName || v.model || '';
              if (!existing.fuelType) existing.fuelType = v.fuelType;
            }
          }
        });
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

// Contact Persons (sub-collection under B2B company customer)
export interface ContactPerson {
  id?: ID;
  name: string;
  email: string;
  phone: string;
  title?: string;
  createdAt?: any;
  updatedAt?: any;
}

export async function saveContactPerson(companyCustomerId: ID, contactData: Omit<ContactPerson, 'id' | 'createdAt' | 'updatedAt'>): Promise<ID> {
  // Find existing contact by email or phone
  const contacts = await getDocs(
    query(
      collection(db, 'customers', companyCustomerId, 'contacts'),
      where('email', '==', contactData.email)
    )
  );
  
  if (!contacts.empty) {
    // Update existing
    const contactId = contacts.docs[0].id;
    await updateDoc(doc(db, 'customers', companyCustomerId, 'contacts', contactId), {
      ...contactData,
      updatedAt: serverTimestamp(),
    });
    return contactId;
  }
  
  // Create new
  const docRef = await addDoc(
    collection(db, 'customers', companyCustomerId, 'contacts'),
    {
      ...contactData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  return docRef.id;
}

export async function getContactPerson(companyCustomerId: ID, contactId: ID): Promise<ContactPerson | null> {
  const snap = await getDoc(doc(db, 'customers', companyCustomerId, 'contacts', contactId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as ContactPerson;
}

export async function listContactPersons(companyCustomerId: ID): Promise<ContactPerson[]> {
  const snap = await getDocs(collection(db, 'customers', companyCustomerId, 'contacts'));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ContactPerson[];
}

// Related data from existing collections
export async function listServiceHistoryForCustomer(customer: Customer): Promise<ServiceBooking[]> {
  // Heuristic: match by mobileNo/email (B2C) or contactPhone/contactEmail/companyName (B2B)
  const rows: ServiceBooking[] = [];
  const map: Record<string, boolean> = {};
  
  // B2C: search by mobileNo and email
  const byMobile = customer.mobile ? await getDocs(query(collection(db, 'bookedServices'), where('mobileNo', '==', customer.mobile))) : null;
  const byEmail = customer.email ? await getDocs(query(collection(db, 'bookedServices'), where('email', '==', customer.email))) : null;
  
  // B2B: search by contactPhone, contactEmail, and companyName
  const byContactPhone = customer.contactPhone ? await getDocs(query(collection(db, 'bookedServices'), where('contactPhone', '==', customer.contactPhone))) : null;
  const byContactEmail = customer.contactEmail ? await getDocs(query(collection(db, 'bookedServices'), where('contactEmail', '==', customer.contactEmail))) : null;
  const byCompanyName = customer.companyName ? await getDocs(query(collection(db, 'bookedServices'), where('companyName', '==', customer.companyName))) : null;
  
  // Merge all results, deduplicating by document ID
  if (byMobile) byMobile.docs.forEach(d => { rows.push({ id: d.id, ...(d.data() as any) }); map[d.id] = true; });
  if (byEmail) byEmail.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any) }); map[d.id] = true; });
  if (byContactPhone) byContactPhone.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any) }); map[d.id] = true; });
  if (byContactEmail) byContactEmail.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any) }); map[d.id] = true; });
  if (byCompanyName) byCompanyName.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any) }); map[d.id] = true; });
  
  // Sort by scheduledDate desc
  return rows.sort((a, b) => {
    const ad = a.scheduledDate?.toDate ? a.scheduledDate.toDate() : new Date(a.scheduledDate || 0);
    const bd = b.scheduledDate?.toDate ? b.scheduledDate.toDate() : new Date(b.scheduledDate || 0);
    return (bd as any) - (ad as any);
  });
}

export async function listLeadsForCustomer(customer: Customer): Promise<any[]> {
  if (!customer.email && !customer.mobile && !customer.contactEmail && !customer.contactPhone) return [];
  const rows: any[] = [];
  const map: Record<string, boolean> = {};
  
  // B2C: search by email and phone
  if (customer.email) {
    const byEmail = await getDocs(query(collection(db, 'crm-leads'), where('email', '==', customer.email)));
    byEmail.docs.forEach(d => { rows.push({ id: d.id, ...(d.data() as any), type: 'lead' }); map[d.id] = true; });
  }
  if (customer.mobile) {
    const byPhone = await getDocs(query(collection(db, 'crm-leads'), where('phone', '==', customer.mobile)));
    byPhone.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any), type: 'lead' }); map[d.id] = true; });
  }
  
  // B2B: search by contactEmail, contactPhone, and companyName
  if (customer.contactEmail) {
    const byContactEmail = await getDocs(query(collection(db, 'crm-leads'), where('email', '==', customer.contactEmail)));
    byContactEmail.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any), type: 'lead' }); map[d.id] = true; });
  }
  if (customer.contactPhone) {
    const byContactPhone = await getDocs(query(collection(db, 'crm-leads'), where('phone', '==', customer.contactPhone)));
    byContactPhone.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any), type: 'lead' }); map[d.id] = true; });
  }
  if (customer.companyName) {
    const byCompanyName = await getDocs(query(collection(db, 'crm-leads'), where('company', '==', customer.companyName)));
    byCompanyName.docs.forEach(d => { if (!map[d.id]) rows.push({ id: d.id, ...(d.data() as any), type: 'lead' }); map[d.id] = true; });
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
    // For B2B bookings with multiple vehicles, create an entry for each vehicle
    if (s.customerType === 'b2b' && s.vehicles && Array.isArray(s.vehicles) && s.vehicles.length > 1) {
      s.vehicles.forEach((v: any, idx: number) => {
        activities.push({
          id: s.id,
          key: `${s.id}-vehicle-${idx}`,
          type: 'service',
          title: v.category || s.category || 'Service Booking',
          description: `Vehicle: ${v.vehicleBrand || ''} ${v.modelName || ''} (${v.numberPlate || ''}) • Job Card: ${s.jobCardNo || 'N/A'} • Status: ${s.status || 'pending'}`,
          date: s.scheduledDate?.toDate ? s.scheduledDate.toDate() : new Date(s.scheduledDate || 0),
          data: s,
        });
      });
    } else {
      // For B2C or single-vehicle B2B, create single entry
      activities.push({
        id: s.id,
        key: `service-${s.id}`,
        type: 'service',
        title: s.category || 'Service Booking',
        description: `Job Card: ${s.jobCardNo || 'N/A'} • Status: ${s.status || 'pending'}`,
        date: s.scheduledDate?.toDate ? s.scheduledDate.toDate() : new Date(s.scheduledDate || 0),
        data: s,
      });
    }
  });
  
  // Map leads
  leads.forEach(l => {
    activities.push({
      id: l.id,
      key: `lead-${l.id}`,
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
      key: `invoice-${inv.id}`,
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
  const invoices: InvoiceDoc[] = [];
  const map: Record<string, boolean> = {};
  
  // For B2C customers: search by customerEmail
  if (customer.email) {
    const q = query(collection(db, 'invoices'), where('customerEmail', '==', customer.email));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      const inv = { id: d.id, ...(d.data() as any) };
      invoices.push(inv);
      map[d.id] = true;
    });
  }
  
  // For B2B customers: search by contactEmail and companyName
  if (customer.contactEmail) {
    const q = query(collection(db, 'invoices'), where('contactEmail', '==', customer.contactEmail));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      if (!map[d.id]) {
        const inv = { id: d.id, ...(d.data() as any) };
        invoices.push(inv);
        map[d.id] = true;
      }
    });
  }
  
  if (customer.companyName) {
    const q = query(collection(db, 'invoices'), where('companyName', '==', customer.companyName));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      if (!map[d.id]) {
        const inv = { id: d.id, ...(d.data() as any) };
        invoices.push(inv);
        map[d.id] = true;
      }
    });
  }
  
  // Sort client-side by createdAt desc
  return invoices.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return (bDate as any) - (aDate as any);
  });
}
