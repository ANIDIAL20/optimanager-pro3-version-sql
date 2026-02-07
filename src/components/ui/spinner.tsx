import { BrandLoader } from "@/components/ui/loader-brand";

interface SpinnerProps {
  className?: string; // Additional classes
  size?: "sm" | "md" | "lg" | "xl"; // Compatible sizes
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
  // Map 'sm' to 'sm' (or 'xs' if needed for very small spots)
  // BrandLoader supports: xs, sm, md, lg, xl
  return (
    <BrandLoader 
        size={size} 
        className={className} 
        overlay={false} 
    />
  );
}
