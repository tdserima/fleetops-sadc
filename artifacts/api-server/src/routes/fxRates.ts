import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, fxRatesTable, orgMembersTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

router.get("/fx-rates", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const rates = await db.select().from(fxRatesTable).where(eq(fxRatesTable.orgId, orgId));
  res.json(rates);
});

router.post("/fx-rates", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { currency, rateToBase, asOf } = req.body;
  const existing = await db.select().from(fxRatesTable).where(and(eq(fxRatesTable.orgId, orgId), eq(fxRatesTable.currency, currency)));
  let result;
  if (existing.length > 0) {
    [result] = await db.update(fxRatesTable).set({ rateToBase, asOf }).where(and(eq(fxRatesTable.orgId, orgId), eq(fxRatesTable.currency, currency))).returning();
  } else {
    [result] = await db.insert(fxRatesTable).values({ orgId, currency, rateToBase, asOf }).returning();
  }
  res.json(result);
});

export default router;
