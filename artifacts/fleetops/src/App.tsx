import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@workspace/replit-auth-web";

import { AppLayout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Fleet from "@/pages/fleet";
import Drivers from "@/pages/drivers";
import Loads from "@/pages/loads";
import Trips from "@/pages/trips";
import Compliance from "@/pages/compliance";
import Disbursements from "@/pages/disbursements";
import Fuel from "@/pages/fuel";
import FxRates from "@/pages/fx-rates";
import BorderCatalog from "@/pages/border-catalog";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Login() {
  const { login } = useAuth();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="max-w-sm w-full p-8 bg-card border border-border rounded-lg shadow-2xl text-center space-y-6">
        <div className="space-y-1">
          <div className="text-xs font-mono text-primary tracking-widest uppercase mb-4">FleetOps SADC</div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Operations Centre</h1>
          <p className="text-sm text-muted-foreground">Cross-border road freight for SADC carriers</p>
        </div>
        <button
          onClick={login}
          className="w-full h-11 bg-primary text-primary-foreground rounded-md font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Sign in with Replit
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Login />;
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/fleet" component={Fleet} />
        <Route path="/drivers" component={Drivers} />
        <Route path="/loads" component={Loads} />
        <Route path="/trips" component={Trips} />
        <Route path="/compliance" component={Compliance} />
        <Route path="/disbursements" component={Disbursements} />
        <Route path="/fuel" component={Fuel} />
        <Route path="/fx-rates" component={FxRates} />
        <Route path="/border-catalog" component={BorderCatalog} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
