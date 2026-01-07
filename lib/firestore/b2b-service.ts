/**
 * B2B Booking Firestore Service - FIXED VERSION
 * Uses NESTED collection structure to match Firestore rules
 * Structure: companies/{companyId}/services/{serviceId}/vehicles/{vehicleId}
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
import { storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';
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
   * Fetch all companies with pagination
   */
  async fetchCompanies(pageSize = 20, lastDoc?: QueryDocumentSnapshot<DocumentData> | undefined) {
    try {
      let q: Query = collection(db, 'companies');
      let constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1),
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
      console.error('[companiesService] Error fetching companies:', error);
      throw error;
    }
  },

  /**
   * Fetch single company by ID
   */
  async fetchCompanyById(companyId: string): Promise<B2BCompany | null> {
    try {
      const docRef = doc(db, 'companies', companyId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as B2BCompany;
    } catch (error) {
      console.error('[companiesService] Error fetching company:', error);
      throw error;
    }
  },

  /**
   * Create new company
   */
  async createCompany(
    data: CompanyFormData,
    userId: string
  ): Promise<{ id: string; company: B2BCompany }> {
    try {
      const docRef = doc(collection(db, 'companies'));
      const now = Timestamp.now();
      const company: B2BCompany = {
        id: docRef.id,
        ...data,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        isActive: true,
      };

      console.log('[companiesService] Creating company:', { id: docRef.id, company });
      await setDoc(docRef, company);
      console.log('[companiesService] Company created successfully');
      
      return { id: docRef.id, company };
    } catch (error) {
      console.error('[companiesService] Error creating company:', error);
      throw error;
    }
  },

  /**
   * Update company
   */
  async updateCompany(
    companyId: string,
    data: Partial<CompanyFormData>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('[companiesService] Error updating company:', error);
      throw error;
    }
  },

  /**
   * Soft delete company
   */
  async deleteCompany(companyId: string): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('[companiesService] Error deleting company:', error);
      throw error;
    }
  },
};

// ============ SERVICES ============
// Path: companies/{companyId}/services/{serviceId}

export const servicesService = {
  /**
   * Fetch services for a company
   */
  async fetchServices(
    companyId: string,
    startDate?: Date,
    endDate?: Date,
    pageSize = 20,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ) {
    try {
      console.log('[servicesService] Fetching services for company:', companyId);

      // Reference to services subcollection
      const colRef = collection(db, 'companies', companyId, 'services');
      let constraints: QueryConstraint[] = [
        orderBy('serviceDate', 'desc'),
        limit(pageSize + 1),
      ];

      if (startDate && endDate) {
        constraints.push(where('serviceDate', '>=', Timestamp.fromDate(startDate)));
        constraints.push(where('serviceDate', '<=', Timestamp.fromDate(endDate)));
      }

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const queryRef = query(colRef, ...constraints);
      const snapshot = await getDocs(queryRef);
      const hasMore = snapshot.docs.length > pageSize;
      const docs = snapshot.docs.slice(0, pageSize);

      console.log('[servicesService] Found services:', docs.length);

      return {
        services: docs.map(
          (doc) =>
            ({
              id: doc.id,
              companyId,
              ...doc.data(),
            } as B2BService)
        ),
        hasMore,
        lastDoc: docs[docs.length - 1],
      };
    } catch (error) {
      console.error('[servicesService] Error fetching services:', error);
      throw error;
    }
  },

  /**
   * Fetch single service by ID
   */
  async fetchServiceById(companyId: string, serviceId: string): Promise<B2BService | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return {
        id: snapshot.id,
        companyId,
        ...snapshot.data(),
      } as B2BService;
    } catch (error) {
      console.error('[servicesService] Error fetching service:', error);
      throw error;
    }
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
      console.log('[servicesService] Creating service for company:', companyId);
      console.log('[servicesService] Service data:', data);
      console.log('[servicesService] User ID:', userId);

      // Validate inputs
      if (!companyId) throw new Error('companyId is required');
      if (!userId) throw new Error('userId is required');
      if (!data.title) throw new Error('Service title is required');
      if (!data.serviceDate) throw new Error('Service date is required');

      // Create reference to services subcollection
      const servicesColRef = collection(db, 'companies', companyId, 'services');
      const docRef = doc(servicesColRef);

      const now = Timestamp.now();
      const service: any = {
        id: docRef.id,
        title: data.title,
        type: data.type,
        jobCardNo: data.jobCardNo,
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
      }
      if (data.dateRangeEnd) {
        service.dateRangeEnd = Timestamp.fromDate(data.dateRangeEnd);
      }

      console.log('[servicesService] Saving to path:', `companies/${companyId}/services/${docRef.id}`);
      console.log('[servicesService] Service object:', service);

      await setDoc(docRef, service);

      console.log('[servicesService] Service created successfully');

      return { id: docRef.id, service };
    } catch (error) {
      console.error('[servicesService] Error creating service:', error);
      throw error;
    }
  },

  /**
   * Update service
   */
  async updateService(
    companyId: string,
    serviceId: string,
    data: Partial<B2BService>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId);
      const updateData: any = {
        ...data,
        updatedAt: Timestamp.now(),
      };
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('[servicesService] Error updating service:', error);
      throw error;
    }
  },

  /**
   * Update service status
   */
  async updateServiceStatus(
    companyId: string,
    serviceId: string,
    status: ServiceStatus
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId);
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('[servicesService] Error updating service status:', error);
      throw error;
    }
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
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId);
      await updateDoc(docRef, {
        subtotal,
        referralTotal,
        totalAmount: subtotal + referralTotal,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('[servicesService] Error recalculating totals:', error);
      throw error;
    }
  },
};

// ============ VEHICLES ============
// Path: companies/{companyId}/services/{serviceId}/vehicles/{vehicleId}

export const vehiclesService = {
  /**
   * Fetch vehicles for a service
   */
  async fetchVehicles(companyId: string, serviceId: string) {
    try {
      console.log('[vehiclesService] Fetching vehicles for service:', { companyId, serviceId });

      const colRef = collection(db, 'companies', companyId, 'services', serviceId, 'vehicles');
      const queryRef = query(colRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(queryRef);

      console.log('[vehiclesService] Found vehicles:', snapshot.docs.length);

      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            serviceId,
            ...doc.data(),
          } as B2BVehicle)
      );
    } catch (error) {
      console.error('[vehiclesService] Error fetching vehicles:', error);
      throw error;
    }
  },

  /**
   * Fetch single vehicle
   */
  async fetchVehicleById(
    companyId: string,
    serviceId: string,
    vehicleId: string
  ): Promise<B2BVehicle | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'vehicles', vehicleId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return {
        id: snapshot.id,
        serviceId,
        ...snapshot.data(),
      } as B2BVehicle;
    } catch (error) {
      console.error('[vehiclesService] Error fetching vehicle:', error);
      throw error;
    }
  },

  /**
   * Add vehicle to service
   */
  async addVehicle(
    companyId: string,
    serviceId: string,
    data: VehicleFormData,
    userId: string
  ): Promise<{ id: string; vehicle: B2BVehicle }> {
    try {
      console.log('[vehiclesService] Adding vehicle:', { companyId, serviceId, data });

      const vehiclesColRef = collection(db, 'companies', companyId, 'services', serviceId, 'vehicles');
      const docRef = doc(vehiclesColRef);

      const now = Timestamp.now();
      const vehicle: B2BVehicle = {
        id: docRef.id,
        serviceId,
        plateNumber: data.plateNumber,
        brand: data.brand,
        model: data.model,
        year: data.year,
        color: data.color,
        vin: data.vin,
        vehicleType: data.vehicleType,
        fuelType: data.fuelType,
        serviceCost: data.serviceCost,
        notes: data.notes,
        status: 'pending',
        preInspectionCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      console.log('[vehiclesService] Saving vehicle to path:', 
        `companies/${companyId}/services/${serviceId}/vehicles/${docRef.id}`);

      await setDoc(docRef, vehicle);

      console.log('[vehiclesService] Vehicle created successfully');

      return { id: docRef.id, vehicle };
    } catch (error) {
      console.error('[vehiclesService] Error adding vehicle:', error);
      throw error;
    }
  },

  /**
   * Update vehicle
   */
  async updateVehicle(
    companyId: string,
    serviceId: string,
    vehicleId: string,
    data: Partial<VehicleFormData>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'vehicles', vehicleId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('[vehiclesService] Error updating vehicle:', error);
      throw error;
    }
  },

  /**
   * Delete vehicle
   */
  async deleteVehicle(
    companyId: string,
    serviceId: string,
    vehicleId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'vehicles', vehicleId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('[vehiclesService] Error deleting vehicle:', error);
      throw error;
    }
  },
};

// ============ PRE-INSPECTIONS ============
// Path: companies/{companyId}/services/{serviceId}/vehicles/{vehicleId}/preInspections/{inspectionId}

export const preInspectionsService = {
  /**
   * Fetch pre-inspections for a vehicle
   */
  async fetchPreInspections(
    companyId: string,
    serviceId: string,
    vehicleId: string
  ) {
    try {
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
      const queryRef = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(queryRef);

      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            vehicleId,
            ...doc.data(),
          } as B2BPreInspection)
      );
    } catch (error) {
      console.error('[preInspectionsService] Error fetching pre-inspections:', error);
      throw error;
    }
  },

  /**
   * Create pre-inspection
   */
  async createPreInspection(
    companyId: string,
    serviceId: string,
    vehicleId: string,
    data: PreInspectionFormData,
    userId: string
  ): Promise<{ id: string; inspection: B2BPreInspection }> {
    try {
      console.log('[preInspectionsService] Creating pre-inspection:', { companyId, serviceId, vehicleId });

      const inspectionsColRef = collection(
        db,
        'companies',
        companyId,
        'services',
        serviceId,
        'vehicles',
        vehicleId,
        'preInspections'
      );
      const docRef = doc(inspectionsColRef);

      const now = Timestamp.now();

      // Convert image paths to MediaFile objects with download URLs
      const images = [];
      if (data.images && Array.isArray(data.images)) {
        for (const imagePath of data.images) {
          try {
            const imageRef = ref(storage, imagePath);
            const downloadUrl = await getDownloadURL(imageRef);
            const fileName = imagePath.split('/').pop() || 'image';
            images.push({
              name: fileName,
              path: downloadUrl,
              uploadedAt: now,
            });
            console.log('[preInspectionsService] Image processed:', fileName);
          } catch (error) {
            console.error('[preInspectionsService] Error getting download URL for image:', error);
          }
        }
      }

      // Convert video paths to MediaFile objects with download URLs
      const videos = [];
      if (data.videos && Array.isArray(data.videos)) {
        for (const videoPath of data.videos) {
          try {
            const videoRef = ref(storage, videoPath);
            const downloadUrl = await getDownloadURL(videoRef);
            const fileName = videoPath.split('/').pop() || 'video';
            videos.push({
              name: fileName,
              path: downloadUrl,
              uploadedAt: now,
            });
            console.log('[preInspectionsService] Video processed:', fileName);
          } catch (error) {
            console.error('[preInspectionsService] Error getting download URL for video:', error);
          }
        }
      }

      const inspection: B2BPreInspection = {
        id: docRef.id,
        vehicleId,
        inspectionDate: data.inspectionDate || now,
        images,
        videos,
        notes: data.notes,
        checklist: data.checklist || [],
        inspectionType: data.inspectionType || 'before',
        createdAt: now,
        updatedAt: now,
      };

      console.log('[preInspectionsService] Saving inspection with media:', {
        images: images.length,
        videos: videos.length,
      });

      await setDoc(docRef, inspection);
      
      console.log('[preInspectionsService] Pre-inspection created successfully');
      
      return { id: docRef.id, inspection };
    } catch (error) {
      console.error('[preInspectionsService] Error creating pre-inspection:', error);
      throw error;
    }
  },
};

// ============ REFERRALS ============
// Path: companies/{companyId}/services/{serviceId}/referrals/{referralId}

export const referralsService = {
  /**
   * Fetch referrals for a service
   */
  async fetchReferrals(companyId: string, serviceId: string) {
    try {
      const colRef = collection(db, 'companies', companyId, 'services', serviceId, 'referrals');
      const queryRef = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(queryRef);

      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            serviceId,
            ...doc.data(),
          } as B2BReferral)
      );
    } catch (error) {
      console.error('[referralsService] Error fetching referrals:', error);
      throw error;
    }
  },

  /**
   * Create referral
   */
  async createReferral(
    companyId: string,
    serviceId: string,
    data: ReferralFormData,
    userId: string
  ): Promise<{ id: string; referral: B2BReferral }> {
    try {
      console.log('[referralsService] Creating referral:', { companyId, serviceId, data, userId });

      const referralsColRef = collection(db, 'companies', companyId, 'services', serviceId, 'referrals');
      const docRef = doc(referralsColRef);

      const now = Timestamp.now();
      const referral: B2BReferral = {
        id: docRef.id,
        serviceId,
        personName: data.personName,
        contact: data.contact,
        commission: data.commission,
        referralDate: data.referralDate ? Timestamp.fromDate(data.referralDate) : now,
        notes: data.notes,
        status: (data.status as any) || 'pending',
        createdAt: now,
        updatedAt: now,
      };

      console.log('[referralsService] Saving referral to Firestore:', referral);
      
      await setDoc(docRef, referral);
      
      console.log('[referralsService] Referral created successfully with ID:', docRef.id);
      
      return { id: docRef.id, referral };
    } catch (error) {
      console.error('[referralsService] Error creating referral:', error);
      throw error;
    }
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
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'referrals', referralId);
      
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };

      if (data.personName !== undefined) updateData.personName = data.personName;
      if (data.contact !== undefined) updateData.contact = data.contact;
      if (data.commission !== undefined) updateData.commission = data.commission;
      if (data.referralDate !== undefined) updateData.referralDate = Timestamp.fromDate(data.referralDate);
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('[referralsService] Error updating referral:', error);
      throw error;
    }
  },

  /**
   * Delete referral
   */
  async deleteReferral(companyId: string, serviceId: string, referralId: string): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'referrals', referralId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('[referralsService] Error deleting referral:', error);
      throw error;
    }
  },
};

// ============ QUOTATIONS ============

export const quotationsService = {
  /**
   * Fetch quotations for a service
   */
  async fetchQuotations(companyId: string, serviceId: string) {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'services', serviceId, 'quotations'),
        orderBy('quotationDate', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
    } catch (error) {
      console.error('[quotationsService] Error fetching quotations:', error);
      throw error;
    }
  },

  /**
   * Fetch single quotation
   */
  async fetchQuotationById(companyId: string, serviceId: string, quotationId: string) {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'quotations', quotationId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as any;
    } catch (error) {
      console.error('[quotationsService] Error fetching quotation:', error);
      throw error;
    }
  },

  /**
   * Create quotation from selected services
   */
  async createQuotation(
    companyId: string,
    serviceIds: string[],
    company: B2BCompany,
    services: any[],
    userId: string,
    serviceTotals?: Record<string, number>
  ) {
    try {
      const now = Timestamp.now();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      // Generate quotation number
      const timestamp = Date.now().toString().slice(-6);
      const quotationNumber = `QT-${companyId.slice(0, 5).toUpperCase()}-${timestamp}`;

      // Collect vehicles and referrals from all selected services
      const allVehicles: any[] = [];
      const allReferrals: any[] = [];

      for (const serviceId of serviceIds) {
        const service = services.find((s) => s.id === serviceId);
        if (!service) continue;

        // Get the service date for matching with vehicles
        const serviceDate = service.serviceDate instanceof Date 
          ? service.serviceDate 
          : (service.serviceDate as any).toDate?.() || new Date();

        // Fetch vehicles for this service
        const vehiclesSnap = await getDocs(
          collection(db, 'companies', companyId, 'services', serviceId, 'vehicles')
        );
        vehiclesSnap.docs.forEach((doc) => {
          const vehicle = doc.data() as B2BVehicle;
          allVehicles.push({
            serviceId,
            serviceTitle: service.title, // Include service title for each vehicle
            plateNumber: vehicle.plateNumber,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            serviceAmount: vehicle.serviceCost,
            services: vehicle.services, // Include services array for cost calculation in UI
            jobCardNo: service.jobCardNo, // Assign jobCardNo from the service to each vehicle
            serviceDate: serviceDate, // Include service date for matching
          });
        });

        // Fetch referrals for this service
        const referralsSnap = await getDocs(
          collection(db, 'companies', companyId, 'services', serviceId, 'referrals')
        );
        referralsSnap.docs.forEach((doc) => {
          const referral = doc.data() as B2BReferral;
          allReferrals.push({
            serviceId,
            personName: referral.personName,
            contact: referral.contact,
            commission: referral.commission,
          });
        });
      }

      // Calculate totals - use passed serviceTotals if available, otherwise calculate from vehicles
      let subtotal = 0;
      if (serviceTotals && Object.keys(serviceTotals).length > 0) {
        // Use the passed service totals (sum of all vehicle service amounts per service)
        subtotal = Object.values(serviceTotals).reduce((sum, total) => sum + total, 0);
      } else {
        // Fallback to calculating from vehicles - use services array like the UI does
        subtotal = allVehicles.reduce((sum, v) => {
          const vehicleTotal = v.services?.reduce((s: number, svc: any) => s + (svc.amount || 0), 0) || v.serviceAmount || 0;
          return sum + vehicleTotal;
        }, 0);
      }
      
      const referralTotal = allReferrals.reduce((sum, r) => sum + r.commission, 0);
      const totalAmount = subtotal + referralTotal;

      const quotation = {
        quotationNumber,
        quotationDate: now,
        validUntil: Timestamp.fromDate(validUntil),
        companyName: company.name,
        contactPerson: company.contactPerson,
        phone: company.phone,
        email: company.email,
        serviceTitle: services.filter((s) => serviceIds.includes(s.id)).map((s) => s.title).join(', '),
        serviceIds,
        jobCardNo: services.find((s) => serviceIds.includes(s.id))?.jobCardNo || null,
        vehicles: allVehicles,
        referrals: allReferrals,
        subtotal,
        referralTotal,
        totalAmount,
        status: 'draft' as const,
        notes: '',
        generatedAt: now,
        generatedBy: userId,
      };

      // Store in the first service
      const firstServiceId = serviceIds[0];
      const docRef = doc(collection(db, 'companies', companyId, 'services', firstServiceId, 'quotations'));
      await setDoc(docRef, quotation);

      return { id: docRef.id, ...quotation };
    } catch (error) {
      console.error('[quotationsService] Error creating quotation:', error);
      throw error;
    }
  },

  /**
   * Update quotation
   */
  async updateQuotation(
    companyId: string,
    serviceId: string,
    quotationId: string,
    data: Partial<any>
  ) {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'quotations', quotationId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
      return { id: quotationId };
    } catch (error) {
      console.error('[quotationsService] Error updating quotation:', error);
      throw error;
    }
  },

  /**
   * Delete quotation
   */
  async deleteQuotation(companyId: string, serviceId: string, quotationId: string) {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'quotations', quotationId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('[quotationsService] Error deleting quotation:', error);
      throw error;
    }
  },
};

// ============ INVOICES ============

export const invoicesService = {
  /**
   * Fetch invoices for a service
   */
  async fetchInvoices(companyId: string, serviceId: string) {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'services', serviceId, 'invoices'),
        orderBy('invoiceDate', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
    } catch (error) {
      console.error('[invoicesService] Error fetching invoices:', error);
      throw error;
    }
  },

  /**
   * Fetch single invoice
   */
  async fetchInvoiceById(companyId: string, serviceId: string, invoiceId: string) {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'invoices', invoiceId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as any;
    } catch (error) {
      console.error('[invoicesService] Error fetching invoice:', error);
      throw error;
    }
  },

  /**
   * Create invoice from quotation
   */
  async createInvoice(
    companyId: string,
    serviceId: string,
    quotation: any,
    userId: string
  ) {
    try {
      const now = Timestamp.now();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Generate invoice number
      const timestamp = Date.now().toString().slice(-6);
      const invoiceNumber = `INV-${companyId.slice(0, 5).toUpperCase()}-${timestamp}`;

      const invoice = {
        invoiceNumber,
        invoiceDate: now,
        dueDate: Timestamp.fromDate(dueDate),
        companyName: quotation.companyName,
        contactPerson: quotation.contactPerson,
        phone: quotation.phone,
        email: quotation.email,
        serviceTitle: quotation.serviceTitle,
        serviceIds: quotation.serviceIds,
        vehicles: quotation.vehicles,
        referrals: quotation.referrals,
        subtotal: quotation.subtotal,
        referralTotal: quotation.referralTotal,
        totalAmount: quotation.totalAmount,
        tax: quotation.tax || 0,
        discount: quotation.discount || 0,
        status: 'draft' as const,
        notes: quotation.notes,
        generatedAt: now,
        generatedBy: userId,
      };

      const docRef = doc(collection(db, 'companies', companyId, 'services', serviceId, 'invoices'));
      await setDoc(docRef, invoice);

      return { id: docRef.id, ...invoice };
    } catch (error) {
      console.error('[invoicesService] Error creating invoice:', error);
      throw error;
    }
  },

  /**
   * Update invoice
   */
  async updateInvoice(
    companyId: string,
    serviceId: string,
    invoiceId: string,
    data: Partial<any>
  ) {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'invoices', invoiceId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
      return { id: invoiceId };
    } catch (error) {
      console.error('[invoicesService] Error updating invoice:', error);
      throw error;
    }
  },

  /**
   * Delete invoice
   */
  async deleteInvoice(companyId: string, serviceId: string, invoiceId: string) {
    try {
      const docRef = doc(db, 'companies', companyId, 'services', serviceId, 'invoices', invoiceId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('[invoicesService] Error deleting invoice:', error);
      throw error;
    }
  },
};

// ============ BATCH OPERATIONS ============

export async function batchUpdateServiceTotals(
  companyId: string,
  serviceId: string,
  subtotal: number,
  referralTotal: number
) {
  try {
    const batch = writeBatch(db);
    const serviceDocRef = doc(db, 'companies', companyId, 'services', serviceId);

    batch.update(serviceDocRef, {
      subtotal,
      referralTotal,
      totalAmount: subtotal + referralTotal,
      updatedAt: Timestamp.now(),
    });

    await batch.commit();
    console.log('[batchUpdateServiceTotals] Batch update completed');
  } catch (error) {
    console.error('[batchUpdateServiceTotals] Error:', error);
    throw error;
  }
}
