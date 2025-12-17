"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getUserRole } from './getUserRole';
import { UserRole } from './types';

interface UserContextType {
  user: User | null;
  role: UserRole | null;
  displayName: string | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  role: null,
  displayName: null,
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userRole = await getUserRole(firebaseUser.uid);
          setRole(userRole as UserRole);
          
          // Fetch display name from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setDisplayName(userDoc.data()?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User');
          } else {
            setDisplayName(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User');
          }
        } catch (error) {
          setRole(null);
          setDisplayName(null);
        }
      } else {
        setRole(null);
        setDisplayName(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, role, displayName, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
