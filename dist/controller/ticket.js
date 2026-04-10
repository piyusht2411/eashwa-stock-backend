"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.getMyTickets = exports.getTicketById = exports.updateTicketStatus = exports.getTickets = exports.createTicket = void 0;
const ticketService_1 = require("../services/ticketService");
const ticket_1 = __importDefault(require("../model/ticket"));
const user_1 = __importDefault(require("../model/user"));
const admin = __importStar(require("firebase-admin"));
const sendNotificationToRole = (role, title, body, data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_1.default.find({ role, fcmToken: { $ne: null } }).select("fcmToken");
        const tokens = users.map((u) => u.fcmToken).filter(Boolean);
        if (tokens.length === 0)
            return;
        const response = yield admin.messaging().sendEachForMulticast({ notification: { title, body }, data, tokens });
        console.log(`✅ Notification sent to ${role}s | Success: ${response.successCount}, Failed: ${response.failureCount}`);
    }
    catch (err) {
        console.error(`❌ Failed to send notification to ${role}:`, err);
    }
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
        res.status(201).json({ message: "Ticket raised successfully", ticket });
    }
    catch (error) {
        res.status(500).json({ message: "Error creating ticket", error });
    }
});
exports.createTicket = createTicket;
const getTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ticketService_1.getAllTicketsService)(req.query);
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
        const { status, statusRemark } = req.body;
        const ticket = yield (0, ticketService_1.updateTicketStatusService)(id, status, statusRemark);
        if (!ticket) {
            res.status(404).json({ message: "Ticket not found" });
            return;
        }
        if (status === "Complete") {
            yield sendNotificationToRole("guard", "✅ Ticket Resolved", `Ticket #${ticket.ticketId} for ${ticket.dealerName} (${ticket.showroomName}) has been resolved.`, {
                ticketId: String(ticket._id),
                ticketNumber: String(ticket.ticketId),
                type: "ticket_closed",
                status: ticket.status,
                screen: "TicketDetail",
            });
        }
        // if (status === "Out of Warranty") {
        //   await sendNotificationToRole(
        //     "guard",
        //     "❌ Ticket Out of Warranty",
        //     `Ticket #${ticket.ticketId} for ${ticket.dealerName} (${ticket.showroomName}) is out of warranty.`,
        //     {
        //       ticketId: String(ticket._id),
        //       ticketNumber: String(ticket.ticketId),
        //       type: "ticket_out_of_warranty",
        //       status: ticket.status,
        //       screen: "TicketDetail",
        //     }
        //   );
        // }
        res.json({ message: "Status updated", ticket });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating status", error });
    }
});
exports.updateTicketStatus = updateTicketStatus;
const getTicketById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const ticket = yield ticket_1.default.findById(id).populate("submittedBy", "name email");
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
            .populate("submittedBy", "name email");
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
