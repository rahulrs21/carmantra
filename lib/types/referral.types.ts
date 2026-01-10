import { Timestamp } from 'firebase/firestore';

/**
 * Generic Referral interface for both B2C and B2B services
 * Can be extended by specific implementations
 */
export interface Referral {
  id: string;
  serviceId: string;
  jobCardNo?: string; // Service Job Card Number for easy tracking
  personName: string;
  contact: string;
  commission: number;
  referralDate: Timestamp | Date;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  // Optional fields for future use
  referralType?: 'b2c' | 'b2b'; // Track which type it is
  referralSource?: string; // How/where the referral came from
  conversionStatus?: 'no' | 'yes'; // Whether it resulted in a service
}

/**
 * B2C Referral - Service-specific referral
 */
export interface B2CReferral extends Referral {
  referralType: 'b2c';
  customerId?: string;
}

/**
 * Form data for creating/updating referrals
 */
export interface ReferralFormData {
  personName: string;
  contact: string;
  commission: number;
  referralDate: Date;
  status?: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}
