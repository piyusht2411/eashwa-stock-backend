import express from "express";
import {
  createTicket,
  getMyTickets,
  getTickets,
  getTicketById,
  getTicketsByMonthForExport,
  updateTicket,
  updateTicketStatus,
} from "../controller/ticket";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/create", authenticateToken, createTicket);
router.get("/", authenticateToken, getTickets);
router.get("/my-ticket", authenticateToken, getMyTickets);
router.get("/export-by-month", authenticateToken, getTicketsByMonthForExport);
router.get("/:id", authenticateToken, getTicketById);
router.patch("/:id/status", authenticateToken, updateTicketStatus);
router.patch("/:id", authenticateToken, updateTicket);

export default router;
