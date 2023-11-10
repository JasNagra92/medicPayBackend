import express, { Router } from "express";
import { getTwoWeekPayPeriodData } from "../controllers/scheduleController";

const router: Router = express.Router();

router.post("/", getTwoWeekPayPeriodData);

export default router;
