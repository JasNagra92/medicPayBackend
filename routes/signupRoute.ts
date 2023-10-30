import express, { Router } from "express";
import { signupUser } from "../controllers/userController";

const router: Router = express.Router();

router.post("/", signupUser);

export default router;
