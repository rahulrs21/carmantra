import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Referral } from '@/lib/types/referral.types';

/**
 * Hook to fetch and manage referrals for a service
 * Works for both B2C and B2B services
 */
export function useReferrals(serviceId: string | undefined) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!serviceId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Query referrals subcollection for this service
      const referralsRef = collection(db, 'services', serviceId, 'referrals');
      const q = query(referralsRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const referralsData: Referral[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as Referral));

          // Sort by date descending (newest first)
          referralsData.sort((a, b) => {
            const dateA = a.referralDate instanceof Date ? a.referralDate : (a.referralDate as any).toDate();
            const dateB = b.referralDate instanceof Date ? b.referralDate : (b.referralDate as any).toDate();
            return dateB.getTime() - dateA.getTime();
          });

          setReferrals(referralsData);
          setIsLoading(false);
        },
        (err) => {
          console.error('[useReferrals] Error fetching referrals:', err);
          setError(err as Error);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('[useReferrals] Error setting up listener:', err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [serviceId]);

  const deleteReferral = async (referralId: string) => {
    if (!serviceId) throw new Error('Service ID is required');
    
    try {
      const referralRef = doc(db, 'services', serviceId, 'referrals', referralId);
      await deleteDoc(referralRef);
      console.log('[useReferrals] Referral deleted successfully:', referralId);
    } catch (err) {
      console.error('[useReferrals] Error deleting referral:', err);
      throw err;
    }
  };

  return {
    referrals,
    isLoading,
    error,
    deleteReferral,
  };
}
