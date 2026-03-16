interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: "default" | "warning" | "danger";
}

export function StatCard({ label, value, icon, variant = "default" }: StatCardProps) {
  const colors = {
    default: "bg-muted",
    warning: "bg-amber-50 border-amber-200",
    danger: "bg-red-50 border-red-200",
  };

  return (
    <div className={`rounded-lg border p-4 flex items-center gap-3 ${colors[variant]}`}>
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
