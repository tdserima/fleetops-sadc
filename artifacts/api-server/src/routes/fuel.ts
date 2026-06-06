import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, fuelPurchasesTable, trucksTable, orgMembersTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

async function enrichFuel(f: typeof fuelPurchasesTable.$inferSelect) {
  const [t] = await db.select().from(trucksTable).where(eq(trucksTable.id, f.truckId));
  const total = (parseFloat(f.litres) * parseFloat(f.pricePerLitre)).toFixed(2);
  return { ...f, truckFleetNo: t?.fleetNo ?? null, total };
}

router.get("/fuel-purchases", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  let items = await db.select().from(fuelPurchasesTable).where(eq(fuelPurchasesTable.orgId, orgId));
  if (req.query.truckId) items = items.filter(f => f.truckId === req.query.truckId);
  const result = await Promise.all(items.map(enrichFuel));
  res.json(result);
});

router.post("/fuel-purchases", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { truckId, date, country, litres, pricePerLitre, currency } = req.body;
  const [f] = await db
    .insert(fuelPurchasesTable)
    .values({ orgId, truckId, date, country, litres, pricePerLitre, currency })
    .returning();
  res.status(201).json(await enrichFuel(f));
});

router.patch("/fuel-purchases/:purchaseId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { date, country, litres, pricePerLitre, currency } = req.body;
  const [updated] = await db
    .update(fuelPurchasesTable)
    .set({ date, country, litres, pricePerLitre, currency })
    .where(and(eq(fuelPurchasesTable.id, req.params.purchaseId), eq(fuelPurchasesTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(await enrichFuel(updated));
});

router.delete("/fuel-purchases/:purchaseId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  await db.delete(fuelPurchasesTable).where(and(eq(fuelPurchasesTable.id, req.params.purchaseId), eq(fuelPurchasesTable.orgId, orgId)));
  res.status(204).end();
});

export default router;
