import express, { Router } from "express";
import {
  getTwoWeekPayPeriodData,
  getWholeStiipData,
} from "../controllers/scheduleController";

const router: Router = express.Router();

router.post("/", getTwoWeekPayPeriodData);
router.post("/addStiip", getWholeStiipData);

export default router;
