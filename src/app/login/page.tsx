'use client';

import dynamic from 'next/dynamic';
import { BrandLoader } from '@/components/ui/loader-brand';

const LoginClient = dynamic(
  () => import('./_components/login-client').then((mod) => mod.LoginClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <BrandLoader size="md" className="text-primary" />
      </div>
    ),
  }
);

export default function LoginPage() {
  return <LoginClient />;
}
