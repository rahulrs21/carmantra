import { collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ActivityLogInput, ActivityLog } from '@/lib/types/activity.types';

export const activityService = {
  // Log an activity
  async logActivity(input: ActivityLogInput): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'activity_logs'), {
        companyId: input.companyId,
        activityType: input.activityType,
        description: input.description,
        userId: input.userId,
        userName: input.userName,
        userEmail: input.userEmail,
        userRole: input.userRole,
        timestamp: Timestamp.now(),
        metadata: input.metadata || {},
      });
      return docRef.id;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  },

  // Fetch activities for a company
  async fetchActivities(companyId: string): Promise<ActivityLog[]> {
    try {
      const q = query(
        collection(db, 'activity_logs'),
        where('companyId', '==', companyId)
      );
      
      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
        } as ActivityLog;
      });

      // Sort by timestamp in descending order (newest first)
      return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  },
};
