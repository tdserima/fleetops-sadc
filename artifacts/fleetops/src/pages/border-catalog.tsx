import { useState } from "react";
import {
  useListBorderCharges, useCreateBorderCharge, useUpdateBorderCharge, useDeleteBorderCharge,
} from "@workspace/api-client-react";
import type { BorderCharge, BorderChargeInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";

const COUNTRIES = ["ZA", "ZW", "ZM", "MZ", "BW", "NA", "TZ", "MW", "AO", "CD"];
const CHARGE_TYPES = ["toll", "border_fee", "carbon_tax", "road_access", "bridge_levy", "permit", "third_party_insurance", "other"];
const CURRENCIES = ["USD", "ZAR", "ZWG", "ZMW", "MZN", "BWP", "NAD", "TZS"];

function ChargeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<BorderChargeInput>;
  onSave: (v: BorderChargeInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<BorderChargeInput>({
    country: initial?.country ?? "ZW",
    borderPost: initial?.borderPost ?? "",
    chargeType: initial?.chargeType ?? "border_fee",
    defaultAmount: initial?.defaultAmount ?? 0,
    currency: initial?.currency ?? "USD",
    appliesTo: initial?.appliesTo ?? "all",
  });
  const set = (k: keyof BorderChargeInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">{initial?.borderPost ? "Edit Charge" : "Add Border Charge"}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Country</span>
          <select value={form.country} onChange={(e) => set("country", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none">
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Border Post</span>
          <input type="text" value={form.borderPost} onChange={(e) => set("borderPost", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
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
          <span className="text-xs text-muted-foreground">Default Amount</span>
          <input type="number" value={form.defaultAmount} onChange={(e) => set("defaultAmount", Number(e.target.value))}
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Applies To</span>
          <input type="text" value={form.appliesTo} onChange={(e) => set("appliesTo", e.target.value)} placeholder="all / semi / rigid"
            className="h-8 px-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded bg-secondary text-foreground hover:bg-secondary/70">Cancel</button>
        <button onClick={() => onSave(form)} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90">Save</button>
      </div>
    </div>
  );
}

export default function BorderCatalog() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/border-charges"] });
  const { data: charges, isLoading } = useListBorderCharges({});
  const create = useCreateBorderCharge({ mutation: { onSuccess: inv } });
  const upd = useUpdateBorderCharge({ mutation: { onSuccess: inv } });
  const del = useDeleteBorderCharge({ mutation: { onSuccess: inv } });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<BorderCharge | null>(null);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">Border Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">SADC border post charges reference</p>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Add Charge
        </button>
      </div>

      {adding && <ChargeForm onSave={(v) => { create.mutate({ data: v }); setAdding(false); }} onCancel={() => setAdding(false)} />}
      {editing && (
        <ChargeForm
          initial={editing}
          onSave={(v) => { upd.mutate({ chargeId: editing.id, data: { defaultAmount: v.defaultAmount, currency: v.currency, appliesTo: v.appliesTo } }); setEditing(null); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !charges?.length ? (
        <div className="bg-card border border-border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">No border charges yet. Add reference data for your corridors.</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Country", "Border Post", "Type", "Currency", "Default Amt", "Applies To", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono">{c.country}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{c.borderPost}</td>
                  <td className="px-4 py-3 text-xs capitalize">{c.chargeType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs font-mono">{c.currency}</td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums">{Number(c.defaultAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.appliesTo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => { setEditing(c); setAdding(false); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del.mutate({ chargeId: c.id })} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
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
