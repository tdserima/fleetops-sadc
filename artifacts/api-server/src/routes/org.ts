import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, orgsTable, orgMembersTable } from "@workspace/db";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

router.get("/org", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const [org] = await db.select().from(orgsTable).where(eq(orgsTable.id, orgId));
  if (!org) return res.status(404).json({ error: "Org not found" });
  res.json(org);
});

router.patch("/org", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { name, country, companyRegNo, cbrtaOperatorNo, vatNo, address, billingEmail, phone, baseCurrency, invoiceTermsDays } = req.body;
  const [updated] = await db
    .update(orgsTable)
    .set({ name, country, companyRegNo, cbrtaOperatorNo, vatNo, address, billingEmail, phone, baseCurrency, invoiceTermsDays, updatedAt: new Date() })
    .where(eq(orgsTable.id, orgId))
    .returning();
  res.json(updated);
});

router.get("/org/members", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const members = await db.select().from(orgMembersTable).where(eq(orgMembersTable.orgId, orgId));
  res.json(members);
});

router.post("/org/members", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { displayName, phone, role } = req.body;
  const [member] = await db
    .insert(orgMembersTable)
    .values({ orgId, userId: req.user.id, displayName, phone, role: role ?? "transport_manager" })
    .returning();
  res.status(201).json(member);
});

router.patch("/org/members/:memberId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { memberId } = req.params;
  const { role, displayName, phone } = req.body;
  const [updated] = await db
    .update(orgMembersTable)
    .set({ role, displayName, phone })
    .where(eq(orgMembersTable.id, memberId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Member not found" });
  res.json(updated);
});

router.delete("/org/members/:memberId", requireAuth, async (req: any, res) => {
  const { memberId } = req.params;
  await db.delete(orgMembersTable).where(eq(orgMembersTable.id, memberId));
  res.status(204).end();
});

export default router;
