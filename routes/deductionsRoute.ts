import { Router } from "express";
import express from "express";
import { getDeductions } from "../controllers/deductionsController";

const router: Router = express.Router();

router.post("/", getDeductions);

export default router;
