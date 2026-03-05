import express from "express";
// import { webhook } from "../controller/twillio";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  deleteOrder,
  deliverOrder,
  getAllOrders,
  getDispatchOrders,
  getMyOrders,
  getOrderById,
  markCancel,
  markPending,
  submitOrder,
  updateOrder,
  updateOrderPriority,
} from "../controller/order";
import { validateRequest } from "../middleware/validateRequest";
import { getMyOrdersValidation } from "../validation";

const router = express.Router();

/**
 * @route GET /orders/my
 * @description Fetch user's orders with pagination, filtering, and sorting
 * @queryParam {number} [page=1] - Page number for pagination
 * @queryParam {number} [limit=10] - Number of orders per page
 * @queryParam {string} [month] - Filter by month (YYYY-MM)
 * @queryParam {string} [orderId] - Search by order ID
 * @queryParam {string} [sortBy] - Sort by pending_first, delivered_first, or latest
 */
router.get(
  "/my-orders",
  authenticateToken,
  getMyOrdersValidation,
  validateRequest,
  getMyOrders
);
/**
 * @route GET /orders/all
 * @description Fetch all orders with pagination, filtering, and sorting (admin only)
 * @access Private (requires admin authentication)
 * @queryParam {number} [page=1] - Page number for pagination
 * @queryParam {number} [limit=10] - Number of orders per page
 * @queryParam {string} [month] - Filter by month (YYYY-MM)
 * @queryParam {string} [orderId] - Search by order ID
 * @queryParam {string} [sortBy] - Sort by pending_first, delivered_first, or latest
 */

router.get(
  "/all-orders",
  authenticateToken,
  getMyOrdersValidation,
  validateRequest,
  getAllOrders
);

router.post("/submit", authenticateToken, submitOrder);
router.patch("/priority/:id", authenticateToken, updateOrderPriority);
router.get("/dispatch", authenticateToken, getDispatchOrders);
router.post("/deliver/:orderId", authenticateToken, deliverOrder);
router.post("/pending/:orderId", authenticateToken, markPending);
router.post("/cancel/:orderId", authenticateToken, markCancel);
router.put("/:id", authenticateToken, updateOrder);
router.delete("/:id", authenticateToken, deleteOrder);
router.get("/:id", authenticateToken, getOrderById);

// WhatsApp webhook
// router.post("/whatsapp/webhook", webhook);

export default router;
