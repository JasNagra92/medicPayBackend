import express, { Router } from "express";
import { loginUser } from "../controllers/userController";

const router: Router = express.Router();

router.post("/", loginUser);

export default router;
