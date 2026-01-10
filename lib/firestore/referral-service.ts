import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Referral, ReferralFormData } from '@/lib/types/referral.types';

/**
 * Service-related Firestore operations for Referrals
 * Supports both B2C (bookedServices) and B2B (b2bServices)
 */

/**
 * Fetch all referrals for a specific service
 * @param serviceId - The service ID (works for both B2C and B2B)
 * @returns Array of referrals
 */
export async function fetchReferralsByServiceId(serviceId: string): Promise<Referral[]> {
  try {
    const referralsRef = collection(db, 'services', serviceId, 'referrals');
    const q = query(referralsRef);
    const snapshot = await getDocs(q);

    const referrals: Referral[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Referral));

    // Sort by date descending (newest first)
    referrals.sort((a, b) => {
      const dateA = a.referralDate instanceof Date ? a.referralDate : (a.referralDate as any).toDate();
      const dateB = b.referralDate instanceof Date ? b.referralDate : (b.referralDate as any).toDate();
      return dateB.getTime() - dateA.getTime();
    });

    return referrals;
  } catch (error) {
    console.error('[fetchReferralsByServiceId] Error:', error);
    throw error;
  }
}

/**
 * Create a new referral for a service
 * @param serviceId - The service ID
 * @param data - Referral form data
 * @param userId - The user creating the referral
 * @returns The created referral ID
 */
export async function createReferral(
  serviceId: string,
  data: ReferralFormData,
  userId: string
): Promise<string> {
  try {
    const referralId = Date.now().toString();
    const referralRef = doc(db, 'services', serviceId, 'referrals', referralId);

    await setDoc(referralRef, {
      ...data,
      serviceId,
      referralDate: Timestamp.fromDate(data.referralDate),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: userId,
      referralType: 'b2c', // Default to B2C, can be overridden
    });

    console.log('[createReferral] Referral created:', referralId);
    return referralId;
  } catch (error) {
    console.error('[createReferral] Error:', error);
    throw error;
  }
}

/**
 * Update an existing referral
 * @param serviceId - The service ID
 * @param referralId - The referral ID
 * @param data - Partial referral data to update
 * @returns void
 */
export async function updateReferral(
  serviceId: string,
  referralId: string,
  data: Partial<ReferralFormData>
): Promise<void> {
  try {
    const referralRef = doc(db, 'services', serviceId, 'referrals', referralId);

    const updateData: any = { ...data };
    
    // Convert date to Timestamp if provided
    if (data.referralDate) {
      updateData.referralDate = Timestamp.fromDate(data.referralDate);
    }
    
    updateData.updatedAt = Timestamp.now();

    await updateDoc(referralRef, updateData);

    console.log('[updateReferral] Referral updated:', referralId);
  } catch (error) {
    console.error('[updateReferral] Error:', error);
    throw error;
  }
}

/**
 * Delete a referral
 * @param serviceId - The service ID
 * @param referralId - The referral ID
 * @returns void
 */
export async function deleteReferralDoc(
  serviceId: string,
  referralId: string
): Promise<void> {
  try {
    const referralRef = doc(db, 'services', serviceId, 'referrals', referralId);
    await deleteDoc(referralRef);
    console.log('[deleteReferralDoc] Referral deleted:', referralId);
  } catch (error) {
    console.error('[deleteReferralDoc] Error:', error);
    throw error;
  }
}

/**
 * Get all referrals for a specific person (for future use)
 * @param personName - The person's name
 * @param contact - The person's contact
 * @returns Array of referrals
 */
export async function fetchReferralsByPerson(personName: string, contact: string): Promise<Referral[]> {
  try {
    // This query will need to be done client-side as we can't query across subcollections
    // For now, returning empty array - needs implementation when required
    console.warn('[fetchReferralsByPerson] Cross-service queries not yet implemented');
    return [];
  } catch (error) {
    console.error('[fetchReferralsByPerson] Error:', error);
    throw error;
  }
}

/**
 * Calculate total commission for a service
 * @param serviceId - The service ID
 * @returns Total commission amount
 */
export async function getTotalCommissionForService(serviceId: string): Promise<number> {
  try {
    const referrals = await fetchReferralsByServiceId(serviceId);
    return referrals.reduce((sum, r) => sum + (r.commission || 0), 0);
  } catch (error) {
    console.error('[getTotalCommissionForService] Error:', error);
    throw error;
  }
}

/**
 * Get referral statistics for a service
 * @param serviceId - The service ID
 * @returns Statistics object
 */
export async function getReferralStatsForService(serviceId: string): Promise<{
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  totalCommission: number;
  completedCommission: number;
  pendingCommission: number;
}> {
  try {
    const referrals = await fetchReferralsByServiceId(serviceId);

    const stats = {
      total: referrals.length,
      completed: referrals.filter(r => r.status === 'completed').length,
      pending: referrals.filter(r => r.status === 'pending').length,
      cancelled: referrals.filter(r => r.status === 'cancelled').length,
      totalCommission: referrals.reduce((sum, r) => sum + (r.commission || 0), 0),
      completedCommission: referrals
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (r.commission || 0), 0),
      pendingCommission: referrals
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + (r.commission || 0), 0),
    };

    return stats;
  } catch (error) {
    console.error('[getReferralStatsForService] Error:', error);
    throw error;
  }
}
