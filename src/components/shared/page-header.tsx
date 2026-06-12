import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, backHref, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3 py-4", className)}>
      {backHref && (
        <Button variant="ghost" size="icon-sm" asChild className="shrink-0">
          <Link href={backHref} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
