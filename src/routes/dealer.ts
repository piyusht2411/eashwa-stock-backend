import express from "express";
import {
  createDealer,
  getDealers,
  getDealerById,
  updateDealer,
  deleteDealer,
} from "../controller/dealer";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticateToken, createDealer);
router.get("/", authenticateToken, getDealers);
router.get("/:id", authenticateToken, getDealerById);
router.put("/:id", authenticateToken, updateDealer);
router.delete("/:id", authenticateToken, deleteDealer);

export default router;
