import express, { Router } from "express";
import {
  getLateCallData,
  getMonthsPayPeriodData,
  getPartialStiipData,
  getRegularOTShift,
  getSingleDaysWorkData,
  getWholeStiipData,
} from "../controllers/scheduleController";

const router: Router = express.Router();

router.post("/", getMonthsPayPeriodData);
router.post("/getDefaultDay", getSingleDaysWorkData);
router.post("/addStiip", getWholeStiipData);
router.post("/addPartialStiip", getPartialStiipData);
router.post("/addOvertime", getLateCallData);
router.post("/addRegularOvertime", getRegularOTShift);

export default router;
