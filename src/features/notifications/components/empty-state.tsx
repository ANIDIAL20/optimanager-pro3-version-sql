import { BellOff } from "lucide-react";

export function EmptyState({ message = "Aucune notification" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] w-full gap-3 text-muted-foreground">
      <BellOff className="h-10 w-10 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
