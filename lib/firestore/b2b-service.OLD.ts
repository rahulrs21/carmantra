/**
 * B2B Booking Firestore Service
 * Centralized data access layer for all B2B operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  Timestamp,
  Query,
  DocumentData,
  WriteBatch,
  writeBatch,
  deleteField,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  B2BCompany,
  B2BService,
  B2BVehicle,
  B2BPreInspection,
  B2BReferral,
  CompanyFormData,
  ServiceFormData,
  VehicleFormData,
  PreInspectionFormData,
  ReferralFormData,
  ServiceStatus,
} from '../types/b2b.types';

// ============ COMPANIES ============

export const companiesService = {
  /**
   * Fetch all companies with optional filters
   */
  async fetchCompanies(pageSize = 20, lastDoc?: QueryDocumentSnapshot<DocumentData> | undefined) {
    try {
      let q: Query = collection(db, 'b2b-companies');
      let constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1), // +1 to detect if there's a next page
      ];

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const queryRef = query(q, ...constraints);
      const snapshot = await getDocs(queryRef);
      const hasMore = snapshot.docs.length > pageSize;
      const docs = snapshot.docs.slice(0, pageSize);

      return {
        companies: docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as B2BCompany)
        ),
        hasMore,
        lastDoc: docs[docs.length - 1],
      };
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  },

  /**
   * Fetch single company by ID
   */
  async fetchCompanyById(companyId: string): Promise<B2BCompany | null> {
    const docRef = doc(db, 'b2b-companies', companyId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as B2BCompany;
  },

  /**
   * Create new company
   */
  async createCompany(
    data: CompanyFormData,
    userId: string
  ): Promise<{ id: string; company: B2BCompany }> {
    const docRef = doc(collection(db, 'b2b-companies'));
    const now = Timestamp.now();
    const company: B2BCompany = {
      id: docRef.id,
      ...data,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      isActive: true,
    };

    await setDoc(docRef, company);
    return { id: docRef.id, company };
  },

  /**
   * Update company
   */
  async updateCompany(
    companyId: string,
    data: Partial<CompanyFormData>
  ): Promise<void> {
    const docRef = doc(db, 'b2b-companies', companyId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  /**
   * Soft delete company
   */
  async deleteCompany(companyId: string): Promise<void> {
    const docRef = doc(db, 'b2b-companies', companyId);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  },
};

// ============ SERVICES ============

export const servicesService = {
  /**
   * Fetch services for a company with optional date range filter
   */
  async fetchServices(
    companyId: string,
    startDate?: Date,
    endDate?: Date,
    pageSize = 20,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ) {
    const colRef = collection(db, 'b2b-services');
    let constraints: QueryConstraint[] = [
      where('companyId', '==', companyId),
      orderBy('serviceDate', 'desc'),
      limit(pageSize + 1),
    ];

    if (startDate && endDate) {
      constraints = [
        ...constraints,
        where('serviceDate', '>=', Timestamp.fromDate(startDate)),
        where('serviceDate', '<=', Timestamp.fromDate(endDate)),
      ];
    }

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const queryRef = query(colRef, ...constraints);
    const snapshot = await getDocs(queryRef);
    const hasMore = snapshot.docs.length > pageSize;
    const docs = snapshot.docs.slice(0, pageSize);

    return {
      services: docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as B2BService)
      ),
      hasMore,
      lastDoc: docs[docs.length - 1],
    };
  },

  /**
   * Fetch single service by ID
   */
  async fetchServiceById(companyId: string, serviceId: string): Promise<B2BService | null> {
    const docRef = doc(db, 'b2b-services', serviceId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as B2BService;
  },

  /**
   * Create new service
   */
  async createService(
    companyId: string,
    data: ServiceFormData,
    userId: string
  ): Promise<{ id: string; service: B2BService }> {
    try {
      console.log('[b2b-service] createService called with:', {
        companyId,
        data,
        userId,
      });

      // Validate inputs
      if (!companyId) {
        throw new Error('companyId is required');
      }
      if (!userId) {
        throw new Error('userId is required');
      }
      if (!data.title) {
        throw new Error('Service title is required');
      }
      if (!data.serviceDate) {
        throw new Error('Service date is required');
      }

      const docRef = doc(collection(db, 'b2b-services'));
      const now = Timestamp.now();
      const service: any = {
        id: docRef.id,
        companyId,
        title: data.title,
        type: data.type,
        serviceDate: Timestamp.fromDate(data.serviceDate),
        notes: data.notes || '',
        status: 'pending',
        totalAmount: 0,
        subtotal: 0,
        referralTotal: 0,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
      };

      // Only add optional date range fields if they exist
      if (data.dateRangeStart) {
        service.dateRangeStart = Timestamp.fromDate(data.dateRangeStart);
        console.log('[b2b-service] Added dateRangeStart:', service.dateRangeStart);
      }
      if (data.dateRangeEnd) {
        service.dateRangeEnd = Timestamp.fromDate(data.dateRangeEnd);
        console.log('[b2b-service] Added dateRangeEnd:', service.dateRangeEnd);
      }

      console.log('[b2b-service] Saving service to Firestore:', {
        docId: docRef.id,
        service,
      });

      await setDoc(docRef, service);

      console.log('[b2b-service] Service created successfully:', {
        id: docRef.id,
        service,
      });

      return { id: docRef.id, service };
    } catch (error) {
      console.error('[b2b-service] Error creating service:', error);
      throw error;
    }
  },

  /**
   * Update service (status, amounts, etc.)
   */
  async updateService(
    companyId: string,
    serviceId: string,
    data: Partial<B2BService>
  ): Promise<void> {
    const docRef = doc(db, 'b2b-services', serviceId);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.now(),
    };
    await updateDoc(docRef, updateData);
  },

  /**
   * Update service status
   */
  async updateServiceStatus(
    companyId: string,
    serviceId: string,
    status: ServiceStatus
  ): Promise<void> {
    const docRef = doc(db, 'b2b-services', serviceId);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
    });
  },

  /**
   * Recalculate and update service totals
   */
  async recalculateServiceTotals(
    companyId: string,
    serviceId: string,
    subtotal: number,
    referralTotal: number
  ): Promise<void> {
    const docRef = doc(db, 'b2b-services', serviceId);
    await updateDoc(docRef, {
      subtotal,
      referralTotal,
      totalAmount: subtotal + referralTotal,
      updatedAt: Timestamp.now(),
    });
  },
};

// ============ VEHICLES ============

export const vehiclesService = {
  /**
   * Fetch vehicles for a service
   */
  async fetchVehicles(companyId: string, serviceId: string) {
    const colRef = collection(db, 'b2b-vehicles');
    const queryRef = query(
      colRef,
      where('serviceId', '==', serviceId),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(queryRef);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as B2BVehicle)
    );
  },

  /**
   * Fetch single vehicle
   */
  async fetchVehicleById(
    companyId: string,
    serviceId: string,
    vehicleId: string
  ): Promise<B2BVehicle | null> {
    const docRef = doc(db, 'b2b-vehicles', vehicleId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as B2BVehicle;
  },

  /**
   * Add vehicle to service
   */
  async addVehicle(
    companyId: string,
    serviceId: string,
    data: VehicleFormData
  ): Promise<{ id: string; vehicle: B2BVehicle }> {
    const docRef = doc(
      collection(db, 'b2b-vehicles')
    );
    const now = Timestamp.now();
    const vehicle: B2BVehicle = {
      id: docRef.id,
      serviceId,
      ...data,
      status: 'pending',
      preInspectionCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, vehicle);
    return { id: docRef.id, vehicle };
  },

  /**
   * Update vehicle
   */
  async updateVehicle(
    companyId: string,
    serviceId: string,
    vehicleId: string,
    data: Partial<VehicleFormData & { status: string }>
  ): Promise<void> {
    const docRef = doc(
      db,
      'b2b-vehicles',
      vehicleId
    );
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  /**
   * Update pre-inspection count
   */
  async updatePreInspectionCount(
    companyId: string,
    serviceId: string,
    vehicleId: string,
    count: number
  ): Promise<void> {
    const docRef = doc(
      db,
      'b2b-vehicles',
      vehicleId
    );
    await updateDoc(docRef, {
      preInspectionCount: count,
      updatedAt: Timestamp.now(),
    });
  },
};

// ============ PRE-INSPECTIONS ============

export const preInspectionsService = {
  /**
   * Fetch pre-inspections for a vehicle
   */
  async fetchPreInspections(
    companyId: string,
    serviceId: string,
    vehicleId: string
  ): Promise<B2BPreInspection[]> {
    const colRef = collection(
      db,
      'companies',
      companyId,
      'services',
      serviceId,
      'vehicles',
      vehicleId,
      'preInspections'
    );
    const queryRef = query(colRef, orderBy('inspectionDate', 'desc'));
    const snapshot = await getDocs(queryRef);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as B2BPreInspection)
    );
  },

  /**
   * Create pre-inspection
   */
  async createPreInspection(
    companyId: string,
    serviceId: string,
    vehicleId: string,
    data: PreInspectionFormData & { images: string[]; videos: string[] }
  ): Promise<{ id: string; inspection: B2BPreInspection }> {
    const docRef = doc(
      collection(
        db,
        'companies',
        companyId,
        'services',
        serviceId,
        'vehicles',
        vehicleId,
        'preInspections'
      )
    );

    const now = Timestamp.now();
    const inspection: B2BPreInspection = {
      id: docRef.id,
      vehicleId,
      inspectionDate: now,
      images: data.images.map((path: string) => ({
        name: path.split('/').pop() || 'image',
        path,
        uploadedAt: now,
      })),
      videos: data.videos.map((path: string) => ({
        name: path.split('/').pop() || 'video',
        path,
        uploadedAt: now,
      })),
      notes: data.notes,
      checklist: data.checklist,
      inspectionType: data.inspectionType,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, inspection);

    // Update vehicle pre-inspection count
    const vehicleDocRef = doc(
      db,
      'companies',
      companyId,
      'services',
      serviceId,
      'vehicles',
      vehicleId
    );
    const vehicleSnapshot = await getDoc(vehicleDocRef);
    if (vehicleSnapshot.exists()) {
      const currentCount = vehicleSnapshot.data().preInspectionCount || 0;
      await updateDoc(vehicleDocRef, {
        preInspectionCount: currentCount + 1,
        updatedAt: Timestamp.now(),
      });
    }

    return { id: docRef.id, inspection };
  },

  /**
   * Update pre-inspection
   */
  async updatePreInspection(
    companyId: string,
    serviceId: string,
    vehicleId: string,
    inspectionId: string,
    data: Partial<B2BPreInspection>
  ): Promise<void> {
    const docRef = doc(
      db,
      'companies',
      companyId,
      'services',
      serviceId,
      'vehicles',
      vehicleId,
      'preInspections',
      inspectionId
    );
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },
};

// ============ REFERRALS ============

export const referralsService = {
  /**
   * Fetch referrals for a service
   */
  async fetchReferrals(companyId: string, serviceId: string): Promise<B2BReferral[]> {
    const colRef = collection(db, 'companies', companyId, 'services', serviceId, 'referrals');
    const queryRef = query(colRef, orderBy('referralDate', 'desc'));
    const snapshot = await getDocs(queryRef);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as B2BReferral)
    );
  },

  /**
   * Add referral
   */
  async addReferral(
    companyId: string,
    serviceId: string,
    data: ReferralFormData
  ): Promise<{ id: string; referral: B2BReferral }> {
    const docRef = doc(
      collection(db, 'companies', companyId, 'services', serviceId, 'referrals')
    );

    const referral: B2BReferral = {
      id: docRef.id,
      serviceId,
      ...data,
      referralDate: Timestamp.fromDate(data.referralDate),
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(docRef, referral);
    return { id: docRef.id, referral };
  },

  /**
   * Update referral
   */
  async updateReferral(
    companyId: string,
    serviceId: string,
    referralId: string,
    data: Partial<ReferralFormData & { status: string }>
  ): Promise<void> {
    const docRef = doc(
      db,
      'companies',
      companyId,
      'services',
      serviceId,
      'referrals',
      referralId
    );
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  /**
   * Delete referral
   */
  async deleteReferral(companyId: string, serviceId: string, referralId: string): Promise<void> {
    const docRef = doc(
      db,
      'companies',
      companyId,
      'services',
      serviceId,
      'referrals',
      referralId
    );
    await deleteDoc(docRef);
  },
};

// ============ BATCH OPERATIONS ============

/**
 * Batch update service and its related totals
 * Use this when adding/deleting vehicles or referrals to recalculate totals
 */
export async function batchUpdateServiceTotals(
  companyId: string,
  serviceId: string,
  subtotal: number,
  referralTotal: number
) {
  const batch = writeBatch(db);
  const serviceDocRef = doc(db, 'b2b-services', serviceId);

  batch.update(serviceDocRef, {
    subtotal,
    referralTotal,
    totalAmount: subtotal + referralTotal,
    updatedAt: Timestamp.now(),
  });

  await batch.commit();
}
