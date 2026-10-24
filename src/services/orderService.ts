import { Types } from "mongoose";
import { sendNotificationToRole } from "./pushService";
import { IOrder } from "../types";
import Order from "../model/order";
import { AppRole } from "../config/appRoles";

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
    await sendNotificationToRole(
      "dispatch",
      "⏰ Order Past Deadline",
      `Order ${order.orderId} (${order.partyName}) is past its deadline and still pending.`,
      { orderId: String(order._id), type: "order_reminder" }
    );
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

// Orders an admin has sent back to the dispatch head at least once
const ADMIN_REJECTED = { approvalHistory: { $elemMatch: { stage: "admin", action: "rejected" } } };

// Currently rejected by admin: sent back and not yet re-dispatched or approved.
// Shared by the Orders tab and the combined All Approvals screen so counts match.
export const ADMIN_REJECTED_NOW = {
  status: { $nin: ["completed", "pending_admin_approval"] },
  ...ADMIN_REJECTED,
};

// Filter pills shown in the app for each role. The first one is the default.
// Every list shows the most recently updated order first.
// Service only works on tickets, so it has no order filters
export type OrderAppRole = Exclude<AppRole, "service">;

export const APP_ORDER_FILTERS: Record<OrderAppRole, Record<string, { query: any }>> = {
  accounts: {
    to_verify: { query: { status: "pending_verification" } },
    approved: {
      query: { status: { $in: ["ready_for_dispatch", "pending", "pending_admin_approval", "completed", "cancelled"] } },
    },
    rejected: { query: { status: "payment_not_received" } },
  },
  dispatch: {
    to_dispatch: { query: { status: "ready_for_dispatch" } },
    on_hold: { query: { status: "pending" } },
    sent_for_approval: { query: { status: "pending_admin_approval" } },
    // Accounts approval clears rejectionReason, so a reason here comes from the admin
    rejected_by_admin: { query: { status: { $in: ["ready_for_dispatch", "pending"] }, rejectionReason: { $nin: [null, ""] } } },
    cancelled: { query: { status: "cancelled" } },
  },
  // Orders waiting for admin approval are handled in the combined All Approvals screen
  admin: {
    approved: { query: { status: "completed" } },
    rejected: { query: ADMIN_REJECTED_NOW },
    all: { query: {} },
  },
  // Guards only ever see admin-approved orders
  guard: {
    approved: { query: { status: "completed" } },
  },
};

export const canGuardSeeOrder = async (id: string) => !!(await Order.exists({ _id: id, ...APP_ORDER_FILTERS.guard.approved.query }));

export const getAppOrders = async (
  role: OrderAppRole,
  filter: string,
  page: number,
  limit: number,
  month?: string,
  search?: string
) => {
  const filters = APP_ORDER_FILTERS[role];
  const selected = filters[filter] ?? Object.values(filters)[0];
  const conditions: any[] = [selected.query];

  if (month) {
    const [year, monthNum] = month.split("-").map(Number);
    conditions.push({ createdAt: { $gte: new Date(year, monthNum - 1, 1), $lt: new Date(year, monthNum, 1) } });
  }

  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    conditions.push({ $or: [{ orderId: pattern }, { piNumber: pattern }, { partyName: pattern }] });
  }

  const query = { $and: conditions };

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ updatedAt: -1 }) // newest first
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("submittedBy", "name email"),
    Order.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    orders,
    pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
};
