'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    if (!isMounted) return null;
    return initializeFirebase();
  }, [isMounted]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
}