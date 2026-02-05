import { cn } from "@/lib/utils";

interface BrandLoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  overlay?: boolean; // If true, centers on screen with backdrop
}

export function BrandLoader({ size = "md", className, overlay = false }: BrandLoaderProps) {
  // Size Configurations
  const sizeClasses = {
    xs: {
      ring: "h-4 w-4 border-2",
      logo: "hidden", // Too small for logo
      container: "h-4 w-4"
    },
    sm: {
      ring: "h-6 w-6 border-2",
      logo: "h-4 w-4 text-[8px]",
      container: "h-6 w-6"
    },
    md: {
      ring: "h-10 w-10 border-3",
      logo: "h-8 w-8 text-xs",
      container: "h-10 w-10"
    },
    lg: {
      ring: "h-16 w-16 border-4",
      logo: "h-12 w-12 text-base",
      container: "h-16 w-16"
    },
    xl: {
        ring: "h-24 w-24 border-[5px]",
        logo: "h-20 w-20 text-xl",
        container: "h-24 w-24"
    }
  };

  const { ring, logo, container } = sizeClasses[size];

  const LoaderContent = (
    <div className={cn("relative flex items-center justify-center", container, !overlay && className)}>
      {/* Spinning Ring */}
      <div className={cn(
        "absolute animate-spin rounded-full border-primary/30 border-t-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]",
        ring
      )}></div>
      
      {/* Pulsing Center Logo */}
      <div className={cn(
        "flex animate-pulse items-center justify-center rounded-full bg-background/80 font-bold text-primary shadow-inner backdrop-blur-md",
        logo
      )}>
        OM
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-background/50 backdrop-blur-sm",
        className
      )}>
        {LoaderContent}
      </div>
    );
  }

  return LoaderContent;
}
