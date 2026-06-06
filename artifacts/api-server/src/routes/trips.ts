import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, tripsTable, tripStopsTable, disbursementsTable, trucksTable, driversTable, loadsTable, orgMembersTable, fxRatesTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

async function enrichTrip(t: typeof tripsTable.$inferSelect) {
  let truckFleetNo: string | null = null;
  let driverName: string | null = null;
  if (t.truckId) {
    const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, t.truckId));
    truckFleetNo = truck?.fleetNo ?? null;
  }
  if (t.driverId) {
    const [d] = await db.select().from(driversTable).where(eq(driversTable.id, t.driverId));
    driverName = d?.name ?? null;
  }
  return { ...t, truckFleetNo, driverName };
}

router.get("/trips", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const trips = await db.select().from(tripsTable).where(eq(tripsTable.orgId, orgId));
  const { status, truckId } = req.query;
  let filtered = trips;
  if (status) filtered = filtered.filter(t => t.status === status);
  if (truckId) filtered = filtered.filter(t => t.truckId === truckId);
  const result = await Promise.all(filtered.map(enrichTrip));
  res.json(result);
});

router.post("/trips", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { name, truckId, driverId, tripDate, advanceTotal, advanceCurrency } = req.body;
  const [trip] = await db
    .insert(tripsTable)
    .values({ orgId, name, truckId, driverId, tripDate, advanceTotal, advanceCurrency: advanceCurrency ?? "ZAR", status: "planned" })
    .returning();
  res.status(201).json(await enrichTrip(trip));
});

router.get("/trips/:tripId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const [trip] = await db.select().from(tripsTable).where(and(eq(tripsTable.id, req.params.tripId), eq(tripsTable.orgId, orgId)));
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  const stops = await db.select().from(tripStopsTable).where(eq(tripStopsTable.tripId, trip.id));
  const disbursements = await db.select().from(disbursementsTable).where(eq(disbursementsTable.tripId, trip.id));
  const enriched = await enrichTrip(trip);
  res.json({ ...enriched, stops, disbursements });
});

router.patch("/trips/:tripId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { name, truckId, driverId, tripDate, status, advanceTotal, advanceCurrency } = req.body;
  const [updated] = await db
    .update(tripsTable)
    .set({ name, truckId, driverId, tripDate, status, advanceTotal, advanceCurrency, updatedAt: new Date() })
    .where(and(eq(tripsTable.id, req.params.tripId), eq(tripsTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Trip not found" });
  res.json(await enrichTrip(updated));
});

router.delete("/trips/:tripId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  await db.delete(tripsTable).where(and(eq(tripsTable.id, req.params.tripId), eq(tripsTable.orgId, orgId)));
  res.status(204).end();
});

router.get("/trips/:tripId/cost-sheet", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const [trip] = await db.select().from(tripsTable).where(and(eq(tripsTable.id, req.params.tripId), eq(tripsTable.orgId, orgId)));
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const disbursements = await db.select().from(disbursementsTable).where(eq(disbursementsTable.tripId, trip.id));
  const fxRates = await db.select().from(fxRatesTable).where(eq(fxRatesTable.orgId, orgId));

  const baseCurrency = "ZAR";

  function toBase(amount: number, currency: string): number {
    if (currency === baseCurrency) return amount;
    const rate = fxRates.find(r => r.currency === currency);
    if (!rate) return amount;
    return amount * parseFloat(rate.rateToBase);
  }

  let fuelCost = 0, borderCost = 0, otherCost = 0;
  for (const d of disbursements) {
    const base = toBase(parseFloat(d.amount), d.currency);
    const enrichedBase = base;
    if (d.chargeType === "fuel") fuelCost += enrichedBase;
    else if (["bridge_toll", "gate_pass", "carbon_tax", "road_access", "road_fund", "transit_fee", "third_party_insurance", "customs_bond", "tip_fee", "ects_seal", "agric_health_permit", "weighbridge"].includes(d.chargeType)) borderCost += enrichedBase;
    else otherCost += enrichedBase;
  }

  const totalDisbursements = fuelCost + borderCost + otherCost;
  const advanceTotal = trip.advanceTotal ? parseFloat(trip.advanceTotal) : null;
  const advanceBalance = advanceTotal ? advanceTotal - totalDisbursements : -totalDisbursements;

  const loadIds = (await db.select().from(loadsTable).where(eq(loadsTable.orgId, orgId))).filter(l => l.truckId === trip.truckId);
  const revenue = loadIds.reduce((sum, l) => sum + (l.rate ? parseFloat(l.rate) : 0), 0);

  const netMargin = revenue - totalDisbursements;

  const stops = await db.select().from(tripStopsTable).where(eq(tripStopsTable.tripId, trip.id));
  const borderStops = stops.filter(s => s.stopType === "border").map(s => s.place);

  const disbursementsByBorder = borderStops.map(bp => {
    const items = disbursements.filter(d => d.borderPost === bp);
    const total = items.reduce((sum, d) => sum + toBase(parseFloat(d.amount), d.currency), 0);
    return { borderPost: bp, total, items };
  });
  const unattributed = disbursements.filter(d => !d.borderPost);
  if (unattributed.length > 0) {
    disbursementsByBorder.push({ borderPost: null as any, total: unattributed.reduce((sum, d) => sum + toBase(parseFloat(d.amount), d.currency), 0), items: unattributed });
  }

  res.json({
    tripId: trip.id,
    advanceTotal,
    advanceCurrency: trip.advanceCurrency,
    advanceBalance,
    totalDisbursements,
    fuelCost,
    borderCost,
    otherCost,
    revenue,
    netMargin,
    costPerKm: null,
    baseCurrency,
    disbursementsByBorder,
    pdfUrl: null,
  });
});

router.get("/trips/:tripId/stops", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const stops = await db.select().from(tripStopsTable).where(eq(tripStopsTable.tripId, req.params.tripId));
  res.json(stops);
});

router.post("/trips/:tripId/stops", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { seq, place, lat, lng, country, stopType } = req.body;
  const [stop] = await db
    .insert(tripStopsTable)
    .values({ tripId: req.params.tripId, seq, place, lat, lng, country, stopType: stopType ?? "border" })
    .returning();
  res.status(201).json(stop);
});

router.delete("/trips/:tripId/stops/:stopId", requireAuth, async (req: any, res) => {
  await db.delete(tripStopsTable).where(eq(tripStopsTable.id, req.params.stopId));
  res.status(204).end();
});

export default router;
