import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface NotifCardProps {
  title: string;
  message: string;
  type: "order" | "stock" | "reservation" | "lens";
  createdAt: Date;
  isRead: boolean;
  actions?: React.ReactNode;
}

export function NotifCard({ title, message, type, createdAt, isRead, actions }: NotifCardProps) {
  return (
    <div className={`rounded-lg border p-4 transition-all duration-200 ${!isRead ? "border-blue-200 bg-blue-50/30 shadow-sm" : "hover:shadow-sm"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-semibold text-sm text-slate-900">{title}</p>
          <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{message}</p>
        </div>
        <Badge variant={isRead ? "outline" : "default"} className="shrink-0 capitalize">
          {type === "lens" ? "verre" : type}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between mt-3 gap-2">
        <p className="text-[11px] font-medium text-muted-foreground/70">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: fr })}
        </p>
      </div>

      {actions && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
