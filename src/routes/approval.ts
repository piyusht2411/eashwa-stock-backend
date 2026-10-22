import express from "express";
import { getApprovals } from "../controller/approval";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

// Combined Orders + Tickets approval list for the mobile app (admin and guard)
router.get("/", authenticateToken, getApprovals);

export default router;
