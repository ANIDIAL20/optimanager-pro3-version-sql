'use client';

import { createContext, useContext, useEffect, useState, useMemo, DependencyList } from 'react';
import { User, onAuthStateChanged, Auth } from 'firebase/auth';
import { auth, db, app } from '@/lib/firebase';
import { doc, onSnapshot, Firestore } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';

// تعريف نوع البيانات (User Context Only) - as requested by user
interface UserContextType {
  user: User | null;
  userData: any | null; // بيانات إضافية للمستخدم (اختياري)
  isUserLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  userData: null,
  isUserLoading: true,
});

export const useUser = () => useContext(UserContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    // 1. الاستماع لتغييرات حالة الدخول (Auth)
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // (اختياري) جلب بيانات إضافية للمستخدم من /users/{uid} فقط إذا كنت تستعملها
        // لاحظ أننا نستخدم المسار الآمن: users/uid
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          setUserData(doc.data());
          setIsUserLoading(false);
        }, (error) => {
          console.log("Info: Pas de profil utilisateur supplémentaire (c'est normal au début)");
          setIsUserLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setUserData(null);
        setIsUserLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <UserContext.Provider value={{ user, userData, isUserLoading }}>
      {children}
    </UserContext.Provider>
  );
}

// Hooks for backward compatibility
export const useAuth = (): Auth => auth;
export const useFirestore = (): Firestore => db;
export const useFirebaseApp = (): FirebaseApp => app;

// Keep useMemoFirebase helper
type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);

  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;

  return memoized;
}

// Deprecated hook, mapping to new useUser or keeping partial functionality if needed
export const useFirebase = () => {
  const { user, isUserLoading, userData } = useUser();
  return {
    firebaseApp: app,
    auth: auth,
    firestore: db,
    user,
    isUserLoading,
    userError: null, // Removed error state from simplified context
  }
};