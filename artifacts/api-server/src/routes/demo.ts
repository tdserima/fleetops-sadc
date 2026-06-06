import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, orgsTable, orgMembersTable, trucksTable, driversTable, loadsTable, tripsTable, tripStopsTable, disbursementsTable, complianceDocsTable, fuelPurchasesTable, borderChargeCatalogTable, fxRatesTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function getOrgMember(userId: string) {
  const [m] = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId));
  return m ?? null;
}

router.post("/demo/seed", requireAuth, async (req: any, res) => {
  const member = await getOrgMember(req.user.id);
  if (!member) return res.status(404).json({ error: "Org not found" });
  if (member.role !== "owner") return res.status(403).json({ error: "Owner only" });
  const orgId = member.orgId;

  const [t1] = await db.insert(trucksTable).values({ orgId, fleetNo: "ZW-001", registrationNo: "AEF 1234 ZW", registrationCountry: "ZWE", vehicleType: "truck_tractor_horse", gvmClass: "class2_gt20t", status: "en_route", avgConsumptionLPer100km: "38" }).returning();
  const [t2] = await db.insert(trucksTable).values({ orgId, fleetNo: "ZA-002", registrationNo: "CAA 5678 GP", registrationCountry: "ZAF", vehicleType: "superlink", gvmClass: "class2_gt20t", status: "idle", avgConsumptionLPer100km: "42" }).returning();
  const [t3] = await db.insert(trucksTable).values({ orgId, fleetNo: "ZM-003", registrationNo: "ALZ 9012 ZM", registrationCountry: "ZMB", vehicleType: "flatbed", gvmClass: "class2_gt20t", status: "at_border", avgConsumptionLPer100km: "35" }).returning();

  const [d1] = await db.insert(driversTable).values({ orgId, name: "Tendai Moyo", phone: "+263772001234", nationality: "ZWE", passportNo: "ZW123456", status: "en_route", loadsCompleted: 47 }).returning();
  const [d2] = await db.insert(driversTable).values({ orgId, name: "Sipho Dlamini", phone: "+27821234567", nationality: "ZAF", passportNo: "ZA789012", status: "available", loadsCompleted: 23 }).returning();
  const [d3] = await db.insert(driversTable).values({ orgId, name: "Chanda Mwale", phone: "+260961234567", nationality: "ZMB", passportNo: "ZM345678", status: "resting", loadsCompleted: 61 }).returning();

  await db.update(trucksTable).set({ driverId: d1.id }).where(eq(trucksTable.id, t1.id));
  await db.update(trucksTable).set({ driverId: d2.id }).where(eq(trucksTable.id, t2.id));
  await db.update(trucksTable).set({ driverId: d3.id }).where(eq(trucksTable.id, t3.id));

  const today = new Date().toISOString().slice(0, 10);
  const [l1] = await db.insert(loadsTable).values({ orgId, consignmentNo: "CNS-2024-001", customer: "Shoprite Holdings", originCity: "Johannesburg", destCity: "Lusaka", corridor: "N1/SADC", borderPosts: ["Beit Bridge", "Chirundu"], distanceKm: "1980", cargoDesc: "Dry groceries", cargoWeightKg: "22000", rate: "185000", currency: "ZAR", pickupDate: today, truckId: t1.id, status: "en_route", invoiceStatus: "open" }).returning();
  const [l2] = await db.insert(loadsTable).values({ orgId, consignmentNo: "CNS-2024-002", customer: "Tiger Brands", originCity: "Durban", destCity: "Harare", corridor: "N3/N11", borderPosts: ["Beit Bridge"], distanceKm: "1650", cargoDesc: "Maize flour", cargoWeightKg: "24500", rate: "155000", currency: "ZAR", pickupDate: today, status: "unassigned", invoiceStatus: "open" }).returning();
  const [l3] = await db.insert(loadsTable).values({ orgId, consignmentNo: "CNS-2024-003", customer: "Zambia Sugar", originCity: "Lusaka", destCity: "Johannesburg", corridor: "SADC/N1", borderPosts: ["Chirundu", "Beit Bridge"], distanceKm: "2100", cargoDesc: "Sugar (25kg bags)", cargoWeightKg: "26000", rate: "28500", currency: "USD", pickupDate: today, truckId: t3.id, status: "at_border", invoiceStatus: "open" }).returning();

  const [trip1] = await db.insert(tripsTable).values({ orgId, name: "JHB → Lusaka via Beit Bridge / Chirundu", truckId: t1.id, driverId: d1.id, tripDate: today, status: "active", advanceTotal: "15000", advanceCurrency: "ZAR" }).returning();
  await db.insert(tripStopsTable).values([
    { tripId: trip1.id, seq: 1, place: "Johannesburg", country: "ZAF", stopType: "pickup" },
    { tripId: trip1.id, seq: 2, place: "Beit Bridge", country: "ZWE", stopType: "border" },
    { tripId: trip1.id, seq: 3, place: "Harare", country: "ZWE", stopType: "rest" },
    { tripId: trip1.id, seq: 4, place: "Chirundu", country: "ZMB", stopType: "border" },
    { tripId: trip1.id, seq: 5, place: "Lusaka", country: "ZMB", stopType: "dropoff" },
  ]);
  await db.insert(disbursementsTable).values([
    { tripId: trip1.id, date: today, borderPost: "Beit Bridge", country: "ZWE", chargeType: "gate_pass", amount: "350", currency: "USD", paidBy: "driver_advance" },
    { tripId: trip1.id, date: today, borderPost: "Beit Bridge", country: "ZWE", chargeType: "carbon_tax", amount: "1200", currency: "USD", paidBy: "driver_advance" },
    { tripId: trip1.id, date: today, borderPost: "Beit Bridge", country: "ZWE", chargeType: "third_party_insurance", amount: "850", currency: "USD", paidBy: "driver_advance" },
    { tripId: trip1.id, date: today, country: "ZAF", chargeType: "fuel", amount: "4200", currency: "ZAR", paidBy: "company_card", notes: "Johannesburg depot fill-up" },
  ]);

  const expiry90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const expiry20 = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const expired5 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await db.insert(complianceDocsTable).values([
    { orgId, entityType: "truck", entityId: t1.id, docType: "CVR", docNumber: "CVR-ZW-001", expiryDate: expiry90, issuer: "ZINARA" },
    { orgId, entityType: "truck", entityId: t1.id, docType: "Third Party Insurance", docNumber: "TPI-2024-001", expiryDate: expiry20, issuer: "Old Mutual" },
    { orgId, entityType: "truck", entityId: t2.id, docType: "CVR", docNumber: "CVR-ZA-002", expiryDate: expiry90, issuer: "RTMC" },
    { orgId, entityType: "truck", entityId: t3.id, docType: "Carbon Tax Clearance", docNumber: "CTC-ZM-003", expiryDate: expired5, issuer: "ZIMRA" },
    { orgId, entityType: "driver", entityId: d1.id, docType: "Passport", docNumber: "ZW123456", expiryDate: expiry90, issuer: "Zimbabwe Passport Office" },
    { orgId, entityType: "driver", entityId: d1.id, docType: "PrDP", docNumber: "PRDP-ZW-001", expiryDate: expiry20, issuer: "VID Zimbabwe" },
    { orgId, entityType: "driver", entityId: d3.id, docType: "Passport", docNumber: "ZM345678", expiryDate: expiry90, issuer: "Zambia Passport Office" },
  ]);

  await db.insert(fuelPurchasesTable).values([
    { orgId, truckId: t1.id, date: today, country: "ZAF", litres: "350", pricePerLitre: "21.50", currency: "ZAR" },
    { orgId, truckId: t2.id, date: today, country: "ZAF", litres: "280", pricePerLitre: "21.50", currency: "ZAR" },
  ]);

  await db.insert(fxRatesTable).values([
    { orgId, currency: "USD", rateToBase: "18.50", asOf: today },
    { orgId, currency: "ZWG", rateToBase: "0.052", asOf: today },
    { orgId, currency: "ZMW", rateToBase: "0.61", asOf: today },
    { orgId, currency: "BWP", rateToBase: "1.36", asOf: today },
    { orgId, currency: "MZN", rateToBase: "0.29", asOf: today },
  ]);

  await db.insert(borderChargeCatalogTable).values([
    { orgId, borderPost: "Beit Bridge", country: "ZWE", chargeType: "gate_pass", defaultAmount: "350", currency: "USD", appliesTo: "combination" },
    { orgId, borderPost: "Beit Bridge", country: "ZWE", chargeType: "carbon_tax", defaultAmount: "1200", currency: "USD", appliesTo: "combination" },
    { orgId, borderPost: "Beit Bridge", country: "ZWE", chargeType: "third_party_insurance", defaultAmount: "850", currency: "USD", appliesTo: "combination" },
    { orgId, borderPost: "Chirundu", country: "ZMB", chargeType: "gate_pass", defaultAmount: "180", currency: "USD", appliesTo: "combination" },
    { orgId, borderPost: "Chirundu", country: "ZMB", chargeType: "road_access", defaultAmount: "350", currency: "USD", appliesTo: "combination" },
    { orgId, borderPost: "Chirundu", country: "ZMB", chargeType: "transit_fee", defaultAmount: "250", currency: "USD", appliesTo: "combination" },
  ]);

  res.json({ success: true, message: "Demo data seeded with 3 trucks, 3 drivers, 3 loads, 1 active trip, compliance docs, FX rates, fuel purchases, and border catalog." });
});

router.post("/demo/reset", requireAuth, async (req: any, res) => {
  const member = await getOrgMember(req.user.id);
  if (!member) return res.status(404).json({ error: "Org not found" });
  if (member.role !== "owner") return res.status(403).json({ error: "Owner only" });
  const orgId = member.orgId;

  await db.delete(borderChargeCatalogTable).where(eq(borderChargeCatalogTable.orgId, orgId));
  await db.delete(fuelPurchasesTable).where(eq(fuelPurchasesTable.orgId, orgId));
  await db.delete(complianceDocsTable).where(eq(complianceDocsTable.orgId, orgId));
  await db.delete(fxRatesTable).where(eq(fxRatesTable.orgId, orgId));

  const orgLoads = await db.select().from(loadsTable).where(eq(loadsTable.orgId, orgId));
  const orgTrips = await db.select().from(tripsTable).where(eq(tripsTable.orgId, orgId));
  for (const trip of orgTrips) {
    await db.delete(disbursementsTable).where(eq(disbursementsTable.tripId, trip.id));
    await db.delete(tripStopsTable).where(eq(tripStopsTable.tripId, trip.id));
  }
  await db.delete(tripsTable).where(eq(tripsTable.orgId, orgId));
  await db.delete(loadsTable).where(eq(loadsTable.orgId, orgId));

  const orgTrucks = await db.select().from(trucksTable).where(eq(trucksTable.orgId, orgId));
  await db.delete(driversTable).where(eq(driversTable.orgId, orgId));
  await db.delete(trucksTable).where(eq(trucksTable.orgId, orgId));

  res.json({ success: true, message: "All demo data cleared for this org." });
});

export default router;
