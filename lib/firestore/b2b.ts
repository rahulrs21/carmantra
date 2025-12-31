import {
  db,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from '@/lib/firebase';
import { B2BCompany, B2BVehicle, B2BService, B2BVehicleDetail, PreInspectionData, ReferralInfo } from '@/lib/types';
import { safeConsoleError } from '@/lib/safeConsole';

// ==================== COMPANY OPERATIONS ====================

export async function addB2BCompany(company: Omit<B2BCompany, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'b2b-companies'), {
      ...company,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    safeConsoleError('Error adding B2B company:', error);
    throw error;
  }
}

export async function updateB2BCompany(companyId: string, updates: Partial<B2BCompany>) {
  try {
    const companyRef = doc(db, 'b2b-companies', companyId);
    await updateDoc(companyRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    safeConsoleError('Error updating B2B company:', error);
    throw error;
  }
}

export async function deleteB2BCompany(companyId: string) {
  try {
    await deleteDoc(doc(db, 'b2b-companies', companyId));
  } catch (error) {
    safeConsoleError('Error deleting B2B company:', error);
    throw error;
  }
}

export async function getB2BCompanyById(companyId: string): Promise<B2BCompany | null> {
  try {
    const docSnap = await getDoc(doc(db, 'b2b-companies', companyId));
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as B2BCompany;
    }
    return null;
  } catch (error) {
    safeConsoleError('Error getting B2B company:', error);
    throw error;
  }
}

// ==================== VEHICLE OPERATIONS ====================

export async function addB2BVehicle(vehicle: Omit<B2BVehicle, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'b2b-vehicles'), {
      ...vehicle,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    safeConsoleError('Error adding B2B vehicle:', error);
    throw error;
  }
}

export async function updateB2BVehicle(vehicleId: string, updates: Partial<B2BVehicle>) {
  try {
    const vehicleRef = doc(db, 'b2b-vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    safeConsoleError('Error updating B2B vehicle:', error);
    throw error;
  }
}

export async function deleteB2BVehicle(vehicleId: string) {
  try {
    await deleteDoc(doc(db, 'b2b-vehicles', vehicleId));
  } catch (error) {
    safeConsoleError('Error deleting B2B vehicle:', error);
    throw error;
  }
}

export async function getB2BVehicleById(vehicleId: string): Promise<B2BVehicleDetail | null> {
  try {
    console.log('Fetching vehicle:', vehicleId);
    const vehicleSnap = await getDoc(doc(db, 'b2b-vehicles', vehicleId));
    if (!vehicleSnap.exists()) {
      console.warn('Vehicle not found:', vehicleId);
      return null;
    }

    const vehicleData = { ...vehicleSnap.data(), id: vehicleSnap.id } as B2BVehicle;
    console.log('Vehicle data loaded:', vehicleData);

    // Fetch services for this vehicle
    console.log('Fetching services for vehicle:', vehicleId);
    const servicesSnap = await getDocs(
      query(collection(db, 'b2b-services'), where('vehicleId', '==', vehicleId))
    );
    const services = servicesSnap.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as B2BService));
    console.log('Services loaded:', services.length);

    // Fetch pre-inspection data (if it exists in the main document)
    const preInspection = vehicleData.preInspection || undefined;
    console.log('Pre-inspection data:', preInspection);

    // Fetch referral info (if it exists in the main document)
    const referral = vehicleData.referral || undefined;
    console.log('Referral data:', referral);

    const result = {
      ...vehicleData,
      services,
      preInspection,
      referral,
    } as B2BVehicleDetail;
    
    console.log('Vehicle detail loaded successfully');
    return result;
  } catch (error) {
    console.error('Error getting B2B vehicle detail:', error);
    safeConsoleError('Error getting B2B vehicle detail:', error);
    throw error;
  }
}

export async function getB2BVehiclesByCompanyId(companyId: string): Promise<B2BVehicle[]> {
  try {
    const q = query(collection(db, 'b2b-vehicles'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as B2BVehicle));
  } catch (error) {
    safeConsoleError('Error getting vehicles by company:', error);
    throw error;
  }
}

// ==================== SERVICE OPERATIONS ====================

export async function addB2BService(service: Omit<B2BService, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'b2b-services'), {
      ...service,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    safeConsoleError('Error adding B2B service:', error);
    throw error;
  }
}

export async function updateB2BService(serviceId: string, updates: Partial<B2BService>) {
  try {
    const serviceRef = doc(db, 'b2b-services', serviceId);
    await updateDoc(serviceRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    safeConsoleError('Error updating B2B service:', error);
    throw error;
  }
}

export async function deleteB2BService(serviceId: string) {
  try {
    await deleteDoc(doc(db, 'b2b-services', serviceId));
  } catch (error) {
    safeConsoleError('Error deleting B2B service:', error);
    throw error;
  }
}

export async function getB2BServicesByVehicleId(vehicleId: string): Promise<B2BService[]> {
  try {
    const q = query(collection(db, 'b2b-services'), where('vehicleId', '==', vehicleId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as B2BService));
  } catch (error) {
    safeConsoleError('Error getting services by vehicle:', error);
    throw error;
  }
}

export async function getB2BServicesByCompanyAndDateRange(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<B2BService[]> {
  try {
    const vehicles = await getB2BVehiclesByCompanyId(companyId);
    const vehicleIds = vehicles.map((v) => v.id);

    if (vehicleIds.length === 0) return [];

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(new Date(endDate.getTime() + 86400000)); // +1 day

    const allServices: B2BService[] = [];

    for (const vehicleId of vehicleIds) {
      const q = query(
        collection(db, 'b2b-services'),
        where('vehicleId', '==', vehicleId),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
      );
      const snapshot = await getDocs(q);
      allServices.push(...snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as B2BService)));
    }

    return allServices;
  } catch (error) {
    safeConsoleError('Error getting services by company and date range:', error);
    throw error;
  }
}

// ==================== PRE-INSPECTION OPERATIONS ====================

export async function updatePreInspection(vehicleId: string, preInspectionData: PreInspectionData) {
  try {
    const vehicleRef = doc(db, 'b2b-vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      preInspection: {
        ...preInspectionData,
        inspectionDate: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    safeConsoleError('Error updating pre-inspection:', error);
    throw error;
  }
}

export async function getPreInspection(vehicleId: string): Promise<PreInspectionData | null> {
  try {
    const docSnap = await getDoc(doc(db, 'b2b-vehicles', vehicleId, 'details', 'preInspection'));
    return docSnap.exists() ? (docSnap.data() as PreInspectionData) : null;
  } catch (error) {
    safeConsoleError('Error getting pre-inspection:', error);
    throw error;
  }
}

// ==================== REFERRAL OPERATIONS ====================

export async function updateReferral(vehicleId: string, referralData: ReferralInfo) {
  try {
    const vehicleRef = doc(db, 'b2b-vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      referral: referralData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    safeConsoleError('Error updating referral:', error);
    throw error;
  }
}

export async function getReferral(vehicleId: string): Promise<ReferralInfo | null> {
  try {
    const docSnap = await getDoc(doc(db, 'b2b-vehicles', vehicleId, 'details', 'referral'));
    return docSnap.exists() ? (docSnap.data() as ReferralInfo) : null;
  } catch (error) {
    safeConsoleError('Error getting referral:', error);
    throw error;
  }
}
