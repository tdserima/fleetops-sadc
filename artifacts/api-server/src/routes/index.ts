import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import orgRouter from "./org";
import trucksRouter from "./trucks";
import driversRouter from "./drivers";
import loadsRouter from "./loads";
import tripsRouter from "./trips";
import disbursementsRouter from "./disbursements";
import complianceRouter from "./compliance";
import fuelRouter from "./fuel";
import fxRatesRouter from "./fxRates";
import borderCatalogRouter from "./borderCatalog";
import storageRouter from "./storage";
import dashboardRouter from "./dashboard";
import demoRouter from "./demo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(orgRouter);
router.use(trucksRouter);
router.use(driversRouter);
router.use(loadsRouter);
router.use(tripsRouter);
router.use(disbursementsRouter);
router.use(complianceRouter);
router.use(fuelRouter);
router.use(fxRatesRouter);
router.use(borderCatalogRouter);
router.use(storageRouter);
router.use(dashboardRouter);
router.use(demoRouter);

export default router;
