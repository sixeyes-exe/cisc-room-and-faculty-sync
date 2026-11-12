import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, icon, action, children, className }: { title?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-card", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {icon && <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground">{icon}</span>}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const tone: Record<string, string> = {
  approved: "bg-success/15 text-success border-success/30",
  published: "bg-success/15 text-success border-success/30",
  official: "bg-success/15 text-success border-success/30",
  resolved: "bg-success/15 text-success border-success/30",
  "returned / closed": "bg-success/15 text-success border-success/30",
  pending: "bg-warning/20 text-warning-foreground border-warning/40",
  proposed: "bg-warning/20 text-warning-foreground border-warning/40",
  "under review": "bg-warning/20 text-warning-foreground border-warning/40",
  "claim submitted": "bg-warning/20 text-warning-foreground border-warning/40",
  "in progress": "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};
const icons: Record<string, string> = { approved: "✓", published: "✓", official: "✓", resolved: "✓", rejected: "✕", cancelled: "✕", pending: "●", proposed: "●" };

export function StatusBadge({ status }: { status: string }) {
  const k = status.toLowerCase();
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", tone[k] ?? "bg-muted text-muted-foreground border-border")}>
      <span aria-hidden>{icons[k] ?? "○"}</span>
      {status}
    </span>
  );
}

export function CapacityBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min(100, (used / total) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={used} aria-valuemax={total} aria-label="Occupancy">
      <div className={cn("h-full rounded-full", pct >= 100 ? "bg-destructive" : pct > 70 ? "bg-warning" : "bg-green-brand")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
