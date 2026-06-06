import { useState } from "react";
import {
  useListComplianceDocs, useCreateComplianceDoc, useDeleteComplianceDoc,
  useGetComplianceSummary, useListTrucks, useListDrivers,
} from "@workspace/api-client-react";
import type { ComplianceDocInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const DOC_TYPES = [
  "cross_border_permit", "road_worthy_certificate", "vehicle_licence",
  "driver_licence", "passport", "yellow_fever", "hazmat_cert", "insurance",
  "CVR", "Third Party Insurance", "Carbon Tax Clearance", "PrDP", "other",
];

function docStatusInfo(docStatus: string, daysUntilExpiry?: number | null) {
  if (docStatus === "expired") return { label: "Expired", color: "bg-red-500/15 text-red-400" };
  if (docStatus === "expiring" || (daysUntilExpiry != null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0)) {
    return { label: daysUntilExpiry != null ? `${daysUntilExpiry}d left` : "Expiring", color: "bg-amber-500/15 text-amber-400" };
  }
  return { label: "Valid", color: "bg-lime-500/15 text-lime-400" };
}

function DocForm({
  trucks,
  drivers,
  onSave,
  onCancel,
}: {
  trucks: { id: string; fleetNo: string }[];
  drivers: { id: string; name: string }[];
  onSave: (v: ComplianceDocInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ComplianceDocInput>({
    docType: "vehicle_licence",
    issueDate: "",
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    docNumber: "",
    country: "ZA",
    entityType: "truck",
    entityId: "",
  });
  const set = (k: keyof ComplianceDocInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">Add Compliance Document</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Document Type</span>
          <select value={form.docType} onChange={(e) => set("docType", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            {DOC_TYPES.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Entity Type</span>
          <select value={form.entityType} onChange={(e) => { set("entityType", e.target.value); set("entityId", ""); }}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            <option value="truck">Truck</option>
            <option value="driver">Driver</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{form.entityType === "truck" ? "Truck" : "Driver"}</span>
          <select value={form.entityId} onChange={(e) => set("entityId", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            <option value="">Select…</option>
            {form.entityType === "truck"
              ? trucks.map((t) => <option key={t.id} value={t.id}>{t.fleetNo}</option>)
              : drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Doc Number</span>
          <input type="text" value={form.docNumber ?? ""} onChange={(e) => set("docNumber", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Issue Date</span>
          <input type="date" value={form.issueDate ?? ""} onChange={(e) => set("issueDate", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Expiry Date *</span>
          <input type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Issuing Country</span>
          <input type="text" value={form.country ?? ""} onChange={(e) => set("country", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Issuer</span>
          <input type="text" value={form.issuer ?? ""} onChange={(e) => set("issuer", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded bg-secondary text-foreground hover:bg-secondary/70">Cancel</button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.entityId || !form.expiryDate}
          className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-40"
        >
          Add Document
        </button>
      </div>
    </div>
  );
}

export default function Compliance() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/compliance-docs"] });
  const { data: trucks } = useListTrucks();
  const { data: drivers } = useListDrivers();
  const [filter, setFilter] = useState<"all" | "truck" | "driver" | "expired" | "expiring">("all");

  const { data: docs, isLoading } = useListComplianceDocs(
    filter === "truck" ? { entityType: "truck" }
      : filter === "driver" ? { entityType: "driver" }
      : {}
  );
  const { data: summary } = useGetComplianceSummary();
  const create = useCreateComplianceDoc({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Document added" }); },
    },
  });
  const del = useDeleteComplianceDoc({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Document removed" }); },
    },
  });
  const [adding, setAdding] = useState(false);

  const truckMap = Object.fromEntries(trucks?.map((t) => [t.id, t.fleetNo]) ?? []);
  const driverMap = Object.fromEntries(drivers?.map((d) => [d.id, d.name]) ?? []);

  const filteredDocs = docs?.filter((d) => {
    if (filter === "expired") return d.docStatus === "expired";
    if (filter === "expiring") return d.docStatus === "expiring";
    return true;
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">Compliance Vault</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Permits, licences & certificates</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Document
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Valid", value: summary.valid, icon: ShieldCheck, accent: "lime" as const, filterKey: "all" as const },
            { label: "Expiring (30d)", value: summary.expiring, icon: AlertTriangle, accent: (summary.expiring > 0 ? "amber" : "default") as "amber" | "default", filterKey: "expiring" as const },
            { label: "Expired", value: summary.expired, icon: AlertTriangle, accent: (summary.expired > 0 ? "red" : "default") as "red" | "default", filterKey: "expired" as const },
            { label: "Blocked Trucks", value: summary.blockedTrucks.length, icon: ShieldCheck, accent: (summary.blockedTrucks.length > 0 ? "red" : "default") as "red" | "default", filterKey: "truck" as const },
          ].map(({ label, value, icon: Icon, accent, filterKey }) => (
            <button
              key={label}
              onClick={() => setFilter((f) => f === filterKey ? "all" : filterKey)}
              className={cn(
                "bg-card border rounded-lg p-3 flex items-center gap-3 text-left transition-colors",
                filter === filterKey ? "border-primary/50" : "border-border hover:border-border/80"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0",
                accent === "red" ? "text-red-400"
                  : accent === "amber" ? "text-amber-400"
                  : accent === "lime" ? "text-lime-400"
                  : "text-muted-foreground"
              )} />
              <div>
                <div className={cn("text-lg font-display font-semibold tabular-nums",
                  accent === "red" ? "text-red-400"
                    : accent === "amber" ? "text-amber-400"
                    : accent === "lime" ? "text-lime-400"
                    : "text-foreground"
                )}>{value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(["all", "truck", "driver", "expired", "expiring"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {adding && trucks && drivers && (
        <DocForm
          trucks={trucks}
          drivers={drivers}
          onSave={(v) => { create.mutate({ data: v }); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !filteredDocs?.length ? (
        <div className="bg-card border border-border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">
          {filter === "expired" ? "No expired documents." : filter === "expiring" ? "No documents expiring soon." : "No documents yet."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Type", "Entity", "Number", "Issue Date", "Expiry", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((d) => {
                const { label, color } = docStatusInfo(d.docStatus, d.daysUntilExpiry);
                const entityName = d.entityType === "truck"
                  ? truckMap[d.entityId] ?? d.entityId.slice(-6)
                  : driverMap[d.entityId] ?? d.entityId.slice(-6);
                return (
                  <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-xs capitalize">{d.docType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-foreground">{entityName}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{d.entityType}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{d.docNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.issueDate ? new Date(d.issueDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-xs">{new Date(d.expiryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap", color)}>{label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => del.mutate({ docId: d.id })} className="text-muted-foreground hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
