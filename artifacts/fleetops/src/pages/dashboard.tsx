import { useGetDashboardKpis, useGetArSummary, useGetComplianceSummary, useListTrips } from "@workspace/api-client-react";
import { AlertTriangle, Truck, TrendingUp, Shield, DollarSign, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "cyan" | "lime" | "amber" | "red" | "default";
  icon?: React.ElementType;
}) {
  const colors = {
    cyan: "text-cyan-400",
    lime: "text-lime-400",
    amber: "text-amber-400",
    red: "text-red-400",
    default: "text-foreground",
  };
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        {Icon && <Icon className={cn("w-4 h-4", colors[accent ?? "default"])} />}
      </div>
      <div className={cn("text-2xl font-display font-semibold tabular-nums", colors[accent ?? "default"])}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function TripStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    planned: { label: "Planned", cls: "bg-muted text-muted-foreground" },
    active: { label: "Active", cls: "bg-cyan-500/15 text-cyan-400" },
    completed: { label: "Completed", cls: "bg-lime-500/15 text-lime-400" },
    cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-400" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide", cls)}>
      {label}
    </span>
  );
}

export default function Dashboard() {
  const { data: kpis, isLoading: kpiLoading } = useGetDashboardKpis();
  const { data: ar } = useGetArSummary();
  const { data: compliance } = useGetComplianceSummary();
  const { data: trips } = useListTrips({});

  if (kpiLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fmt = (n?: number | null, prefix = "") =>
    n != null ? `${prefix}${n.toLocaleString()}` : "—";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-display font-semibold text-foreground">Command Centre</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Live fleet overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard label="Active Trucks" value={fmt(kpis?.activeTrucks)} icon={Truck} accent="cyan" />
        <KpiCard label="Loads En Route" value={fmt(kpis?.loadsEnRoute)} icon={TrendingUp} accent="lime" />
        <KpiCard label="Unassigned Loads" value={fmt(kpis?.unassignedLoads)} icon={Package} accent={kpis?.unassignedLoads ? "amber" : "default"} />
        <KpiCard label="Docs Expiring" value={fmt(kpis?.docsExpiringSoon)} icon={Shield} accent={kpis?.docsExpiringSoon ? "red" : "default"} />
        <KpiCard label="A/R Outstanding" value={fmt(ar?.outstandingByBase, "$")} icon={DollarSign} accent="amber" sub={`${ar?.overdue ?? 0} overdue`} />
        <KpiCard label="Fleet Utilisation" value={kpis?.fleetUtilisation != null ? `${kpis.fleetUtilisation}%` : "—"} icon={Truck} accent="default" />
        <KpiCard label="Ready to Invoice" value={fmt(kpis?.readyToInvoice)} icon={DollarSign} accent="lime" />
        <KpiCard label="Blocked Trucks" value={fmt(kpis?.trucksBlocked)} icon={Clock} accent={kpis?.trucksBlocked ? "red" : "default"} />
      </div>

      {compliance && compliance.expired > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div className="text-sm text-red-300">
            <span className="font-semibold">{compliance.expired} compliance document{compliance.expired > 1 ? "s" : ""}</span>{" "}
            expired. Review the Compliance vault immediately.
          </div>
        </div>
      )}

      {kpis?.exceptions && kpis.exceptions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Exceptions</h2>
          <div className="space-y-1">
            {kpis.exceptions.map((ex, i) => (
              <div key={i} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300">{ex.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Recent Trips</h2>
        {!trips?.length ? (
          <div className="bg-card border border-border rounded-lg px-4 py-10 text-center text-sm text-muted-foreground">
            No trips yet. Create your first trip.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Trip</th>
                  <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">Truck</th>
                  <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-sm text-foreground">{t.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{t.truckFleetNo ?? "—"}</td>
                    <td className="px-4 py-3"><TripStatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">
                      {t.tripDate ? new Date(t.tripDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
