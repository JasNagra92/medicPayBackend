import express, { Router } from "express";
import { saveUser } from "../controllers/userController";

const router: Router = express.Router();

router.post("/saveUser", saveUser);

export default router;
