import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, complianceDocsTable, orgMembersTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

function enrichDoc(d: typeof complianceDocsTable.$inferSelect) {
  const today = new Date();
  const expiry = new Date(d.expiryDate);
  const diffMs = expiry.getTime() - today.getTime();
  const daysUntilExpiry = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let docStatus: string;
  if (daysUntilExpiry < 0) docStatus = "expired";
  else if (daysUntilExpiry <= 30) docStatus = "expiring";
  else docStatus = "valid";
  return { ...d, docStatus, daysUntilExpiry };
}

router.get("/compliance-docs", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const docs = await db.select().from(complianceDocsTable).where(eq(complianceDocsTable.orgId, orgId));
  let filtered = docs;
  if (req.query.entityType) filtered = filtered.filter(d => d.entityType === req.query.entityType);
  if (req.query.entityId) filtered = filtered.filter(d => d.entityId === req.query.entityId);
  res.json(filtered.map(enrichDoc));
});

router.post("/compliance-docs", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { entityType, entityId, docType, docNumber, issuer, country, issueDate, expiryDate, fileUrl } = req.body;
  const [doc] = await db
    .insert(complianceDocsTable)
    .values({ orgId, entityType, entityId, docType, docNumber, issuer, country, issueDate, expiryDate, fileUrl })
    .returning();
  res.status(201).json(enrichDoc(doc));
});

router.get("/compliance-docs/:docId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const [doc] = await db.select().from(complianceDocsTable).where(and(eq(complianceDocsTable.id, req.params.docId), eq(complianceDocsTable.orgId, orgId)));
  if (!doc) return res.status(404).json({ error: "Doc not found" });
  res.json(enrichDoc(doc));
});

router.patch("/compliance-docs/:docId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { docNumber, issuer, country, issueDate, expiryDate, fileUrl } = req.body;
  const [updated] = await db
    .update(complianceDocsTable)
    .set({ docNumber, issuer, country, issueDate, expiryDate, fileUrl, updatedAt: new Date() })
    .where(and(eq(complianceDocsTable.id, req.params.docId), eq(complianceDocsTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Doc not found" });
  res.json(enrichDoc(updated));
});

router.delete("/compliance-docs/:docId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  await db.delete(complianceDocsTable).where(and(eq(complianceDocsTable.id, req.params.docId), eq(complianceDocsTable.orgId, orgId)));
  res.status(204).end();
});

export default router;
