import { useState } from "react";
import {
  useListTrips, useCreateTrip, useUpdateTrip, useDeleteTrip,
  useListLoads, useListTrucks, useListDrivers,
  useGetTripCostSheet,
} from "@workspace/api-client-react";
import type { Trip, TripInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  planned: "bg-muted text-muted-foreground",
  active: "bg-cyan-500/15 text-cyan-400",
  completed: "bg-lime-500/15 text-lime-400",
  cancelled: "bg-red-500/15 text-red-400",
};

const STATUS_ADVANCE: Record<string, string> = {
  draft: "planned",
  planned: "active",
  active: "completed",
};

const STATUS_ADVANCE_LABEL: Record<string, string> = {
  draft: "→ Planned",
  planned: "→ Active",
  active: "→ Complete",
};

function TripForm({ onSave, onCancel }: { onSave: (v: TripInput) => void; onCancel: () => void }) {
  const { data: loads } = useListLoads({ status: "assigned" });
  const { data: trucks } = useListTrucks();
  const { data: drivers } = useListDrivers();
  const [form, setForm] = useState<TripInput>({
    name: "",
    truckId: "",
    driverId: "",
    tripDate: new Date().toISOString().slice(0, 10),
    advanceCurrency: "USD",
    advanceTotal: 0,
    loadIds: [],
  });
  const set = (k: keyof TripInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">New Trip</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 col-span-2 md:col-span-1">
          <span className="text-xs text-muted-foreground">Trip Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. JHB–HRE 2026-06"
            className="h-8 px-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Truck</span>
          <select value={form.truckId ?? ""} onChange={(e) => set("truckId", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            <option value="">Select truck…</option>
            {trucks?.filter((t) => t.status === "active" || t.status === "idle").map((t) => (
              <option key={t.id} value={t.id}>{t.fleetNo}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Driver</span>
          <select value={form.driverId ?? ""} onChange={(e) => set("driverId", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            <option value="">Select driver…</option>
            {drivers?.filter((d) => d.status === "active" || d.status === "available").map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Trip Date</span>
          <input type="date" value={form.tripDate ?? ""} onChange={(e) => set("tripDate", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Advance Total</span>
          <input type="number" value={form.advanceTotal ?? ""} onChange={(e) => set("advanceTotal", Number(e.target.value))}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Advance Currency</span>
          <select value={form.advanceCurrency ?? "USD"} onChange={(e) => set("advanceCurrency", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            {["USD", "ZAR", "ZWG", "ZMW"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>
      {loads && loads.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground">Link Assigned Loads (optional)</span>
          <div className="mt-1 space-y-1 max-h-28 overflow-y-auto">
            {loads.map((l) => (
              <label key={l.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={(form.loadIds ?? []).includes(l.id)}
                  onChange={(e) => {
                    const ids = form.loadIds ?? [];
                    set("loadIds", e.target.checked ? [...ids, l.id] : ids.filter((id) => id !== l.id));
                  }}
                />
                {l.consignmentNo} — {l.originCity} → {l.destCity}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded bg-secondary text-foreground hover:bg-secondary/70">Cancel</button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name.trim()}
          className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-40"
        >
          Create Trip
        </button>
      </div>
    </div>
  );
}

function CostSheetPanel({ tripId }: { tripId: string }) {
  const { data: cs, isLoading } = useGetTripCostSheet(tripId);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={7} className="px-6 py-4 bg-secondary/20">
          <div className="flex justify-center"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        </td>
      </tr>
    );
  }
  if (!cs) return null;

  const fmt = (n?: number | null, currency?: string | null) =>
    n != null ? `${currency ?? cs.baseCurrency ?? ""} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—";

  const marginPositive = cs.netMargin >= 0;

  return (
    <tr>
      <td colSpan={7} className="px-0 bg-secondary/10">
        <div className="px-6 py-4 space-y-4 border-b border-border/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Cost Sheet</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border/50 rounded p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Advance</div>
              <div className="text-sm font-display font-semibold tabular-nums text-foreground mt-0.5">
                {fmt(cs.advanceTotal, cs.advanceCurrency)}
              </div>
            </div>
            <div className="bg-card border border-border/50 rounded p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Disbursements</div>
              <div className="text-sm font-display font-semibold tabular-nums text-amber-400 mt-0.5">
                {fmt(cs.totalDisbursements)}
              </div>
            </div>
            <div className="bg-card border border-border/50 rounded p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Advance Balance</div>
              <div className={cn("text-sm font-display font-semibold tabular-nums mt-0.5", cs.advanceBalance >= 0 ? "text-lime-400" : "text-red-400")}>
                {fmt(cs.advanceBalance)}
              </div>
            </div>
            <div className="bg-card border border-border/50 rounded p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                Net Margin
                {marginPositive
                  ? <TrendingUp className="w-3 h-3 text-lime-400" />
                  : <TrendingDown className="w-3 h-3 text-red-400" />}
              </div>
              <div className={cn("text-sm font-display font-semibold tabular-nums mt-0.5", marginPositive ? "text-lime-400" : "text-red-400")}>
                {fmt(cs.netMargin)}
              </div>
            </div>
          </div>

          {cs.disbursementsByBorder && cs.disbursementsByBorder.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Disbursements by Border</div>
              <div className="space-y-1">
                {cs.disbursementsByBorder.map((group, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-xs font-medium text-foreground">{group.borderPost ?? "Other"}</span>
                    <span className="text-xs font-mono tabular-nums text-amber-400">{fmt(group.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(cs.fuelCost != null || cs.borderCost != null) && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              {cs.fuelCost != null && <span>Fuel: <span className="text-foreground">{fmt(cs.fuelCost)}</span></span>}
              {cs.borderCost != null && <span>Border: <span className="text-foreground">{fmt(cs.borderCost)}</span></span>}
              {cs.otherCost != null && <span>Other: <span className="text-foreground">{fmt(cs.otherCost)}</span></span>}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function TripRow({ t, onAdvance, onDelete }: { t: Trip; onAdvance: (t: Trip) => void; onDelete: (t: Trip) => void }) {
  const [expanded, setExpanded] = useState(false);
  const canAdvance = !!STATUS_ADVANCE[t.status];
  const canDelete = t.status === "draft" || t.status === "planned";

  return (
    <>
      <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 font-semibold text-sm text-foreground hover:text-primary transition-colors"
          >
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            }
            {t.name}
          </button>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{t.truckFleetNo ?? "—"}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{t.driverName ?? "—"}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{t.tripDate ? new Date(t.tripDate).toLocaleDateString() : "—"}</td>
        <td className="px-4 py-3 text-xs font-mono tabular-nums">
          {t.advanceTotal != null ? `${t.advanceCurrency ?? "USD"} ${Number(t.advanceTotal).toLocaleString()}` : "—"}
        </td>
        <td className="px-4 py-3">
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide", STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground")}>
            {t.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            {canAdvance && (
              <button
                onClick={() => onAdvance(t)}
                className="px-2 py-0.5 text-[10px] rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 whitespace-nowrap"
              >
                {STATUS_ADVANCE_LABEL[t.status]}
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(t)} className="text-muted-foreground hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && <CostSheetPanel tripId={t.id} />}
    </>
  );
}

export default function Trips() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/trips"] });
  const { data: trips, isLoading } = useListTrips({});
  const create = useCreateTrip({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Trip created" }); },
    },
  });
  const upd = useUpdateTrip({ mutation: { onSuccess: inv } });
  const del = useDeleteTrip({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Trip deleted" }); },
    },
  });
  const [adding, setAdding] = useState(false);

  const advance = (t: Trip) => {
    const next = STATUS_ADVANCE[t.status];
    if (next) {
      upd.mutate({ tripId: t.id, data: { status: next } });
      toast({ title: `Trip moved to ${next}` });
    }
  };

  const counts = {
    active: trips?.filter((t) => t.status === "active").length ?? 0,
    planned: trips?.filter((t) => t.status === "planned").length ?? 0,
    completed: trips?.filter((t) => t.status === "completed").length ?? 0,
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">Trips</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{trips?.length ?? 0} trips — click a row to view cost sheet</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> New Trip
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active", value: counts.active, color: "text-cyan-400" },
          { label: "Planned", value: counts.planned, color: "text-muted-foreground" },
          { label: "Completed", value: counts.completed, color: "text-lime-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className={cn("text-2xl font-display font-semibold tabular-nums", color)}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {adding && (
        <TripForm
          onSave={(v) => { create.mutate({ data: v }); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !trips?.length ? (
        <div className="bg-card border border-border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">No trips yet. Create your first trip.</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Name", "Truck", "Driver", "Date", "Advance", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <TripRow key={t.id} t={t} onAdvance={advance} onDelete={(t) => del.mutate({ tripId: t.id })} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
