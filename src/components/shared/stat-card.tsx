import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
  href?: string;
}

const variantStyles = {
  default: { icon: "text-primary bg-primary/10", border: "" },
  success: { icon: "text-green-400 bg-green-500/10", border: "border-green-500/20" },
  warning: { icon: "text-yellow-400 bg-yellow-500/10", border: "border-yellow-500/20" },
  danger: { icon: "text-red-400 bg-red-500/10", border: "border-red-500/20" },
  info: { icon: "text-blue-400 bg-blue-500/10", border: "border-blue-500/20" },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
  href,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const trendUp = trend && trend.value > 0;
  const trendDown = trend && trend.value < 0;

  const inner = (
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs mt-2 font-medium",
                trendUp && "text-green-400",
                trendDown && "text-red-400",
                !trendUp && !trendDown && "text-muted-foreground"
              )}
            >
              {trendUp ? "↑" : trendDown ? "↓" : "→"}{" "}
              {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
          {href && (
            <p className="text-xs text-primary/60 mt-2">View details →</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl ml-4", styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className={cn(
          "hover:shadow-lg hover:border-primary/40 hover:shadow-primary/5 transition-all cursor-pointer",
          styles.border, className
        )}>
          {inner}
        </Card>
      </Link>
    );
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow", styles.border, className)}>
      {inner}
    </Card>
  );
}
