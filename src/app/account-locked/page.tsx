import { BrandLoader } from '@/components/ui/loader-brand';
import { Suspense } from 'react';
import { ShieldAlert } from 'lucide-react';
import Link from "next/link";

export const metadata = {
  title: "Account Locked | OptiManager",
};

export default function AccountLockedPage({
  searchParams,
}: {
  searchParams: { minutes?: string };
}) {
  return (
    <Suspense fallback={<BrandLoader size="lg" className="mx-auto my-12" />}>
      <LockedContent minutes={searchParams.minutes} />
    </Suspense>
  );
}

function LockedContent({ minutes }: { minutes?: string }) {
  const waitTime = minutes || "15";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <ShieldAlert className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Account Temporarily Locked
        </h1>

        <div className="mb-6 space-y-2 text-gray-600">
          <p>
           Too many failed attempts. For security reasons, your account has been locked.
          </p>
          <p className="font-medium text-red-600">
            Please try again in {waitTime} minutes.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-md bg-yellow-50 p-3 text-xs text-yellow-800">
            This event has been logged for security audit.
          </div>

          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            Return to Login
          </Link>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-gray-400">
        Security ID: {Math.random().toString(36).substring(7)}
      </p>
    </div>
  );
}
