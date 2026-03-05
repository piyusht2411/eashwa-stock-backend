import { Types } from "mongoose";
import * as notificationService from "./notificationService";
import { IOrder } from "../types";
import Order from "../model/order";

export const createOrder = async (data: Partial<IOrder>): Promise<IOrder> => {
  const order = new Order(data);
  return order.save();
};

export const findOrderByPiNumber = async (
  piNumber: string
): Promise<IOrder | null> => {
  return Order.findOne({ piNumber });
};

export const updateOrder = async (
  id: Types.ObjectId | string,
  updates: Partial<IOrder>
): Promise<IOrder | null> => {
  return Order.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
    context: "query",
  });
};

export const deleteOrder = async (
  id: Types.ObjectId | string
): Promise<IOrder | null> => {
  return Order.findByIdAndDelete(id);
};

export const findOrderById = async (id: Types.ObjectId | string) => {
  return Order.findById(id).populate("submittedBy", "name email").lean(); // Use lean() for better performance since we're just reading
};

export const findOrderBySid = async (sid: string): Promise<IOrder | null> => {
  return Order.findOne({ accountsMessageSid: sid });
};

export const getMyOrders = async (
  userId: Types.ObjectId | string,
  page: number = 1,
  limit: number = 10,
  month?: string,
  orderId?: string,
  sortBy?: string
): Promise<{
  orders: IOrder[];
  totalPages: number;
  totalOrders: number;
}> => {
  const query: any = { submittedBy: new Types.ObjectId(userId) }; // Explicitly convert to ObjectId for safety

if (month) {
  const [year, monthNum] = month.split("-");
  const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(monthNum), 0);   // ← this is the problem line
  query.createdAt = {
    $gte: startDate,
    $lte: endDate,
  };
}

  if (orderId) {
    query.orderId = { $regex: orderId, $options: "i" };
  }

  // Add a field to handle priority sorting with null values at the end
  const addPriorityField = {
    $addFields: {
      sortPriority: {
        $cond: {
          if: { $eq: ["$priority", null] },
          then: Number.MAX_SAFE_INTEGER, // Push null values to the end
          else: "$priority",
        },
      },
    },
  };

  let sortStages: any[] = [];
  if (sortBy === "pending_first") {
    sortStages = [
      addPriorityField,
      {
        $addFields: {
          statusOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "pending"] }, then: 1 },
                { case: { $eq: ["$status", "pending_verification"] }, then: 2 },
                { case: { $eq: ["$status", "payment_received"] }, then: 3 },
                { case: { $eq: ["$status", "payment_not_received"] }, then: 4 },
                { case: { $eq: ["$status", "ready_for_dispatch"] }, then: 5 },
                { case: { $eq: ["$status", "completed"] }, then: 6 },
              ],
              default: 7,
            },
          },
        },
      },
      { $sort: { statusOrder: 1, createdAt: 1 } },
    ];
  } else if (sortBy === "delivered_first") {
    sortStages = [
      addPriorityField,
      {
        $addFields: {
          statusOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "completed"] }, then: 1 },
                { case: { $eq: ["$status", "pending"] }, then: 2 },
                { case: { $eq: ["$status", "pending_verification"] }, then: 3 },
                { case: { $eq: ["$status", "payment_received"] }, then: 4 },
                { case: { $eq: ["$status", "payment_not_received"] }, then: 5 },
                { case: { $eq: ["$status", "ready_for_dispatch"] }, then: 6 },
              ],
              default: 7,
            },
          },
        },
      },
      { $sort: { statusOrder: 1, createdAt: 1 } },
    ];
  } else {
    // Default sorting: priority first (with nulls last), then by recency
    sortStages = [addPriorityField, { $sort: { createdAt: 1 } }];
  }

  const skip = (page - 1) * limit;

  const [orders, totalOrders] = await Promise.all([
    Order.aggregate([
      { $match: query },
      ...sortStages,
      { $skip: skip },
      { $limit: limit },
      { $project: { statusOrder: 0 } }, // Remove temporary fields
    ]),
    Order.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalOrders / limit);

  return {
    orders,
    totalPages,
    totalOrders,
  };
};

/**
 * Fetch all orders with pagination, filtering, and sorting (admin only)
 * @param page Page number for pagination
 * @param limit Number of orders per page
 * @param month Filter by month (YYYY-MM)
 * @param orderId Search by order ID
 * @param sortBy Sort by pending_first, delivered_first, or latest
 * @returns Object containing orders, total pages, and total orders
 */

export const getAllOrders = async (
  page: number = 1,
  limit: number = 10,
  month?: string,
  orderId?: string,
  sortBy?: string,
  username?:string
): Promise<{
  orders: IOrder[];
  totalPages: number;
  totalOrders: number;
}> => {
  const query: any = {};

if (month) {
  const [yearStr, monthStr] = month.split("-");
  const y = parseInt(yearStr);
  const m = parseInt(monthStr) - 1;

  const startDate = new Date(Date.UTC(y, m, 1));
  const endDate   = new Date(Date.UTC(y, m + 1, 1));

  query.createdAt = { $gte: startDate, $lt: endDate };
}

  if (orderId) {
    query.orderId = { $regex: orderId, $options: "i" };
  }

  // Exclude completed orders unless sortBy is "delivered_first"
  // ────── STATUS FILTERING ──────
  const excludedForAll = sortBy !== "delivered_first" ? ["completed"] : [];
  const extraExcludedForDispatch = username === "EASWS0A30"
    ? ["pending_verification", "payment_not_received"]
    : [];

  const allExcluded = [...excludedForAll, ...extraExcludedForDispatch];

  if (allExcluded.length > 0) {
    query.status = { $nin: allExcluded };
  }

  // Add a field to handle priority sorting with null values at the end
  const addPriorityField = {
    $addFields: {
      sortPriority: {
        $cond: {
          if: { $eq: ["$priority", null] },
          then: Number.MAX_SAFE_INTEGER, // Push null values to the end
          else: "$priority",
        },
      },
    },
  };

  let sortStages: any[] = [];
  if (sortBy === "pending_first") {
    sortStages = [
      addPriorityField,
      {
        $addFields: {
          statusOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "pending"] }, then: 1 },
                { case: { $eq: ["$status", "pending_verification"] }, then: 2 },
                { case: { $eq: ["$status", "payment_received"] }, then: 3 },
                { case: { $eq: ["$status", "payment_not_received"] }, then: 4 },
                { case: { $eq: ["$status", "ready_for_dispatch"] }, then: 5 },
                { case: { $eq: ["$status", "completed"] }, then: 6 },
              ],
              default: 7,
            },
          },
        },
      },
      { $sort: { statusOrder: 1, createdAt: 1 } },
    ];
  } else if (sortBy === "delivered_first") {
    sortStages = [
      addPriorityField,
      {
        $addFields: {
          statusOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "completed"] }, then: 1 },
                { case: { $eq: ["$status", "pending"] }, then: 2 },
                { case: { $eq: ["$status", "pending_verification"] }, then: 3 },
                { case: { $eq: ["$status", "payment_received"] }, then: 4 },
                { case: { $eq: ["$status", "payment_not_received"] }, then: 5 },
                { case: { $eq: ["$status", "ready_for_dispatch"] }, then: 6 },
              ],
              default: 7,
            },
          },
        },
      },
      { $sort: { statusOrder: 1, createdAt: 1 } },
    ];
  } else {
    // Default sorting: priority first (with nulls last), then by recency
    sortStages = [addPriorityField, { $sort: { createdAt: 1 } }];
  }

  const skip = (page - 1) * limit;

  const [orders, totalOrders] = await Promise.all([
    Order.aggregate([
      { $match: query },
      ...sortStages,
      { $skip: skip },
      { $limit: limit },
      { $project: { statusOrder: 0 } },
    ]),
    Order.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalOrders / limit);

  return {
    orders,
    totalPages,
    totalOrders,
  };
};

export const getDispatchOrders = async (filters: {
  month?: number;
  orderId?: string;
}): Promise<IOrder[]> => {
  const now = new Date();
  const overdueQuery = {
    status: { $in: ["ready_for_dispatch", "pending"] },
    deadline: { $lt: now },
    reminderSent: false,
  };
  const overdueOrders = await Order.find(overdueQuery);

  for (const order of overdueOrders as IOrder[]) {
    await notificationService.sendReminderToDispatch(order);
    //@ts-ignore
    await updateOrder(order._id, { reminderSent: true });
  }

  const query: any = {
    status: { $in: ["ready_for_dispatch", "pending", "completed"] },
  };
  if (filters.month) {
    const year = new Date().getFullYear();
    query.createdAt = {
      $gte: new Date(year, filters.month - 1, 1),
      $lt: new Date(year, filters.month, 1),
    };
  }
  if (filters.orderId) {
    query.orderId = { $regex: filters.orderId, $options: "i" };
  }
  return Order.find(query).sort({ createdAt: -1 });
};
