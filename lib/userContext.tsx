"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getUserRole } from './getUserRole';
import { UserRole } from './types';

interface UserContextType {
  user: User | null;
  role: UserRole | null;
  displayName: string | null;
  photoURL: string | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  role: null,
  displayName: null,
  photoURL: null,
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }
      
      if (firebaseUser) {
        try {
          const userRole = await getUserRole(firebaseUser.uid);
          setRole(userRole as UserRole);

          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeUserDoc = onSnapshot(userRef, (userDoc) => {
            if (userDoc.exists()) {
              setDisplayName(userDoc.data()?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User');
              setPhotoURL(userDoc.data()?.photoURL || firebaseUser.photoURL || null);
            } else {
              setDisplayName(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User');
              setPhotoURL(firebaseUser.photoURL || null);
            }
          });
        } catch (error) {
          setRole(null);
          setDisplayName(null);
          setPhotoURL(null);
        }
      } else {
        setRole(null);
        setDisplayName(null);
        setPhotoURL(null);
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, role, displayName, photoURL, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
