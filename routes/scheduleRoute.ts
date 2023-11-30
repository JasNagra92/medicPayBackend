import express, { Router } from "express";
import {
  addHolidaysToNextMonth,
  getHolidayBlock,
  getLateCallData,
  getMonthsPayPeriodData,
  getPartialStiipData,
  getRecallOTShift,
  getRegularOTShift,
  getSingleDaysWorkData,
  getWholeStiipData,
} from "../controllers/scheduleController";

const router: Router = express.Router();

router.post("/", getMonthsPayPeriodData);
router.post("/addHolidayBlock", getHolidayBlock);
router.post("/addHolidayBlockNextMonth", addHolidaysToNextMonth);
router.post("/getDefaultDay", getSingleDaysWorkData);
router.post("/addStiip", getWholeStiipData);
router.post("/addPartialStiip", getPartialStiipData);
router.post("/addOvertime", getLateCallData);
router.post("/addRegularOvertime", getRegularOTShift);
router.post("/addRecallOvertime", getRecallOTShift);

export default router;
