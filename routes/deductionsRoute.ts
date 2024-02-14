import { Router } from "express";
import express from "express";
import {
  getDeductions,
  getYTD,
  getSickHours,
} from "../controllers/deductionsController";

const router: Router = express.Router();

router.post("/", getDeductions);
router.post("/getYTD", getYTD);
router.post("/getSickHours", getSickHours);

export default router;
