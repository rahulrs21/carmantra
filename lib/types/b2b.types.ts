import { Timestamp } from 'firebase/firestore';

/**
 * B2B Company - Top level entity
 */
export interface B2BCompany {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  trn?: string;
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
  notes?: string;
  isActive: boolean;
}

/**
 * B2B Service - Services performed for a company
 */
export type ServiceStatus = 'pending' | 'completed' | 'cancelled';

export interface B2BService {
  id: string;
  companyId: string;
  title: string;
  type: string; // 'car-wash', 'detailing', 'ppf', etc.
  status: ServiceStatus;
  serviceDate: Timestamp | Date;
  dateRangeStart?: Timestamp | Date;
  dateRangeEnd?: Timestamp | Date;
  totalAmount: number;
  subtotal: number; // Sum of vehicle costs
  referralTotal: number; // Sum of referral commissions
  notes?: string;
  quotationId?: string;
  invoiceId?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
}

/**
 * B2B Vehicle - Vehicles involved in a service
 */
export type VehicleStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface B2BVehicle {
  id: string;
  serviceId: string;
  plateNumber: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  vehicleType?: string;
  fuelType?: string;
  notes?: string;
  serviceCost: number;
  status: VehicleStatus;
  services?: Array<{
    id: string;
    description: string;
    amount: number;
  }>;
  preInspectionCount: number;
  referralLinked?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Pre-Inspection - Vehicle inspection records with media
 */
export type InspectionType = 'before' | 'after' | 'followup';
export type ChecklistItemStatus = 'ok' | 'issue' | 'pending';

export interface MediaFile {
  name: string;
  path: string;
  uploadedAt: Timestamp | Date;
  size?: number;
  mimeType?: string;
}

export interface ChecklistItem {
  item: string;
  status: ChecklistItemStatus;
  remark?: string;
}

export interface B2BPreInspection {
  id: string;
  vehicleId: string;
  inspectionDate: Timestamp | Date;
  images: MediaFile[];
  videos: MediaFile[];
  notes: string;
  checklist: ChecklistItem[];
  inspectionType?: InspectionType;
  inspectedBy?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Referral - Commission tracking
 */
export interface B2BReferral {
  id: string;
  serviceId: string;
  personName: string;
  contact: string;
  commission: number;
  referralDate: Timestamp | Date;
  notes?: string;
  status: ServiceStatus;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Quotation - Generated from service & vehicles
 */
export interface B2BQuotation {
  id: string;
  serviceId: string;
  companyId: string;
  quotationNumber: string;
  quotationDate: Timestamp | Date;
  validUntil: Timestamp | Date;
  
  // Company info snapshot
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  
  // Service info
  serviceTitle: string;
  serviceDate: Timestamp | Date;
  
  // Vehicle details
  vehicles: Array<{
    plateNumber: string;
    brand: string;
    model: string;
    year?: number;
    serviceCost: number;
  }>;
  
  // Amounts
  subtotal: number;
  referralTotal: number;
  totalAmount: number;
  tax?: number;
  discount?: number;
  
  // Metadata
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes?: string;
  generatedAt: Timestamp | Date;
  generatedBy: string;
}

/**
 * Invoice - Generated from service & vehicles
 */
export interface B2BInvoice {
  id: string;
  serviceId: string;
  companyId: string;
  invoiceNumber: string;
  invoiceDate: Timestamp | Date;
  dueDate: Timestamp | Date;
  
  // Company info snapshot
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  
  // Service info
  serviceTitle: string;
  serviceDate: Timestamp | Date;
  
  // Vehicle details
  vehicles: Array<{
    plateNumber: string;
    brand: string;
    model: string;
    year?: number;
    serviceCost: number;
  }>;
  
  // Line items (if referrals)
  referrals: Array<{
    personName: string;
    commission: number;
  }>;
  
  // Amounts
  subtotal: number;
  referralTotal: number;
  totalAmount: number;
  tax?: number;
  discount?: number;
  
  // Payment
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paidAmount?: number;
  paidDate?: Timestamp | Date;
  paymentMethod?: string;
  
  // Metadata
  notes?: string;
  generatedAt: Timestamp | Date;
  generatedBy: string;
}

/**
 * Combined view for service detail with all related data
 */
export interface B2BServiceDetail extends B2BService {
  company?: B2BCompany;
  vehicles: B2BVehicle[];
  referrals: B2BReferral[];
}

/**
 * Combined view for company with service summary
 */
export interface B2BCompanyWithServices extends B2BCompany {
  serviceCount: number;
  totalRevenue: number;
  lastServiceDate?: Timestamp | Date;
}

/**
 * Form submission types
 */
export interface CompanyFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

export interface ServiceFormData {
  title: string;
  type: string;
  serviceDate: Date;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  notes?: string;
}

export interface VehicleFormData {
  plateNumber: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  vehicleType?: string;
  fuelType?: string;
  serviceCost: number;
  notes?: string;
  services?: Array<{
    id: string;
    description: string;
    amount: number;
  }>;
}

export interface PreInspectionFormData {
  inspectionType?: InspectionType;
  inspectionDate?: Timestamp | Date;
  notes: string;
  checklist: ChecklistItem[];
  images?: string[]; // Storage paths, not File objects
  videos?: string[]; // Storage paths, not File objects
}

export interface ReferralFormData {
  personName: string;
  contact: string;
  commission: number;
  referralDate: Date;
  status?: string;
  notes?: string;
}
