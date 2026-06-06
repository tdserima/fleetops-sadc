import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, driversTable, orgMembersTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

router.get("/drivers", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const drivers = await db.select().from(driversTable).where(eq(driversTable.orgId, orgId));
  res.json(drivers);
});

router.post("/drivers", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { name, phone, nationality, passportNo, status } = req.body;
  const [driver] = await db
    .insert(driversTable)
    .values({ orgId, name, phone, nationality, passportNo, status: status ?? "available" })
    .returning();
  res.status(201).json(driver);
});

router.get("/drivers/:driverId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const [driver] = await db.select().from(driversTable).where(and(eq(driversTable.id, req.params.driverId), eq(driversTable.orgId, orgId)));
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  res.json(driver);
});

router.patch("/drivers/:driverId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { name, phone, nationality, passportNo, status } = req.body;
  const [updated] = await db
    .update(driversTable)
    .set({ name, phone, nationality, passportNo, status, updatedAt: new Date() })
    .where(and(eq(driversTable.id, req.params.driverId), eq(driversTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Driver not found" });
  res.json(updated);
});

router.delete("/drivers/:driverId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  await db.delete(driversTable).where(and(eq(driversTable.id, req.params.driverId), eq(driversTable.orgId, orgId)));
  res.status(204).end();
});

export default router;
