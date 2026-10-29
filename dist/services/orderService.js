"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppOrders = exports.canGuardSeeOrder = exports.APP_ORDER_FILTERS = exports.ADMIN_REJECTED_NOW = exports.getDispatchOrders = exports.getAllOrders = exports.getMyOrders = exports.findOrderById = exports.deleteOrder = exports.updateOrder = exports.findOrderByPiNumber = exports.createOrder = void 0;
const mongoose_1 = require("mongoose");
const pushService_1 = require("./pushService");
const order_1 = __importDefault(require("../model/order"));
const createOrder = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const order = new order_1.default(data);
    return order.save();
});
exports.createOrder = createOrder;
const findOrderByPiNumber = (piNumber) => __awaiter(void 0, void 0, void 0, function* () {
    return order_1.default.findOne({ piNumber });
});
exports.findOrderByPiNumber = findOrderByPiNumber;
const updateOrder = (id, updates) => __awaiter(void 0, void 0, void 0, function* () {
    return order_1.default.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
        context: "query",
    });
});
exports.updateOrder = updateOrder;
const deleteOrder = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return order_1.default.findByIdAndDelete(id);
});
exports.deleteOrder = deleteOrder;
const findOrderById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return order_1.default.findById(id).populate("submittedBy", "name email").lean(); // Use lean() for better performance since we're just reading
});
exports.findOrderById = findOrderById;
const getMyOrders = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, page = 1, limit = 10, month, orderId, sortBy) {
    const query = { submittedBy: new mongoose_1.Types.ObjectId(userId) }; // Explicitly convert to ObjectId for safety
    if (month) {
        const [year, monthNum] = month.split("-");
        const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0); // ← this is the problem line
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
    let sortStages = [];
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
    }
    else if (sortBy === "delivered_first") {
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
    }
    else {
        // Default sorting: priority first (with nulls last), then by recency
        sortStages = [addPriorityField, { $sort: { createdAt: 1 } }];
    }
    const skip = (page - 1) * limit;
    const [orders, totalOrders] = yield Promise.all([
        order_1.default.aggregate([
            { $match: query },
            ...sortStages,
            { $skip: skip },
            { $limit: limit },
            { $project: { statusOrder: 0 } }, // Remove temporary fields
        ]),
        order_1.default.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalOrders / limit);
    return {
        orders,
        totalPages,
        totalOrders,
    };
});
exports.getMyOrders = getMyOrders;
/**
 * Fetch all orders with pagination, filtering, and sorting (admin only)
 * @param page Page number for pagination
 * @param limit Number of orders per page
 * @param month Filter by month (YYYY-MM)
 * @param orderId Search by order ID
 * @param sortBy Sort by pending_first, delivered_first, or latest
 * @returns Object containing orders, total pages, and total orders
 */
const getAllOrders = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, limit = 10, month, orderId, sortBy, username) {
    const query = {};
    if (month) {
        const [yearStr, monthStr] = month.split("-");
        const y = parseInt(yearStr);
        const m = parseInt(monthStr) - 1;
        const startDate = new Date(Date.UTC(y, m, 1));
        const endDate = new Date(Date.UTC(y, m + 1, 1));
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
    let sortStages = [];
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
    }
    else if (sortBy === "delivered_first") {
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
    }
    else {
        // Default sorting: priority first (with nulls last), then by recency
        sortStages = [addPriorityField, { $sort: { createdAt: 1 } }];
    }
    const skip = (page - 1) * limit;
    const [orders, totalOrders] = yield Promise.all([
        order_1.default.aggregate([
            { $match: query },
            ...sortStages,
            { $skip: skip },
            { $limit: limit },
            { $project: { statusOrder: 0 } },
        ]),
        order_1.default.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalOrders / limit);
    return {
        orders,
        totalPages,
        totalOrders,
    };
});
exports.getAllOrders = getAllOrders;
const getDispatchOrders = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const overdueQuery = {
        status: { $in: ["ready_for_dispatch", "pending"] },
        deadline: { $lt: now },
        reminderSent: false,
    };
    const overdueOrders = yield order_1.default.find(overdueQuery);
    for (const order of overdueOrders) {
        yield (0, pushService_1.sendNotificationToRole)("dispatch", "⏰ Order Past Deadline", `Order ${order.orderId} (${order.partyName}) is past its deadline and still pending.`, { orderId: String(order._id), type: "order_reminder" });
        //@ts-ignore
        yield (0, exports.updateOrder)(order._id, { reminderSent: true });
    }
    const query = {
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
    return order_1.default.find(query).sort({ createdAt: -1 });
});
exports.getDispatchOrders = getDispatchOrders;
// Orders an admin has sent back to the dispatch head at least once
const ADMIN_REJECTED = { approvalHistory: { $elemMatch: { stage: "admin", action: "rejected" } } };
// Currently rejected by admin: sent back and not yet re-dispatched or approved.
// Shared by the Orders tab and the combined All Approvals screen so counts match.
exports.ADMIN_REJECTED_NOW = Object.assign({ status: { $nin: ["completed", "pending_admin_approval"] } }, ADMIN_REJECTED);
exports.APP_ORDER_FILTERS = {
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
        rejected: { query: exports.ADMIN_REJECTED_NOW },
        all: { query: {} },
    },
    // Guards only ever see admin-approved orders
    guard: {
        approved: { query: { status: "completed" } },
    },
};
// Guards see approved orders plus the in-progress ones listed in their All tab
const canGuardSeeOrder = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return !!(yield order_1.default.exists({
        _id: id,
        status: { $in: ["completed", "pending_admin_approval", "ready_for_dispatch", "pending_verification", "pending"] },
    }));
});
exports.canGuardSeeOrder = canGuardSeeOrder;
const getAppOrders = (role, filter, page, limit, month, search) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const filters = exports.APP_ORDER_FILTERS[role];
    const selected = (_a = filters[filter]) !== null && _a !== void 0 ? _a : Object.values(filters)[0];
    const conditions = [selected.query];
    if (month) {
        const [year, monthNum] = month.split("-").map(Number);
        conditions.push({ createdAt: { $gte: new Date(year, monthNum - 1, 1), $lt: new Date(year, monthNum, 1) } });
    }
    if (search) {
        const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        conditions.push({ $or: [{ orderId: pattern }, { piNumber: pattern }, { partyName: pattern }] });
    }
    const query = { $and: conditions };
    const [orders, total] = yield Promise.all([
        order_1.default.find(query)
            .sort({ updatedAt: -1 }) // newest first
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("submittedBy", "name email"),
        order_1.default.countDocuments(query),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
        orders,
        pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    };
});
exports.getAppOrders = getAppOrders;
