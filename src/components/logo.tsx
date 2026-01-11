import { Glasses } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Glasses className="size-7 text-primary" />
      <h1 className="font-headline text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">
        OptiManager Pro
      </h1>
    </div>
  );
}
