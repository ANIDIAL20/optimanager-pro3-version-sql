'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // 1. ننتظر التحميل
    if (isUserLoading) return;

    // 2. التوجيه
    if (user) {
      router.replace('/dashboard'); // ✅ إلى الداشبورد
    } else {
      router.replace('/login'); // ❌ إلى تسجيل الدخول
    }
  }, [user, isUserLoading, router]);

  // شاشة بيضاء نظيفة أثناء التوجيه
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-50" />
    </div>
  );
}
