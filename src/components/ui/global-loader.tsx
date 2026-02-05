"use client";

import { BrandLoader } from "@/components/ui/loader-brand";

interface GlobalLoaderProps {
  className?: string;
}

export function GlobalLoader({ className }: GlobalLoaderProps) {
  return <BrandLoader overlay size="lg" className={className} />;
}
