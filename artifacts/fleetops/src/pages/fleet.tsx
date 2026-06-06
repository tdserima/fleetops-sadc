import { useState } from "react";
import { useListTrucks, useCreateTruck, useDeleteTruck, useUpdateTruck } from "@workspace/api-client-react";
import type { Truck, TruckInput, TruckUpdate } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const VEHICLE_TYPES = ["truck_tractor_horse", "superlink", "semi", "flatbed", "tanker", "reefer", "tipper", "lowbed", "rigid"];
const GVM_CLASSES = ["class1_lt3500", "class2_gt20t", "class_1", "class_2", "class_3", "class_4", "class_5"];
const COUNTRIES = ["ZAF", "ZWE", "ZMB", "MOZ", "BWA", "NAM", "TZA", "MWI", "AGO", "COD"];

const STATUS_COLOR: Record<string, string> = {
  active: "bg-lime-500/15 text-lime-400",
  idle: "bg-muted text-muted-foreground",
  en_route: "bg-cyan-500/15 text-cyan-400",
  at_border: "bg-amber-500/15 text-amber-400",
  maintenance: "bg-red-500/15 text-red-400",
  inactive: "bg-muted text-muted-foreground",
};

const BORDER_STATUS_COLOR: Record<string, string> = {
  ready: "text-lime-400",
  expiring: "text-amber-400",
  blocked: "text-red-400",
};

function TruckForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<TruckInput>;
  onSave: (v: TruckInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TruckInput>({
    fleetNo: initial?.fleetNo ?? "",
    registrationNo: initial?.registrationNo ?? "",
    registrationCountry: initial?.registrationCountry ?? "ZAF",
    vehicleType: initial?.vehicleType ?? "truck_tractor_horse",
    gvmClass: initial?.gvmClass ?? "class2_gt20t",
    status: initial?.status ?? "idle",
    avgConsumptionLPer100km: initial?.avgConsumptionLPer100km ?? 38,
  });
  const set = (k: keyof TruckInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">{initial?.fleetNo ? "Edit Truck" : "Add Truck"}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {([
          ["Fleet No.", "fleetNo", "text"],
          ["Reg. No.", "registrationNo", "text"],
          ["Avg Consumption (L/100km)", "avgConsumptionLPer100km", "number"],
        ] as [string, keyof TruckInput, string][]).map(([label, key, type]) => (
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
          <span className="text-xs text-muted-foreground">Reg. Country</span>
          <select value={form.registrationCountry ?? "ZAF"} onChange={(e) => set("registrationCountry", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none">
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Vehicle Type</span>
          <select value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none">
            {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">GVM Class</span>
          <select value={form.gvmClass} onChange={(e) => set("gvmClass", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none">
            {GVM_CLASSES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <select value={form.status ?? "idle"} onChange={(e) => set("status", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none">
            <option value="idle">Idle</option>
            <option value="active">Active</option>
            <option value="en_route">En Route</option>
            <option value="at_border">At Border</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded bg-secondary text-foreground hover:bg-secondary/70">Cancel</button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.fleetNo.trim() || !form.registrationNo.trim()}
          className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 font-semibold disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function Fleet() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/trucks"] });
  const { data: trucks, isLoading } = useListTrucks();
  const create = useCreateTruck({
    mutation: {
      onSuccess: (t) => { inv(); toast({ title: "Truck added", description: t.fleetNo }); },
    },
  });
  const del = useDeleteTruck({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Truck removed" }); },
    },
  });
  const upd = useUpdateTruck({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Truck updated" }); },
    },
  });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Truck | null>(null);

  const counts = {
    active: trucks?.filter((t) => t.status === "en_route" || t.status === "at_border" || t.status === "active").length ?? 0,
    idle: trucks?.filter((t) => t.status === "idle").length ?? 0,
    maintenance: trucks?.filter((t) => t.status === "maintenance").length ?? 0,
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">Fleet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{trucks?.length ?? 0} trucks registered</p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditing(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Truck
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active / En Route", value: counts.active, color: "text-cyan-400" },
          { label: "Idle", value: counts.idle, color: "text-muted-foreground" },
          { label: "In Maintenance", value: counts.maintenance, color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className={cn("text-2xl font-display font-semibold tabular-nums", color)}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {adding && (
        <TruckForm
          onSave={(v) => { create.mutate({ data: v }); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      )}
      {editing && (
        <TruckForm
          initial={{
            fleetNo: editing.fleetNo,
            registrationNo: editing.registrationNo,
            registrationCountry: editing.registrationCountry ?? "ZAF",
            vehicleType: editing.vehicleType,
            gvmClass: editing.gvmClass,
            status: editing.status,
            avgConsumptionLPer100km: editing.avgConsumptionLPer100km,
          }}
          onSave={(v) => { upd.mutate({ truckId: editing.id, data: v as TruckUpdate }); setEditing(null); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !trucks?.length ? (
        <div className="bg-card border border-border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">No trucks yet. Add your first truck.</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Fleet No.", "Reg. No.", "Type", "GVM", "Country", "Driver", "Status", "Border", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trucks.map((t) => (
                <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{t.fleetNo}</td>
                  <td className="px-4 py-3 text-xs font-mono">{t.registrationNo}</td>
                  <td className="px-4 py-3 text-xs">{t.vehicleType}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.gvmClass}</td>
                  <td className="px-4 py-3 text-xs font-mono">{t.registrationCountry ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.driverName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap", STATUS_COLOR[t.status] ?? "bg-muted text-muted-foreground")}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-semibold capitalize", BORDER_STATUS_COLOR[(t as any).borderReadyStatus ?? "ready"])}>
                      {(t as any).borderReadyStatus ?? "ready"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => { setEditing(t); setAdding(false); }} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => del.mutate({ truckId: t.id })} className="text-muted-foreground hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
