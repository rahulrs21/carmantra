import { useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Hook to manage user online/offline status in Firestore
 * Marks user as online when authenticated and offline on logout
 */
export function useOnlineStatus() {
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Clear any existing heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      if (currentUser?.uid) {
        // Mark user as online immediately
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            isOnline: true,
            lastLogin: Timestamp.now(),
          });
        } catch (error) {
          // User doc might not exist yet - silently fail
          console.debug('Could not update online status:', error);
        }

        // Set a heartbeat to keep user marked as online (every 30 seconds)
        heartbeatInterval = setInterval(() => {
          updateDoc(doc(db, 'users', currentUser.uid), {
            isOnline: true,
            lastActivityAt: Timestamp.now(),
          }).catch(() => {
            // Silently fail if document doesn't exist
          });
        }, 30000);
      } else {
        // User logged out - nothing to do here as the next block handles it
      }
    });

    // Cleanup: mark user as offline when component unmounts (on logout)
    return () => {
      unsubscribeAuth();
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      // Get current user and mark them as offline
      const currentUser = auth.currentUser;
      if (currentUser?.uid) {
        updateDoc(doc(db, 'users', currentUser.uid), {
          isOnline: false,
        }).catch(() => {
          // Silently fail
        });
      }
    };
  }, []);
}
