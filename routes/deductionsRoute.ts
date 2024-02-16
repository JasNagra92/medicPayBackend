import { Router } from "express";
import express from "express";
import {
  getDeductions,
  getYTD,
  getSickHours,
  getOTHours,
  resetDeductions,
} from "../controllers/deductionsController";

const router: Router = express.Router();

router.post("/", getDeductions);
router.post("/getYTD", getYTD);
router.post("/getSickHours", getSickHours);
router.post("/getOTHours", getOTHours);
router.post("/resetDeductions", resetDeductions);

export default router;
