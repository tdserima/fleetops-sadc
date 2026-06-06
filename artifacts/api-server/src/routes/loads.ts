import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, loadsTable, trucksTable, orgMembersTable, orgsTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgId(userId: string): Promise<string | null> {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m?.orgId ?? null;
}

async function enrichLoad(load: typeof loadsTable.$inferSelect) {
  let truckFleetNo: string | null = null;
  if (load.truckId) {
    const [t] = await db.select().from(trucksTable).where(eq(trucksTable.id, load.truckId));
    truckFleetNo = t?.fleetNo ?? null;
  }
  const today = new Date().toISOString().slice(0, 10);
  let daysOverdue: number | null = null;
  if (load.dueDate && load.invoiceStatus !== "paid") {
    const due = new Date(load.dueDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) daysOverdue = diff;
  }
  const distanceKm = load.distanceKm ? parseFloat(load.distanceKm) : null;
  const rate = load.rate ? parseFloat(load.rate) : null;
  const ratePerKm = rate && distanceKm ? rate / distanceKm : null;
  return { ...load, truckFleetNo, daysOverdue, ratePerKm };
}

router.get("/loads", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { status, truckId } = req.query;
  let query = db.select().from(loadsTable).where(eq(loadsTable.orgId, orgId));
  const loads = await query;
  let filtered = loads;
  if (status) filtered = filtered.filter(l => l.status === status);
  if (truckId) filtered = filtered.filter(l => l.truckId === truckId);
  const result = await Promise.all(filtered.map(enrichLoad));
  res.json(result);
});

router.post("/loads", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { consignmentNo, customer, originCity, destCity, corridor, borderPosts, distanceKm, cargoDesc, cargoWeightKg, customsRef, rate, currency, pickupDate } = req.body;
  const [load] = await db
    .insert(loadsTable)
    .values({ orgId, consignmentNo, customer, originCity, destCity, corridor, borderPosts: borderPosts ?? [], distanceKm, cargoDesc, cargoWeightKg, customsRef, rate, currency: currency ?? "ZAR", pickupDate, status: "unassigned", invoiceStatus: "open" })
    .returning();
  res.status(201).json(await enrichLoad(load));
});

router.get("/loads/:loadId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const [load] = await db.select().from(loadsTable).where(and(eq(loadsTable.id, req.params.loadId), eq(loadsTable.orgId, orgId)));
  if (!load) return res.status(404).json({ error: "Load not found" });
  res.json(await enrichLoad(load));
});

router.patch("/loads/:loadId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { consignmentNo, customer, originCity, destCity, corridor, borderPosts, distanceKm, cargoDesc, cargoWeightKg, customsRef, rate, currency, pickupDate, status } = req.body;
  const [updated] = await db
    .update(loadsTable)
    .set({ consignmentNo, customer, originCity, destCity, corridor, borderPosts, distanceKm, cargoDesc, cargoWeightKg, customsRef, rate, currency, pickupDate, status, updatedAt: new Date() })
    .where(and(eq(loadsTable.id, req.params.loadId), eq(loadsTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Load not found" });
  res.json(await enrichLoad(updated));
});

router.delete("/loads/:loadId", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  await db.delete(loadsTable).where(and(eq(loadsTable.id, req.params.loadId), eq(loadsTable.orgId, orgId)));
  res.status(204).end();
});

router.post("/loads/:loadId/assign", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { truckId } = req.body;
  const [updated] = await db
    .update(loadsTable)
    .set({ truckId, status: "assigned", updatedAt: new Date() })
    .where(and(eq(loadsTable.id, req.params.loadId), eq(loadsTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Load not found" });
  res.json(await enrichLoad(updated));
});

router.post("/loads/:loadId/deliver", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { podUrl, deliveredDate, onTime } = req.body;
  const [updated] = await db
    .update(loadsTable)
    .set({ podUrl, deliveredDate: deliveredDate ?? new Date().toISOString().slice(0, 10), onTime: onTime ?? true, status: "delivered", updatedAt: new Date() })
    .where(and(eq(loadsTable.id, req.params.loadId), eq(loadsTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Load not found" });
  res.json(await enrichLoad(updated));
});

router.post("/loads/:loadId/invoice", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const [org] = await db.select().from(orgsTable).where(eq(orgsTable.id, orgId));
  if (!org) return res.status(404).json({ error: "Org not found" });
  const seq = org.nextInvoiceSeq;
  const invoiceNumber = `INV-${String(seq).padStart(4, "0")}`;
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + (org.invoiceTermsDays ?? 30) * 24 * 60 * 60 * 1000);
  const dueDate = due.toISOString().slice(0, 10);
  await db.update(orgsTable).set({ nextInvoiceSeq: seq + 1 }).where(eq(orgsTable.id, orgId));
  const [updated] = await db
    .update(loadsTable)
    .set({ invoiceNumber, invoiceDate, dueDate, invoiceStatus: "sent", status: "delivered", updatedAt: new Date() })
    .where(and(eq(loadsTable.id, req.params.loadId), eq(loadsTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Load not found" });
  res.json(await enrichLoad(updated));
});

router.post("/loads/:loadId/mark-paid", requireAuth, async (req: any, res) => {
  const orgId = await getOrgId(req.user.id);
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  const { paidDate } = req.body;
  const [updated] = await db
    .update(loadsTable)
    .set({ paidDate: paidDate ?? new Date().toISOString().slice(0, 10), invoiceStatus: "paid", updatedAt: new Date() })
    .where(and(eq(loadsTable.id, req.params.loadId), eq(loadsTable.orgId, orgId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Load not found" });
  res.json(await enrichLoad(updated));
});

export default router;
