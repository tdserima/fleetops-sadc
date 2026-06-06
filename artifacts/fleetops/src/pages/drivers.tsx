import { useState } from "react";
import { useListDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver } from "@workspace/api-client-react";
import type { Driver, DriverInput, DriverUpdate } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

function DriverForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<DriverInput>;
  onSave: (v: DriverInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<DriverInput>({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    nationality: initial?.nationality ?? "ZA",
    passportNo: initial?.passportNo ?? "",
    status: initial?.status ?? "active",
  });
  const set = (k: keyof DriverInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">{initial?.name ? "Edit Driver" : "Add Driver"}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {([
          ["Full Name", "name"],
          ["Phone", "phone"],
          ["Passport No.", "passportNo"],
          ["Nationality", "nationality"],
        ] as [string, keyof DriverInput][]).map(([label, key]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <input type="text" value={String(form[key] ?? "")} onChange={(e) => set(key, e.target.value)}
              className="h-8 px-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <select value={form.status ?? "active"} onChange={(e) => set("status", e.target.value)}
            className="h-8 px-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded bg-secondary text-foreground hover:bg-secondary/70">Cancel</button>
        <button onClick={() => onSave(form)} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90">Save</button>
      </div>
    </div>
  );
}

export default function Drivers() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/drivers"] });
  const { data: drivers, isLoading } = useListDrivers();
  const create = useCreateDriver({ mutation: { onSuccess: inv } });
  const del = useDeleteDriver({ mutation: { onSuccess: inv } });
  const upd = useUpdateDriver({ mutation: { onSuccess: inv } });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">Drivers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{drivers?.length ?? 0} drivers registered</p>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Add Driver
        </button>
      </div>

      {adding && <DriverForm onSave={(v) => { create.mutate({ data: v }); setAdding(false); }} onCancel={() => setAdding(false)} />}
      {editing && (
        <DriverForm
          initial={{ name: editing.name, phone: editing.phone ?? "", nationality: editing.nationality ?? "", passportNo: editing.passportNo ?? "", status: editing.status }}
          onSave={(v) => { upd.mutate({ driverId: editing.id, data: v as DriverUpdate }); setEditing(null); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !drivers?.length ? (
        <div className="bg-card border border-border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">No drivers yet.</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Name", "Nationality", "Passport No.", "Phone", "Loads Done", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground text-sm">{d.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d.nationality ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.passportNo ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">{d.loadsCompleted}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                      d.status === "active" ? "bg-lime-500/15 text-lime-400" : "bg-muted text-muted-foreground")}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => { setEditing(d); setAdding(false); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del.mutate({ driverId: d.id })} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
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
