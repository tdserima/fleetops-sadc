import { useState } from "react";
import {
  useListLoads, useCreateLoad, useDeleteLoad,
  useListTrucks, useAssignLoad, useDeliverLoad,
  useGenerateInvoice, useMarkInvoicePaid,
} from "@workspace/api-client-react";
import type { Load, LoadInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const CURRENCIES = ["USD", "ZAR", "ZWG", "ZMW", "MZN", "BWP"];

const STATUS_COLORS: Record<string, string> = {
  unassigned: "bg-muted text-muted-foreground",
  created: "bg-muted text-muted-foreground",
  assigned: "bg-cyan-500/15 text-cyan-400",
  en_route: "bg-lime-500/15 text-lime-400",
  at_border: "bg-amber-500/15 text-amber-400",
  in_transit: "bg-lime-500/15 text-lime-400",
  delivered: "bg-emerald-500/15 text-emerald-400",
  invoiced: "bg-violet-500/15 text-violet-400",
  paid: "bg-green-500/15 text-green-400",
  cancelled: "bg-red-500/15 text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  unassigned: "Unassigned",
  created: "Unassigned",
  assigned: "Assigned",
  en_route: "En Route",
  at_border: "At Border",
  in_transit: "In Transit",
  delivered: "Delivered",
  invoiced: "Invoiced",
  paid: "Paid",
  cancelled: "Cancelled",
};

function LoadForm({ onSave, onCancel }: { onSave: (v: LoadInput) => void; onCancel: () => void }) {
  const [form, setForm] = useState<LoadInput>({
    consignmentNo: "",
    customer: "",
    originCity: "",
    destCity: "",
    cargoDesc: "",
    cargoWeightKg: 20000,
    rate: 0,
    currency: "USD",
    pickupDate: new Date().toISOString().slice(0, 10),
  });
  const set = (k: keyof LoadInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">New Load</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {([
          ["Consignment No.", "consignmentNo", "text"],
          ["Customer", "customer", "text"],
          ["Origin City", "originCity", "text"],
          ["Dest City", "destCity", "text"],
          ["Cargo Description", "cargoDesc", "text"],
          ["Cargo Weight (kg)", "cargoWeightKg", "number"],
          ["Rate", "rate", "number"],
          ["Custom Ref", "customsRef", "text"],
          ["Pickup Date", "pickupDate", "date"],
        ] as [string, keyof LoadInput, string][]).map(([label, key, type]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <input
              type={type}
              value={String(form[key] ?? "")}
              onChange={(e) => set(key, type === "number" ? Number(e.target.value) : e.target.value)}
              className="h-8 px-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Currency</span>
          <select value={form.currency} onChange={(e) => set("currency", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded bg-secondary text-foreground hover:bg-secondary/70">Cancel</button>
        <button onClick={() => onSave(form)} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90">Create</button>
      </div>
    </div>
  );
}

function LoadActions({ load }: { load: Load }) {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/loads"] });
  const { data: trucks } = useListTrucks();
  const assign = useAssignLoad({ mutation: { onSuccess: () => { inv(); toast({ title: "Truck assigned" }); } } });
  const deliver = useDeliverLoad({ mutation: { onSuccess: () => { inv(); toast({ title: "Load delivered" }); } } });
  const genInv = useGenerateInvoice({ mutation: { onSuccess: (d) => { inv(); toast({ title: "Invoice generated", description: (d as any).invoiceNumber }); } } });
  const markPaid = useMarkInvoicePaid({ mutation: { onSuccess: () => { inv(); toast({ title: "Invoice marked paid" }); } } });
  const [open, setOpen] = useState(false);
  const [truckId, setTruckId] = useState("");

  const canAssign = load.status === "unassigned" || load.status === "created";
  const canDeliver = load.status === "assigned" || load.status === "en_route" || load.status === "at_border" || load.status === "in_transit";
  const canInvoice = load.status === "delivered" && (load as any).invoiceStatus !== "sent";
  const canMarkPaid = (load as any).invoiceStatus === "sent";

  if (load.status === "paid") return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border bg-background"
      >
        Actions <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg p-3 space-y-2 w-52 shadow-xl">
            {canAssign && (
              <>
                <select
                  value={truckId}
                  onChange={(e) => setTruckId(e.target.value)}
                  className="w-full h-7 px-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none"
                >
                  <option value="">Select truck…</option>
                  {trucks?.map((t) => <option key={t.id} value={t.id}>{t.fleetNo}</option>)}
                </select>
                <button
                  disabled={!truckId}
                  onClick={() => { assign.mutate({ loadId: load.id, data: { truckId } }); setOpen(false); }}
                  className="w-full py-1 text-xs rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-40"
                >
                  Assign Truck →
                </button>
              </>
            )}
            {canDeliver && (
              <button
                onClick={() => { deliver.mutate({ loadId: load.id, data: { podUrl: "manual", deliveredDate: new Date().toISOString().slice(0, 10), onTime: true } }); setOpen(false); }}
                className="w-full py-1 text-xs rounded bg-lime-500/20 text-lime-400 hover:bg-lime-500/30"
              >
                Mark Delivered ✓
              </button>
            )}
            {canInvoice && (
              <button
                onClick={() => { genInv.mutate({ loadId: load.id }); setOpen(false); }}
                className="w-full py-1 text-xs rounded bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
              >
                Generate Invoice
              </button>
            )}
            {canMarkPaid && (
              <button
                onClick={() => { markPaid.mutate({ loadId: load.id, data: { paidDate: new Date().toISOString().slice(0, 10) } }); setOpen(false); }}
                className="w-full py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                Mark Invoice Paid
              </button>
            )}
            {!canAssign && !canDeliver && !canInvoice && !canMarkPaid && (
              <div className="text-xs text-muted-foreground text-center py-1">No actions available</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Loads() {
  const qc = useQueryClient();
  const { data: loads, isLoading } = useListLoads({});
  const create = useCreateLoad({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/loads"] });
        toast({ title: "Load created" });
      },
    },
  });
  const del = useDeleteLoad({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/loads"] });
        toast({ title: "Load deleted" });
      },
    },
  });
  const [adding, setAdding] = useState(false);

  const summary = {
    unassigned: loads?.filter((l) => l.status === "unassigned" || l.status === "created").length ?? 0,
    active: loads?.filter((l) => ["assigned", "en_route", "at_border", "in_transit"].includes(l.status)).length ?? 0,
    delivered: loads?.filter((l) => l.status === "delivered").length ?? 0,
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">Loads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{loads?.length ?? 0} consignments</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> New Load
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Unassigned", value: summary.unassigned, color: "text-muted-foreground" },
          { label: "Active / In Transit", value: summary.active, color: "text-cyan-400" },
          { label: "Ready to Invoice", value: summary.delivered, color: "text-lime-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className={cn("text-2xl font-display font-semibold tabular-nums", color)}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {adding && (
        <LoadForm
          onSave={(v) => { create.mutate({ data: v }); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !loads?.length ? (
        <div className="bg-card border border-border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">No loads yet. Create your first consignment.</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Consignment", "Route", "Customer", "Weight", "Rate", "Truck", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loads.map((l) => (
                <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{l.consignmentNo}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{l.originCity} → {l.destCity}</td>
                  <td className="px-4 py-3 text-xs">{l.customer}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">{l.cargoWeightKg != null ? `${(l.cargoWeightKg / 1000).toFixed(1)}t` : "—"}</td>
                  <td className="px-4 py-3 text-xs tabular-nums font-mono">{l.rate != null ? `${l.currency} ${Number(l.rate).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{l.truckFleetNo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap", STATUS_COLORS[l.status] ?? "bg-muted text-muted-foreground")}>
                      {STATUS_LABELS[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <LoadActions load={l} />
                      {(l.status === "unassigned" || l.status === "created" || l.status === "cancelled") && (
                        <button onClick={() => del.mutate({ loadId: l.id })} className="text-muted-foreground hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
