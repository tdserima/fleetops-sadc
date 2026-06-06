import { useState } from "react";
import { useGetOrg, useUpdateOrg, useListOrgMembers, useSeedDemoData, useResetDemoData } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { Building2, Users, Beaker, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: org, isLoading: orgLoading } = useGetOrg();
  const { data: members } = useListOrgMembers();
  const updateOrg = useUpdateOrg({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/org"] }) } });
  const seed = useSeedDemoData({ mutation: { onSuccess: () => qc.invalidateQueries() } });
  const reset = useResetDemoData({ mutation: { onSuccess: () => qc.invalidateQueries() } });
  const [orgName, setOrgName] = useState("");
  const [seedMsg, setSeedMsg] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : user?.email ?? "User";

  if (orgLoading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-display font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Organisation & account configuration</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Organisation</h2>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Current name</div>
            <div className="text-sm font-medium text-foreground">{org?.name ?? "—"}</div>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="New organisation name" value={orgName} onChange={(e) => setOrgName(e.target.value)}
              className="flex-1 h-8 px-3 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <button disabled={!orgName.trim()}
              onClick={() => { updateOrg.mutate({ data: { name: orgName } }); setOrgName(""); }}
              className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-40">
              Update
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Members</h2>
        </div>
        {!members?.length ? (
          <div className="text-xs text-muted-foreground">No members found.</div>
        ) : (
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                  {(m.displayName ?? m.userId).slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground font-medium truncate">{m.displayName ?? m.userId}</div>
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                  m.role === "owner" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold">Demo Data</h2>
        </div>
        <p className="text-xs text-muted-foreground">Seed sample trucks, drivers, loads, and trips to explore the platform. <span className="text-amber-400">Owner only.</span></p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => seed.mutate(undefined, { onSuccess: (d) => setSeedMsg(d?.message ?? "Seeded!") })}
            disabled={seed.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50">
            <Beaker className="w-3.5 h-3.5" />
            {seed.isPending ? "Seeding…" : "Seed Demo"}
          </button>
          <button onClick={() => reset.mutate(undefined, { onSuccess: (d) => setResetMsg(d?.message ?? "Reset!") })}
            disabled={reset.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50">
            <RotateCcw className="w-3.5 h-3.5" />
            {reset.isPending ? "Resetting…" : "Reset Demo"}
          </button>
        </div>
        {seedMsg && <div className="text-xs text-lime-400">{seedMsg}</div>}
        {resetMsg && <div className="text-xs text-muted-foreground">{resetMsg}</div>}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>
        <div className="text-xs text-muted-foreground">Signed in as <span className="text-foreground font-medium">{displayName}</span></div>
        {user?.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
        <div className="text-[10px] text-muted-foreground/60 font-mono">{user?.id}</div>
      </div>
    </div>
  );
}
