import { useState } from "react";
import { useListFuelPurchases, useCreateFuelPurchase, useDeleteFuelPurchase, useListTrucks } from "@workspace/api-client-react";
import type { FuelPurchaseInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

const COUNTRIES = ["ZA", "ZW", "ZM", "MZ", "BW", "NA", "TZ", "MW", "AO", "CD"];
const CURRENCIES = ["ZAR", "ZWG", "ZMW", "MZN", "BWP", "NAD", "TZS", "USD"];

function FuelForm({ onSave, onCancel }: { onSave: (v: FuelPurchaseInput) => void; onCancel: () => void }) {
  const { data: trucks } = useListTrucks();
  const [form, setForm] = useState<FuelPurchaseInput>({
    truckId: "",
    date: new Date().toISOString().slice(0, 10),
    country: "ZA",
    litres: 0,
    pricePerLitre: 0,
    currency: "ZAR",
  });
  const set = (k: keyof FuelPurchaseInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">Record Fuel Purchase</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Truck</span>
          <select value={form.truckId} onChange={(e) => set("truckId", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            <option value="">Select truck…</option>
            {trucks?.map((t) => <option key={t.id} value={t.id}>{t.fleetNo}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Country</span>
          <select value={form.country} onChange={(e) => set("country", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Currency</span>
          <select value={form.currency} onChange={(e) => set("currency", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        {([
          ["Litres", "litres", "number"],
          ["Price / Litre", "pricePerLitre", "number"],
          ["Date", "date", "date"],
        ] as [string, keyof FuelPurchaseInput, string][]).map(([label, key, type]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <input type={type} value={String(form[key] ?? "")} onChange={(e) => set(key, type === "number" ? Number(e.target.value) : e.target.value)}
              className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
          </label>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded bg-secondary text-foreground hover:bg-secondary/70">Cancel</button>
        <button onClick={() => onSave(form)} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90">Record</button>
      </div>
    </div>
  );
}

export default function Fuel() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/fuel-purchases"] });
  const { data: purchases, isLoading } = useListFuelPurchases({});
  const create = useCreateFuelPurchase({ mutation: { onSuccess: inv } });
  const del = useDeleteFuelPurchase({ mutation: { onSuccess: inv } });
  const [adding, setAdding] = useState(false);

  const totalL = purchases?.reduce((s, p) => s + Number(p.litres), 0) ?? 0;
  const totalCost = purchases?.reduce((s, p) => s + Number(p.total), 0) ?? 0;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">Fuel Purchases</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Cross-border fuel tracking</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Record
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Litres</div>
          <div className="text-2xl font-display font-semibold tabular-nums text-cyan-400">{totalL.toLocaleString()}L</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost (local)</div>
          <div className="text-2xl font-display font-semibold tabular-nums text-amber-400">{totalCost.toLocaleString()}</div>
        </div>
      </div>

      {adding && <FuelForm onSave={(v) => { create.mutate({ data: v }); setAdding(false); }} onCancel={() => setAdding(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !purchases?.length ? (
        <div className="bg-card border border-border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">No fuel purchases yet.</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Truck", "Country", "Litres", "Price/L", "Currency", "Total", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs font-mono text-primary">{p.truckFleetNo ?? p.truckId.slice(-8)}</td>
                  <td className="px-4 py-3 text-xs font-mono">{p.country}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums">{Number(p.litres).toLocaleString()}L</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums">{Number(p.pricePerLitre).toFixed(3)}</td>
                  <td className="px-4 py-3 text-xs font-mono">{p.currency}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums">{Number(p.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del.mutate({ purchaseId: p.id })} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
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
