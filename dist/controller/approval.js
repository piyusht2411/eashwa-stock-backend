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
exports.getApprovals = void 0;
const order_1 = __importDefault(require("../model/order"));
const ticket_1 = __importDefault(require("../model/ticket"));
const user_1 = __importDefault(require("../model/user"));
const appRoles_1 = require("../config/appRoles");
const orderService_1 = require("../services/orderService");
const ORDER_QUERIES = {
    to_approve: { status: "pending_admin_approval" },
    approved: { status: "completed" },
    rejected: orderService_1.ADMIN_REJECTED_NOW,
};
const TICKET_QUERIES = {
    to_approve: { approvalStatus: "pending" },
    approved: { approvalStatus: "approved" },
    rejected: { approvalStatus: "rejected" },
};
const APPROVAL_STATUS = {
    to_approve: "pending",
    approved: "approved",
    rejected: "rejected",
};
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getApprovals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_1.default.findById(req.userId).select("role email employeeId");
        const appRole = (0, appRoles_1.getAppRole)(user);
        if (appRole !== "admin" && appRole !== "guard") {
            res.status(403).json({ success: false, message: "You are not allowed to view approvals." });
            return;
        }
        // Guards only see approved entries
        const requested = req.query.filter;
        const filter = appRole === "guard" ? "approved" : requested in ORDER_QUERIES ? requested : "to_approve";
        const isExport = req.query.export === "true";
        const page = isExport ? 1 : Math.max(1, parseInt(req.query.page) || 1);
        const limit = isExport ? 5000 : Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const orderQuery = [ORDER_QUERIES[filter]];
        const ticketQuery = [TICKET_QUERIES[filter]];
        const month = req.query.month;
        if (/^\d{4}-\d{2}$/.test(month || "")) {
            const [year, monthNum] = month.split("-").map(Number);
            const range = { $gte: new Date(year, monthNum - 1, 1), $lt: new Date(year, monthNum, 1) };
            orderQuery.push({ createdAt: range });
            ticketQuery.push({ complainDate: range });
        }
        const search = (req.query.search || "").trim();
        if (search) {
            const pattern = new RegExp(escapeRegex(search), "i");
            orderQuery.push({ $or: [{ orderId: pattern }, { piNumber: pattern }, { partyName: pattern }] });
            ticketQuery.push({
                $or: [
                    { dealerName: pattern },
                    { location: pattern },
                    ...(/^\d+$/.test(search) ? [{ ticketId: Number(search) }] : []),
                ],
            });
        }
        // Newest first, so the item a notification was just sent for is at the top
        const take = page * limit; // enough from each side to fill the requested page after merging
        const [orders, tickets, orderTotal, ticketTotal] = yield Promise.all([
            order_1.default.find({ $and: orderQuery })
                .sort({ updatedAt: -1 })
                .limit(take)
                .populate("submittedBy", "name email"),
            ticket_1.default.find({ $and: ticketQuery })
                .sort({ updatedAt: -1 })
                .limit(take)
                .populate("submittedBy", "name email")
                .populate("dealer", "name phone location"),
            order_1.default.countDocuments({ $and: orderQuery }),
            ticket_1.default.countDocuments({ $and: ticketQuery }),
        ]);
        const approvalStatus = APPROVAL_STATUS[filter];
        const items = [
            ...orders.map((o) => ({ kind: "order", approvalStatus, sortDate: o.get("updatedAt"), data: o })),
            ...tickets.map((t) => ({ kind: "ticket", approvalStatus, sortDate: t.get("updatedAt"), data: t })),
        ]
            .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
            .slice((page - 1) * limit, page * limit);
        const total = orderTotal + ticketTotal;
        const totalPages = Math.ceil(total / limit);
        res.status(200).json({
            success: true,
            filter,
            items,
            counts: { orders: orderTotal, tickets: ticketTotal },
            pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch approvals.", error: error.message });
    }
});
exports.getApprovals = getApprovals;
