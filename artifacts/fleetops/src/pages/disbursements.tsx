import { useState } from "react";
import {
  useListDisbursements, useCreateDisbursement, useDeleteDisbursement,
  useListTrips,
} from "@workspace/api-client-react";
import type { DisbursementInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

const CHARGE_TYPES = ["toll", "border_fee", "fuel_advance", "accommodation", "parking", "carbon_tax", "road_access", "other"];
const CURRENCIES = ["USD", "ZAR", "ZWG", "ZMW", "MZN", "BWP", "NAD", "TZS"];
const PAID_BY = ["driver", "company", "third_party"];

function DisbForm({ tripId, onSave, onCancel }: { tripId: string; onSave: (v: DisbursementInput) => void; onCancel: () => void }) {
  const [form, setForm] = useState<DisbursementInput>({
    date: new Date().toISOString().slice(0, 10),
    country: "ZA",
    chargeType: "toll",
    amount: 0,
    currency: "USD",
    paidBy: "driver",
    borderPost: "",
    notes: "",
  });
  const set = (k: keyof DisbursementInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">New Disbursement</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Charge Type</span>
          <select value={form.chargeType} onChange={(e) => set("chargeType", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            {CHARGE_TYPES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Currency</span>
          <select value={form.currency} onChange={(e) => set("currency", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Paid By</span>
          <select value={form.paidBy} onChange={(e) => set("paidBy", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            {PAID_BY.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Amount</span>
          <input type="number" value={form.amount} onChange={(e) => set("amount", Number(e.target.value))}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Country</span>
          <input type="text" value={form.country} onChange={(e) => set("country", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Date</span>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Border Post</span>
          <input type="text" value={form.borderPost ?? ""} onChange={(e) => set("borderPost", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Notes</span>
          <input type="text" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded bg-secondary text-foreground hover:bg-secondary/70">Cancel</button>
        <button onClick={() => onSave(form)} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90">Record</button>
      </div>
    </div>
  );
}

function TripDisbursements({ tripId }: { tripId: string }) {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ["/api/trips", tripId, "disbursements"] });
  };
  const { data: disbs, isLoading } = useListDisbursements(tripId);
  const create = useCreateDisbursement({ mutation: { onSuccess: inv } });
  const del = useDeleteDisbursement({ mutation: { onSuccess: inv } });
  const [adding, setAdding] = useState(false);

  const total = disbs?.reduce((s, d) => s + Number(d.amount), 0) ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {disbs?.length ?? 0} record{disbs?.length !== 1 ? "s" : ""} · Total: {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Record
        </button>
      </div>

      {adding && (
        <DisbForm
          tripId={tripId}
          onSave={(v) => { create.mutate({ tripId, data: v }); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !disbs?.length ? (
        <div className="bg-card border border-border rounded-lg px-4 py-10 text-center text-sm text-muted-foreground">No disbursements for this trip yet.</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Type", "Country", "Border Post", "Currency", "Amount", "Paid By", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {disbs.map((d) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs capitalize">{d.chargeType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs font-mono">{d.country}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d.borderPost ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono">{d.currency}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums">{Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-xs capitalize">{d.paidBy}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del.mutate({ tripId, disbursementId: d.id })} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
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

export default function Disbursements() {
  const { data: trips } = useListTrips({});
  const [selectedTripId, setSelectedTripId] = useState("");
  const activeTripId = selectedTripId || trips?.[0]?.id || "";

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-display font-semibold">Cash Loop</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Trip disbursements & border charges</p>
      </div>

      {!trips?.length ? (
        <div className="bg-card border border-border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">
          No trips yet. Create a trip first, then record disbursements against it.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground shrink-0">Trip:</label>
            <select value={activeTripId} onChange={(e) => setSelectedTripId(e.target.value)}
              className="h-8 px-2 bg-card border border-border rounded text-xs text-foreground focus:outline-none">
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
              ))}
            </select>
          </div>

          {activeTripId && <TripDisbursements tripId={activeTripId} />}
        </>
      )}
    </div>
  );
}
