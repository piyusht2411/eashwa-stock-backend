import express from "express";
import {
  createDailyLead,
  getAllDailyLeads,
  getDailyLeadsByUser,
  updateDailyLead,
  deleteDailyLead,
  getDailyLeadById,
} from "../controller/dailyLeadController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticateToken, createDailyLead);
router.get("/", authenticateToken, getAllDailyLeads);
router.get("/user/:userId", authenticateToken, getDailyLeadsByUser);
router.get("/:id", authenticateToken, getDailyLeadById);
router.put("/:id", authenticateToken, updateDailyLead);
router.delete("/:id", authenticateToken, deleteDailyLead);

export default router;