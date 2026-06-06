import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, disbursementsTable, orgMembersTable, fxRatesTable, orgsTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

async function withBaseAmount(d: typeof disbursementsTable.$inferSelect, orgId: string) {
  const [org] = await db.select().from(orgsTable).where(eq(orgsTable.id, orgId));
  const baseCurrency = org?.baseCurrency ?? "ZAR";
  if (d.currency === baseCurrency) return { ...d, amountInBase: d.amount };
  const rates = await db.select().from(fxRatesTable).where(and(eq(fxRatesTable.orgId, orgId), eq(fxRatesTable.currency, d.currency)));
  const rate = rates[0];
  if (!rate) return { ...d, amountInBase: d.amount };
  const amountInBase = (parseFloat(d.amount) * parseFloat(rate.rateToBase)).toFixed(2);
  return { ...d, amountInBase };
}

router.get("/trips/:tripId/disbursements", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const items = await db.select().from(disbursementsTable).where(eq(disbursementsTable.tripId, req.params.tripId));
  const result = await Promise.all(items.map(d => withBaseAmount(d, orgId)));
  res.json(result);
});

router.post("/trips/:tripId/disbursements", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { date, borderPost, country, chargeType, amount, currency, paidBy, receiptUrl, notes } = req.body;
  const [d] = await db
    .insert(disbursementsTable)
    .values({ tripId: req.params.tripId, date, borderPost, country, chargeType, amount, currency, paidBy: paidBy ?? "driver_advance", receiptUrl, notes })
    .returning();
  res.status(201).json(await withBaseAmount(d, orgId));
});

router.patch("/trips/:tripId/disbursements/:disbursementId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { date, borderPost, country, chargeType, amount, currency, paidBy, receiptUrl, notes } = req.body;
  const [updated] = await db
    .update(disbursementsTable)
    .set({ date, borderPost, country, chargeType, amount, currency, paidBy, receiptUrl, notes })
    .where(eq(disbursementsTable.id, req.params.disbursementId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(await withBaseAmount(updated, orgId));
});

router.delete("/trips/:tripId/disbursements/:disbursementId", requireAuth, async (req: any, res) => {
  await db.delete(disbursementsTable).where(eq(disbursementsTable.id, req.params.disbursementId));
  res.status(204).end();
});

export default router;
