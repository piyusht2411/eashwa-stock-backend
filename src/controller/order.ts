import { Request, Response } from "express";
import * as orderService from "../services/orderService";
import * as notificationService from "../services/notificationService";
import Order from "../model/order";
import User from "../model/user";

export const submitOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.body;
    if (!data.piPdf) {
      res
        .status(400)
        .json({ success: false, message: "PI PDF URL is required." });
      return;
    }

    const existingOrder = await orderService.findOrderByPiNumber(data.piNumber);
    if (existingOrder) {
      res.status(409).json({
        success: false,
        message: `Order with PI Number ${data.piNumber} already exists.`,
      });
      return;
    }

    const orderData = {
      ...data,
      quantity: parseInt(data.quantity),
      totalAmount: parseFloat(data.totalAmount),
      amountReceived: parseFloat(data.amountReceived),
      deadline: new Date(data.deadline),
      piPdf: data.piPdf,
      submittedBy: req.userId,
    };
    const order = await orderService.createOrder(orderData);
    const sid = await notificationService.sendAccountsVerificationNotification(
      order
    );
    //@ts-ignore
    await orderService.updateOrder(order._id, { accountsMessageSid: sid });
    res.status(200).json({ success: true, order });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to submit order.", error });
  }
};

export const deliverOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { driverNumber, vehicleNumber, transporterName } = req.body;
    const order = await orderService.findOrderById(req.params.orderId);
    if (
      !order ||
      (order.status !== "ready_for_dispatch" && order.status !== "pending")
    ) {
      res
        .status(400)
        .json({ success: false, message: "Invalid order status." });
      return;
    }
    const updatedOrder = await orderService.updateOrder(req.params.orderId, {
      status: "completed",
      driverNumber,
      vehicleNumber,
      transporterName,
      pendingReason: "-",
    });
    if (updatedOrder) {
      await notificationService.sendDeepakConfirmation(updatedOrder);
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to confirm delivery.", error });
  }
};

export const markPending = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { pendingReason } = req.body;
    if (
      !pendingReason ||
      typeof pendingReason !== "string" ||
      !pendingReason.trim()
    ) {
      res
        .status(400)
        .json({ success: false, message: "Pending reason is required." });
      return;
    }
    const order = await orderService.findOrderById(req.params.orderId);
    if (!order || order.status !== "ready_for_dispatch") {
      res
        .status(400)
        .json({ success: false, message: "Invalid order status." });
      return;
    }
    await orderService.updateOrder(req.params.orderId, {
      status: "pending",
      pendingReason,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to mark as pending.", error });
  }
};

export const markCancel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cancelReason } = req.body;
    if (
      !cancelReason ||
      typeof cancelReason !== "string" ||
      !cancelReason.trim()
    ) {
      res
        .status(400)
        .json({ success: false, message: "Cancel reason is required." });
      return;
    }
    const order = await orderService.findOrderById(req.params.orderId);
    if (!order || order.status !== "ready_for_dispatch") {
      res
        .status(400)
        .json({ success: false, message: "Invalid order status." });
      return;
    }
    await orderService.updateOrder(req.params.orderId, {
      status: "cancelled",
      cancelReason,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to Cancel Order.", error });
  }
};

export const getMyOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(400).json({ success: false, message: "User ID is required." });
      return;
    }

    // Extract query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const month = req.query.month as string; // Format: YYYY-MM
    const orderId = req.query.orderId as string;
    const sortBy = req.query.sortBy as string; // pending_first, delivered_first, or latest

    const result = await orderService.getMyOrders(
      req.userId as string,
      page,
      limit,
      month,
      orderId,
      sortBy
    );

    res.status(200).json({
      success: true,
      orders: result.orders,
      totalPages: result.totalPages,
      currentPage: page,
      totalOrders: result.totalOrders,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch orders.", error });
  }
};

/**
 * Fetch all orders with pagination, filtering, and sorting (admin only)
 * @param req Express request object
 * @param res Express response object
 */
export const getAllOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const month = req.query.month as string;
    const orderId = req.query.orderId as string;
    const sortBy = req.query.sortBy as string;
    const username = req.query.username as string;

    const result = await orderService.getAllOrders(
      page,
      limit,
      month,
      orderId,
      sortBy,
      username
    );

    res.status(200).json({
      success: true,
      orders: result.orders,
      totalPages: result.totalPages,
      currentPage: page,
      totalOrders: result.totalOrders,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch all orders.", error });
  }
};

export const getDispatchOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { month, orderId } = req.query;
    const filters = {
      month: month ? parseInt(month as string) : undefined,
      orderId: orderId as string | undefined,
    };
    const orders = await orderService.getDispatchOrders(filters);
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dispatch orders.",
      error,
    });
  }
};

export const updateOrderPriority = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (typeof priority !== "number" || priority < 1) {
      res.status(400).json({
        success: false,
        message: "Priority must be a positive number.",
      });
      return;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { priority },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Priority updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update priority.", error });
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user || !["admin"].includes(user.role)) {
      return res.status(403).json({
        message: "Access denied. Only HR and admin can update targets.",
      });
    }
    const updateData = req.body;

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    // Validate required fields for specific updates
    if (updateData.status === "completed" && !updateData.remark) {
      return res.status(400).json({
        success: false,
        message: "Remark is required when marking order as completed.",
      });
    }

    if (
      updateData.amountReceived &&
      updateData.amountReceived > updateData.totalAmount
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount received cannot exceed total amount.",
      });
    }

    // Check if order exists
    const existingOrder = await orderService.findOrderById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Prepare update data with proper type conversion
    const processedUpdateData = {
      ...updateData,
      quantity: updateData.quantity ? parseInt(updateData.quantity) : undefined,
      totalAmount: updateData.totalAmount
        ? parseFloat(updateData.totalAmount)
        : undefined,
      amountReceived: updateData.amountReceived
        ? parseFloat(updateData.amountReceived)
        : undefined,
      deadline: updateData.deadline ? new Date(updateData.deadline) : undefined,
      priority: updateData.priority ? parseInt(updateData.priority) : undefined,
    };

    // Remove undefined values
    Object.keys(processedUpdateData).forEach((key) => {
      if (processedUpdateData[key] === undefined) {
        delete processedUpdateData[key];
      }
    });

    // Ensure at least one field to update
    if (Object.keys(processedUpdateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const updatedOrder = await orderService.updateOrder(
      id,
      processedUpdateData
    );

    return res.status(200).json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("Error updating order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order.",
      error: error.message,
    });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user || !["admin"].includes(user.role)) {
      return res.status(403).json({
        message: "Access denied. Only HR and admin can update targets.",
      });
    }

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    // Check if order exists and get order details
    const existingOrder = await orderService.findOrderById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Prevent deletion of completed orders
    if (existingOrder.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete completed orders.",
      });
    }

    // Check if order has been dispatched
    if (existingOrder.vehicleNumber || existingOrder.driverNumber) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete dispatched orders.",
      });
    }

    const deletedOrder = await orderService.deleteOrder(id);

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      order: deletedOrder,
    });
  } catch (error: any) {
    console.error("Error deleting order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete order.",
      error: error.message,
    });
  }
};

// GET Order by ID
export const getOrderById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
      return;
    }

    // Fetch order with populated user data
    const order = await orderService.findOrderById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found.",
      });
      return;
    }

    // Transform data for frontend - handle both Mongoose document and plain object
    let orderData: any = order;

    // If it's a Mongoose document (without lean), convert to plain object
    if (typeof (order as any).toObject === "function") {
      orderData = (order as any).toObject();
    }
    // If it's already a plain object (from lean), use as-is
    // orderData is already a plain object

    // Transform date for frontend (datetime-local input format)
    const transformedOrderData = {
      ...orderData,
      deadline: orderData.deadline
        ? new Date(orderData.deadline).toISOString().slice(0, 16)
        : "",
      // Convert numbers back to strings for form inputs
      quantity: orderData.quantity?.toString() || "",
      totalAmount: orderData.totalAmount?.toString() || "",
      amountReceived: orderData.amountReceived?.toString() || "",
      priority:
        orderData.priority !== null && orderData.priority !== undefined
          ? orderData.priority.toString()
          : "",
      // Ensure piPdf is always a string
      piPdf: orderData.piPdf || "",
      // Include additional fields that might be useful
      status: orderData.status || "",
      remark: orderData.remark || "",
      pendingReason: orderData.pendingReason || "",
      // Virtual field for pendency
      pendency:
        orderData.deadline &&
        new Date(orderData.deadline) < new Date() &&
        orderData.status !== "completed",
    };

    // Remove _id if you don't want to send it, or keep it for reference
    // delete transformedOrderData._id;

    res.status(200).json({
      success: true,
      order: transformedOrderData,
    });
  } catch (error: any) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order.",
      error: error.message,
    });
  }
};
