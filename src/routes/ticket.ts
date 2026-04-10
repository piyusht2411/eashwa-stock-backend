import express from "express";
import {
  createTicket,
  getMyTickets,
  getTickets,
  getTicketById,
  updateTicketStatus,
} from "../controller/ticket";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/create", authenticateToken, createTicket);
router.get("/", authenticateToken, getTickets);
router.get("/my-ticket", authenticateToken, getMyTickets);
router.get("/:id", authenticateToken, getTicketById);
router.patch("/:id/status", authenticateToken, updateTicketStatus);

export default router;
