import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { safeConsoleError } from './safeConsole';
import { FirebaseError } from 'firebase/app';

export async function getUserRole(uid: string): Promise<string | null> {
  try {
    let userSnapshot = await getDoc(doc(db, 'users', uid));
    if (!userSnapshot.exists()) {
      userSnapshot = await getDoc(doc(db, 'user', uid));
    }
    if (!userSnapshot.exists()) return null;
    const data = userSnapshot.data() as { role?: string };
    return data?.role || null;
  } catch (err: any) {
    safeConsoleError('getUserRole error', err);
    // If Firestore denies read access, rethrow so callers can explicitly
    // differentiate between "no doc" and a permission problem.
    if (err instanceof FirebaseError && err.code === 'permission-denied') {
      throw err; // propagate permission errors for the caller to handle
    }
    return null;
  }
}
