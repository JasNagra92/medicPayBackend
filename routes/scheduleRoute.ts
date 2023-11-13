import express, { Router } from "express";
import {
  getMonthsPayPeriodData,
  getPartialStiipData,
  getSingleDaysWorkData,
  getWholeStiipData,
} from "../controllers/scheduleController";

const router: Router = express.Router();

router.post("/", getMonthsPayPeriodData);
router.post("/getDefaultDay", getSingleDaysWorkData);
router.post("/addStiip", getWholeStiipData);
router.post("/addPartialStiip", getPartialStiipData);

export default router;
