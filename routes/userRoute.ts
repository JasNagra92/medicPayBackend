import express, { Router } from "express";
import { saveUser, getUser } from "../controllers/userController";

const router: Router = express.Router();

router.post("/saveUser", saveUser);
router.post("/getUser", getUser);

export default router;
