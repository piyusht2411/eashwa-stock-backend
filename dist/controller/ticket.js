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
exports.updateTicketApproval = exports.getMyTickets = exports.updateTicket = exports.getTicketById = exports.getTicketsByMonthForExport = exports.updateTicketStatus = exports.getTickets = exports.createTicket = void 0;
const ticketService_1 = require("../services/ticketService");
const ticket_1 = __importDefault(require("../model/ticket"));
const user_1 = __importDefault(require("../model/user"));
const pushService_1 = require("../services/pushService");
const notifyAdminsForApproval = (ticket) => (0, pushService_1.sendNotificationToRole)("admin", "📝 Ticket Awaiting Approval", `Ticket #${ticket.ticketId} for ${ticket.dealerName} (${ticket.location}) was closed by service and needs your approval.`, {
    ticketId: String(ticket._id),
    ticketNumber: String(ticket.ticketId),
    type: "ticket_approval",
    status: ticket.status,
    screen: "TicketDetail",
});
// Service gets the ticket in the app; data matches the admin notification so taps open the detail
const notifyService = (ticket, title, body, type) => (0, pushService_1.sendNotificationToRole)("service", title, body, {
    ticketId: String(ticket._id),
    ticketNumber: String(ticket.ticketId),
    type,
    status: ticket.status,
    screen: "TicketDetail",
});
const createTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        if (req.userId) {
            data.submittedBy = req.userId;
        }
        else {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const ticket = yield (0, ticketService_1.createTicketService)(data);
        yield notifyService(ticket, "🎫 New Ticket", `Ticket #${ticket.ticketId} raised for ${ticket.dealerName} (${ticket.location}).`, "ticket_new");
        res.status(201).json({ message: "Ticket raised successfully", ticket });
    }
    catch (error) {
        res.status(500).json({ message: "Error creating ticket", error });
    }
});
exports.createTicket = createTicket;
const getTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = Object.assign({}, req.query);
        const user = yield user_1.default.findById(req.userId).select("role");
        if ((user === null || user === void 0 ? void 0 : user.role) === "guard") {
            filters.approvalStatus = "approved";
        }
        const result = yield (0, ticketService_1.getAllTicketsService)(filters);
        res.json(Object.assign({ message: "Tickets fetched successfully" }, result));
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching tickets", error });
    }
});
exports.getTickets = getTickets;
const updateTicketStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, warrantyStatus, statusRemark } = req.body;
        // Remark is required when closing as Out of Warranty
        if (warrantyStatus === "Out of Warranty" && !(statusRemark === null || statusRemark === void 0 ? void 0 : statusRemark.trim())) {
            res.status(400).json({ message: "Status remark is required when setting Out of Warranty" });
            return;
        }
        const ticket = yield (0, ticketService_1.updateTicketStatusService)(id, status, warrantyStatus, statusRemark);
        if (!ticket) {
            res.status(404).json({ message: "Ticket not found" });
            return;
        }
        if (ticket.status !== "Pending") {
            yield notifyAdminsForApproval(ticket);
        }
        res.json({ message: "Status updated", ticket });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating status", error });
    }
});
exports.updateTicketStatus = updateTicketStatus;
const getTicketsByMonthForExport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month: monthStr, year: yearStr, status } = req.query;
        const query = {};
        let month = null;
        let year = null;
        if (monthStr && yearStr) {
            month = parseInt(monthStr);
            year = parseInt(yearStr);
            if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 2020 || year > 2030) {
                res.status(400).json({ success: false, message: "Invalid month (1-12) or year" });
                return;
            }
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
            query.complainDate = { $gte: startOfMonth, $lte: endOfMonth };
        }
        if (status && ["Pending", "Complete", "Out of Warranty"].includes(status)) {
            query.status = status;
        }
        const tickets = yield ticket_1.default.find(query)
            .sort({ complainDate: -1 })
            .populate("submittedBy", "name email");
        res.status(200).json({
            success: true,
            count: tickets.length,
            month,
            year,
            status: status || "all",
            data: tickets,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch tickets for export", error: error.message });
    }
});
exports.getTicketsByMonthForExport = getTicketsByMonthForExport;
const getTicketById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const ticket = yield ticket_1.default.findById(id)
            .populate("submittedBy", "name email")
            .populate("approvedBy", "name")
            .populate("dealer", "name phone location");
        if (!ticket) {
            res.status(404).json({ message: "Ticket not found" });
            return;
        }
        res.status(200).json({ success: true, data: ticket });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching ticket", error: error.message });
    }
});
exports.getTicketById = getTicketById;
const updateTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const allowedFields = [
            "dealerName", "location", "agentName", "complaintRegarding",
            "battery", "charger", "motor", "controller", "type",
            "problemDescription", "purchaseDate", "complainDate",
            "status", "warrantyStatus", "statusRemark",
        ];
        const update = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                update[field] = req.body[field];
            }
        }
        if (update.warrantyStatus === "")
            update.warrantyStatus = null;
        if (update.statusRemark === "")
            update.statusRemark = undefined;
        const existing = yield ticket_1.default.findById(id).select("status");
        if (!existing) {
            res.status(404).json({ message: "Ticket not found" });
            return;
        }
        const statusChanged = update.status !== undefined && update.status !== existing.status;
        if (statusChanged) {
            Object.assign(update, (0, ticketService_1.approvalResetFor)(update.status));
        }
        const ticket = yield ticket_1.default.findByIdAndUpdate(id, update, { new: true })
            .populate("submittedBy", "name email")
            .populate("dealer", "name phone location");
        if (!ticket) {
            res.status(404).json({ message: "Ticket not found" });
            return;
        }
        if (statusChanged && ticket.status !== "Pending") {
            yield notifyAdminsForApproval(ticket);
        }
        res.json({ message: "Ticket updated", ticket });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating ticket", error });
    }
});
exports.updateTicket = updateTicket;
const getMyTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const filters = req.query;
        let query = { submittedBy: req.userId };
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.month) {
            const [year, month] = filters.month.split("-");
            const start = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
            const end = new Date(Date.UTC(parseInt(year), parseInt(month), 1));
            query.complainDate = { $gte: start, $lt: end };
        }
        const tickets = yield ticket_1.default.find(query)
            .sort({ complainDate: -1 })
            .populate("submittedBy", "name email")
            .populate("dealer", "name phone location");
        res.status(200).json({
            message: "My tickets fetched successfully",
            count: tickets.length,
            tickets,
        });
    }
    catch (error) {
        console.error("Error in getMyTickets:", error);
        res.status(500).json({
            message: "Error fetching your tickets",
            error: error.message || error,
        });
    }
});
exports.getMyTickets = getMyTickets;
// Admin approves/rejects a ticket closed by service. Approved tickets go to guards;
// rejected tickets are reopened so service can work on them again.
const updateTicketApproval = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { action, remark } = req.body;
        const user = yield user_1.default.findById(req.userId).select("role name");
        if ((user === null || user === void 0 ? void 0 : user.role) !== "admin") {
            res.status(403).json({ message: "Only admins can approve tickets" });
            return;
        }
        if (!["approved", "rejected"].includes(action)) {
            res.status(400).json({ message: "Action must be 'approved' or 'rejected'" });
            return;
        }
        if (action === "rejected" && !(remark === null || remark === void 0 ? void 0 : remark.trim())) {
            res.status(400).json({ message: "Rejection reason is required" });
            return;
        }
        const ticket = yield ticket_1.default.findById(id);
        if (!ticket) {
            res.status(404).json({ message: "Ticket not found" });
            return;
        }
        if (ticket.approvalStatus !== "pending") {
            res.status(400).json({ message: "Ticket is not awaiting approval" });
            return;
        }
        ticket.approvalStatus = action;
        ticket.approvedBy = user._id;
        ticket.approvedAt = new Date();
        ticket.approvalRemark = (remark === null || remark === void 0 ? void 0 : remark.trim()) || undefined;
        if (action === "rejected") {
            ticket.status = "Pending";
        }
        yield ticket.save();
        yield ticket.populate([
            { path: "submittedBy", select: "name email" },
            { path: "approvedBy", select: "name" },
            { path: "dealer", select: "name phone location" },
        ]);
        if (action === "approved") {
            yield (0, pushService_1.sendNotificationToRole)("guard", "✅ Ticket Resolved", `Ticket #${ticket.ticketId} for ${ticket.dealerName} (${ticket.location}) has been resolved.`, {
                ticketId: String(ticket._id),
                ticketNumber: String(ticket.ticketId),
                type: "ticket_closed",
                status: ticket.status,
                screen: "TicketDetail",
            });
        }
        else {
            yield notifyService(ticket, "↩️ Ticket Reopened", `Ticket #${ticket.ticketId} for ${ticket.dealerName} was rejected by admin: ${ticket.approvalRemark}`, "ticket_rejected");
        }
        res.json({ success: true, message: `Ticket ${action}`, data: ticket });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating approval", error: error.message });
    }
});
exports.updateTicketApproval = updateTicketApproval;
