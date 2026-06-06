import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, borderChargeCatalogTable, orgMembersTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

router.get("/border-catalog", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  let items = await db.select().from(borderChargeCatalogTable).where(eq(borderChargeCatalogTable.orgId, orgId));
  if (req.query.borderPost) items = items.filter(c => c.borderPost === req.query.borderPost);
  res.json(items);
});

router.post("/border-catalog", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { borderPost, country, chargeType, defaultAmount, currency, appliesTo } = req.body;
  const [item] = await db
    .insert(borderChargeCatalogTable)
    .values({ orgId, borderPost, country, chargeType, defaultAmount, currency, appliesTo: appliesTo ?? "combination" })
    .returning();
  res.status(201).json(item);
});

router.patch("/border-catalog/:chargeId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { defaultAmount, currency, appliesTo } = req.body;
  const [updated] = await db
    .update(borderChargeCatalogTable)
    .set({ defaultAmount, currency, appliesTo })
    .where(and(eq(borderChargeCatalogTable.id, req.params.chargeId), eq(borderChargeCatalogTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/border-catalog/:chargeId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  await db.delete(borderChargeCatalogTable).where(and(eq(borderChargeCatalogTable.id, req.params.chargeId), eq(borderChargeCatalogTable.orgId, orgId)));
  res.status(204).end();
});

export default router;
