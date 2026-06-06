import { useState } from "react";
import { useListFxRates, useUpsertFxRate } from "@workspace/api-client-react";
import type { FxRateInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Save } from "lucide-react";

const SADC_CURRENCIES = ["ZAR", "ZWG", "ZMW", "MZN", "BWP", "NAD", "TZS", "MWK", "AOA", "CDF"];

export default function FxRates() {
  const qc = useQueryClient();
  const { data: rates, isLoading, refetch } = useListFxRates();
  const upsert = useUpsertFxRate({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/fx-rates"] }) } });
  const [editing, setEditing] = useState<Record<string, string>>({});

  const getRate = (currency: string) => rates?.find((r) => r.currency === currency);

  const save = (currency: string) => {
    const val = editing[currency];
    if (!val) return;
    const payload: FxRateInput = {
      currency,
      rateToBase: Number(val),
      asOf: new Date().toISOString().slice(0, 10),
    };
    upsert.mutate({ data: payload });
    setEditing((e) => { const n = { ...e }; delete n[currency]; return n; });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold">FX Rates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rate-to-base (USD) for SADC currencies — click any row to edit
          </p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary text-foreground rounded hover:bg-secondary/70">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Currency", "Rate to Base (USD)", "As Of", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SADC_CURRENCIES.map((currency) => {
                const rate = getRate(currency);
                const inEdit = currency in editing;
                return (
                  <tr key={currency} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-primary font-semibold">{currency}/USD</td>
                    <td className="px-4 py-3 font-mono text-sm tabular-nums">
                      {inEdit ? (
                        <input
                          type="number"
                          step="0.00001"
                          value={editing[currency]}
                          onChange={(e) => setEditing((ed) => ({ ...ed, [currency]: e.target.value }))}
                          className="w-32 h-7 px-2 bg-background border border-primary rounded text-xs focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary"
                          onClick={() => setEditing((ed) => ({ ...ed, [currency]: String(rate?.rateToBase ?? "") }))}
                        >
                          {rate?.rateToBase != null ? Number(rate.rateToBase).toFixed(5) : <span className="text-muted-foreground">—</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {rate?.asOf ? new Date(rate.asOf).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inEdit ? (
                        <button onClick={() => save(currency)} className="flex items-center gap-1 ml-auto text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90">
                          <Save className="w-3 h-3" /> Save
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditing((ed) => ({ ...ed, [currency]: String(rate?.rateToBase ?? "") }))}
                          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                        >
                          Edit
                        </button>
                      )}
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
