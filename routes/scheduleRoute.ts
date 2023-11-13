import express, { Router } from "express";
import {
  getMonthsPayPeriodData,
  getWholeStiipData,
} from "../controllers/scheduleController";

const router: Router = express.Router();

router.post("/", getMonthsPayPeriodData);
router.post("/addStiip", getWholeStiipData);

export default router;
