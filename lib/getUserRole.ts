import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { safeConsoleError } from './safeConsole';
import { FirebaseError } from 'firebase/app';

export async function getUserRole(uid: string): Promise<string | null> {
  try {
    // Try 'users' collection first
    let userSnapshot = await getDoc(doc(db, 'users', uid));
    
    // Fall back to 'user' collection if 'users' doesn't exist
    if (!userSnapshot.exists()) {
      userSnapshot = await getDoc(doc(db, 'user', uid));
    }
    
    if (!userSnapshot.exists()) {
      console.warn(`User document not found for uid: ${uid}`);
      return null;
    }
    
    const data = userSnapshot.data() as { role?: string };
    const role = data?.role || null;
    
    if (role) {
      console.log(`User role loaded: ${role} for uid: ${uid}`);
    } else {
      console.warn(`User document exists but has no role field for uid: ${uid}`);
    }
    
    return role;
  } catch (err: any) {
    safeConsoleError('getUserRole error', err);
    // If Firestore denies read access, rethrow so callers can explicitly
    // differentiate between "no doc" and a permission problem.
    if (err instanceof FirebaseError && err.code === 'permission-denied') {
      console.error('Permission denied when reading user role:', err);
      throw err; // propagate permission errors for the caller to handle
    }
    return null;
  }
}
