import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, trucksTable, driversTable, orgMembersTable, complianceDocsTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

async function truckWithDriver(t: typeof trucksTable.$inferSelect) {
  let driverName: string | null = null;
  if (t.driverId) {
    const [d] = await db.select().from(driversTable).where(eq(driversTable.id, t.driverId));
    driverName = d?.name ?? null;
  }
  const docs = await db.select().from(complianceDocsTable).where(
    and(eq(complianceDocsTable.entityType, "truck"), eq(complianceDocsTable.entityId, t.id))
  );
  const today = new Date().toISOString().slice(0, 10);
  const expiring = docs.filter(d => d.expiryDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) && d.expiryDate >= today);
  const expired = docs.filter(d => d.expiryDate < today);
  const borderReadyStatus = expired.length > 0 ? "blocked" : expiring.length > 0 ? "expiring" : "ready";
  return { ...t, driverName, borderReadyStatus };
}

router.get("/trucks", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const trucks = await db.select().from(trucksTable).where(eq(trucksTable.orgId, orgId));
  const result = await Promise.all(trucks.map(truckWithDriver));
  res.json(result);
});

router.post("/trucks", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { fleetNo, registrationNo, registrationCountry, vehicleType, gvmClass, status, odometerKm, avgConsumptionLPer100km, driverId } = req.body;
  const [truck] = await db
    .insert(trucksTable)
    .values({ orgId, fleetNo, registrationNo, registrationCountry, vehicleType: vehicleType ?? "truck_tractor_horse", gvmClass: gvmClass ?? "class2_gt20t", status: status ?? "idle", odometerKm, avgConsumptionLPer100km: avgConsumptionLPer100km ?? "35", driverId })
    .returning();
  res.status(201).json(await truckWithDriver(truck));
});

router.get("/trucks/:truckId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const [truck] = await db.select().from(trucksTable).where(and(eq(trucksTable.id, req.params.truckId), eq(trucksTable.orgId, orgId)));
  if (!truck) return res.status(404).json({ error: "Truck not found" });
  res.json(await truckWithDriver(truck));
});

router.patch("/trucks/:truckId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { fleetNo, registrationNo, registrationCountry, vehicleType, gvmClass, status, odometerKm, avgConsumptionLPer100km, driverId } = req.body;
  const [updated] = await db
    .update(trucksTable)
    .set({ fleetNo, registrationNo, registrationCountry, vehicleType, gvmClass, status, odometerKm, avgConsumptionLPer100km, driverId, updatedAt: new Date() })
    .where(and(eq(trucksTable.id, req.params.truckId), eq(trucksTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Truck not found" });
  res.json(await truckWithDriver(updated));
});

router.delete("/trucks/:truckId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  await db.delete(trucksTable).where(and(eq(trucksTable.id, req.params.truckId), eq(trucksTable.orgId, orgId)));
  res.status(204).end();
});

router.get("/trucks/:truckId/border-ready", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const [truck] = await db.select().from(trucksTable).where(and(eq(trucksTable.id, req.params.truckId), eq(trucksTable.orgId, orgId)));
  if (!truck) return res.status(404).json({ error: "Truck not found" });
  const docs = await db.select().from(complianceDocsTable).where(
    and(eq(complianceDocsTable.entityType, "truck"), eq(complianceDocsTable.entityId, truck.id))
  );
  const today = new Date().toISOString().slice(0, 10);
  const issues: string[] = [];
  for (const d of docs) {
    if (d.expiryDate < today) issues.push(`${d.docType} expired on ${d.expiryDate}`);
    else if (d.expiryDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)) {
      issues.push(`${d.docType} expires ${d.expiryDate}`);
    }
  }
  res.json({ truckId: truck.id, ready: issues.length === 0, issues });
});

export default router;
