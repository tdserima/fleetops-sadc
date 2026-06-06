import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, trucksTable, loadsTable, tripsTable, complianceDocsTable, orgMembersTable, tripStopsTable, fxRatesTable, orgsTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

router.get("/dashboard/kpis", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });

  const trucks = await db.select().from(trucksTable).where(eq(trucksTable.orgId, orgId));
  const loads = await db.select().from(loadsTable).where(eq(loadsTable.orgId, orgId));
  const docs = await db.select().from(complianceDocsTable).where(eq(complianceDocsTable.orgId, orgId));

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const activeTrucks = trucks.filter(t => t.status === "en_route" || t.status === "at_border").length;
  const loadsEnRoute = loads.filter(l => l.status === "en_route" || l.status === "assigned").length;
  const totalTrucks = trucks.length || 1;
  const fleetUtilisation = Math.round((activeTrucks / totalTrucks) * 100);
  const deliveredLoads = loads.filter(l => l.status === "delivered");
  const onTimePct = deliveredLoads.length > 0
    ? Math.round((deliveredLoads.filter(l => l.onTime).length / deliveredLoads.length) * 100)
    : null;
  const unassignedLoads = loads.filter(l => l.status === "unassigned").length;
  const trucksBlocked = trucks.filter(t => t.status === "maintenance").length;
  const docsExpiringSoon = docs.filter(d => d.expiryDate >= today && d.expiryDate <= in30).length;
  const readyToInvoice = loads.filter(l => l.status === "delivered" && l.invoiceStatus === "open").length;
  const overdueInvoices = loads.filter(l => l.invoiceStatus === "sent" && l.dueDate && l.dueDate < today).length;
  const unreciledAdvances = 0;

  const exceptions = [];
  for (const t of trucks.filter(t => t.status === "maintenance")) {
    exceptions.push({ type: "truck_blocked", message: `Truck ${t.fleetNo} is in maintenance`, entityId: t.id, severity: "high" });
  }
  for (const d of docs.filter(d => d.expiryDate < today)) {
    exceptions.push({ type: "doc_expired", message: `${d.docType} expired on ${d.expiryDate}`, entityId: d.entityId, severity: "critical" });
  }
  for (const l of loads.filter(l => l.invoiceStatus === "sent" && l.dueDate && l.dueDate < today)) {
    exceptions.push({ type: "overdue_invoice", message: `Invoice for ${l.consignmentNo} overdue`, entityId: l.id, severity: "high" });
  }

  res.json({ activeTrucks, loadsEnRoute, fleetUtilisation, onTimePct, unassignedLoads, trucksBlocked, docsExpiringSoon, readyToInvoice, overdueInvoices, unreciledAdvances, exceptions });
});

router.get("/dashboard/fleet-map", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });

  const trucks = await db.select().from(trucksTable).where(eq(trucksTable.orgId, orgId));
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const result = await Promise.all(trucks.map(async t => {
    const docs = await db.select().from(complianceDocsTable).where(and(eq(complianceDocsTable.entityType, "truck"), eq(complianceDocsTable.entityId, t.id)));
    const expired = docs.filter(d => d.expiryDate < today);
    const expiring = docs.filter(d => d.expiryDate >= today && d.expiryDate <= in30);
    const borderReadyStatus = expired.length > 0 ? "blocked" : expiring.length > 0 ? "expiring" : "ready";

    const loads = await db.select().from(loadsTable).where(and(eq(loadsTable.truckId, t.id), eq(loadsTable.orgId, orgId)));
    const activeLoad = loads.find(l => l.status === "en_route" || l.status === "assigned");

    const stops = activeLoad
      ? await db.select().from(tripStopsTable).where(eq(tripStopsTable.tripId, ""))
      : [];

    return {
      truckId: t.id,
      fleetNo: t.fleetNo,
      registrationNo: t.registrationNo,
      status: t.status,
      borderReadyStatus,
      driverName: null,
      lastPlace: null,
      lat: null,
      lng: null,
      currentLoad: activeLoad?.consignmentNo ?? null,
    };
  }));
  res.json(result);
});

router.get("/dashboard/ar-summary", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });

  const [org] = await db.select().from(orgsTable).where(eq(orgsTable.id, orgId));
  const baseCurrency = org?.baseCurrency ?? "ZAR";
  const loads = await db.select().from(loadsTable).where(eq(loadsTable.orgId, orgId));
  const fxRates = await db.select().from(fxRatesTable).where(eq(fxRatesTable.orgId, orgId));
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  function toBase(amount: number, currency: string): number {
    if (currency === baseCurrency) return amount;
    const r = fxRates.find(r => r.currency === currency);
    return r ? amount * parseFloat(r.rateToBase) : amount;
  }

  const outstanding = loads.filter(l => l.invoiceStatus === "sent");
  const outstandingByBase = outstanding.reduce((sum, l) => sum + (l.rate ? toBase(parseFloat(l.rate), l.currency) : 0), 0);
  const overdue = outstanding.filter(l => l.dueDate && l.dueDate < today).reduce((sum, l) => sum + (l.rate ? toBase(parseFloat(l.rate), l.currency) : 0), 0);
  const collected30d = loads.filter(l => l.invoiceStatus === "paid" && l.paidDate && l.paidDate >= thirtyDaysAgo).reduce((sum, l) => sum + (l.rate ? toBase(parseFloat(l.rate), l.currency) : 0), 0);

  const paidWithDates = loads.filter(l => l.invoiceStatus === "paid" && l.invoiceDate && l.paidDate);
  const avgDaysToPay = paidWithDates.length > 0
    ? paidWithDates.reduce((sum, l) => {
        const diff = (new Date(l.paidDate!).getTime() - new Date(l.invoiceDate!).getTime()) / (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0) / paidWithDates.length
    : null;

  const readyToInvoice = loads.filter(l => l.status === "delivered" && l.invoiceStatus === "open").length;

  const currencyMap: Record<string, number> = {};
  for (const l of outstanding) {
    if (!l.rate) continue;
    currencyMap[l.currency] = (currencyMap[l.currency] ?? 0) + parseFloat(l.rate);
  }
  const outstandingByCurrency = Object.entries(currencyMap).map(([currency, amount]) => ({ currency, amount }));

  res.json({ outstandingByBase, outstandingByCurrency, overdue, collected30d, avgDaysToPay, readyToInvoice, baseCurrency });
});

router.get("/dashboard/compliance-summary", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });

  const docs = await db.select().from(complianceDocsTable).where(eq(complianceDocsTable.orgId, orgId));
  const trucks = await db.select().from(trucksTable).where(eq(trucksTable.orgId, orgId));
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const valid = docs.filter(d => d.expiryDate > in30).length;
  const expiring = docs.filter(d => d.expiryDate >= today && d.expiryDate <= in30).length;
  const expired = docs.filter(d => d.expiryDate < today).length;
  const nextExpiries = docs.filter(d => d.expiryDate >= today).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)).slice(0, 5).map(d => {
    const expiry = new Date(d.expiryDate);
    const daysUntilExpiry = Math.floor((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const docStatus = daysUntilExpiry < 0 ? "expired" : daysUntilExpiry <= 30 ? "expiring" : "valid";
    return { ...d, docStatus, daysUntilExpiry };
  });

  const blockedTruckIds = new Set(docs.filter(d => d.expiryDate < today && d.entityType === "truck").map(d => d.entityId));
  const blockedTrucks = trucks.filter(t => blockedTruckIds.has(t.id)).map(t => ({ ...t, driverName: null, borderReadyStatus: "blocked" }));

  res.json({ valid, expiring, expired, nextExpiries, blockedTrucks });
});

export default router;
