import { Request, Response } from "express";
import { approvalResetFor, createTicketService, getAllTicketsService, updateTicketStatusService } from "../services/ticketService"
import Ticket from "../model/ticket";
import User from "../model/user";
import { sendNotificationToRole } from "../services/pushService";

const notifyAdminsForApproval = (ticket: any) =>
  sendNotificationToRole(
    "admin",
    "📝 Ticket Awaiting Approval",
    `Ticket #${ticket.ticketId} for ${ticket.dealerName} (${ticket.location}) was closed by service and needs your approval.`,
    {
      ticketId: String(ticket._id),
      ticketNumber: String(ticket.ticketId),
      type: "ticket_approval",
      status: ticket.status,
      screen: "TicketDetail",
    }
  );

export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (req.userId) {
      data.submittedBy = req.userId;
    } else {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const ticket = await createTicketService(data);
    res.status(201).json({ message: "Ticket raised successfully", ticket });
  } catch (error) {
    res.status(500).json({ message: "Error creating ticket", error });
  }
};

export const getTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = { ...req.query };
    const user = await User.findById(req.userId).select("role");
    if (user?.role === "guard") {
      filters.approvalStatus = "approved";
    }
    const result = await getAllTicketsService(filters);
    res.json({ message: "Tickets fetched successfully", ...result });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tickets", error });
  }
};

export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, warrantyStatus, statusRemark } = req.body;

    // Remark is required when closing as Out of Warranty
    if (warrantyStatus === "Out of Warranty" && !statusRemark?.trim()) {
      res.status(400).json({ message: "Status remark is required when setting Out of Warranty" });
      return;
    }

    const ticket = await updateTicketStatusService(id, status, warrantyStatus, statusRemark);
    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }

    if (ticket.status !== "Pending") {
      await notifyAdminsForApproval(ticket);
    }

    res.json({ message: "Status updated", ticket });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
  }
};

export const getTicketsByMonthForExport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month: monthStr, year: yearStr, status } = req.query;

    const query: any = {};

    let month: number | null = null;
    let year: number | null = null;

    if (monthStr && yearStr) {
      month = parseInt(monthStr as string);
      year = parseInt(yearStr as string);

      if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 2020 || year > 2030) {
        res.status(400).json({ success: false, message: "Invalid month (1-12) or year" });
        return;
      }

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      query.complainDate = { $gte: startOfMonth, $lte: endOfMonth };
    }

    if (status && ["Pending", "Complete", "Out of Warranty"].includes(status as string)) {
      query.status = status;
    }

    const tickets = await Ticket.find(query)
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch tickets for export", error: error.message });
  }
};

export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const ticket = await Ticket.findById(id)
      .populate("submittedBy", "name email")
      .populate("approvedBy", "name")
      .populate("dealer", "name phone location");
    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching ticket", error: error.message });
  }
};

export const updateTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const allowedFields = [
      "dealerName", "location", "agentName", "complaintRegarding",
      "battery", "charger", "motor", "controller", "type",
      "problemDescription", "purchaseDate", "complainDate",
      "status", "warrantyStatus", "statusRemark",
    ];
    const update: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }
    if (update.warrantyStatus === "") update.warrantyStatus = null;
    if (update.statusRemark === "") update.statusRemark = undefined;

    const existing = await Ticket.findById(id).select("status");
    if (!existing) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }
    const statusChanged = update.status !== undefined && update.status !== existing.status;
    if (statusChanged) {
      Object.assign(update, approvalResetFor(update.status));
    }

    const ticket = await Ticket.findByIdAndUpdate(id, update, { new: true })
      .populate("submittedBy", "name email")
      .populate("dealer", "name phone location");

    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }
    if (statusChanged && ticket.status !== "Pending") {
      await notifyAdminsForApproval(ticket);
    }
    res.json({ message: "Ticket updated", ticket });
  } catch (error) {
    res.status(500).json({ message: "Error updating ticket", error });
  }
};

export const getMyTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const filters = req.query as any;

    let query: any = { submittedBy: req.userId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.month) {
      const [year, month] = filters.month.split("-");
      const start = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      const end = new Date(Date.UTC(parseInt(year), parseInt(month), 1));
      query.complainDate = { $gte: start, $lt: end };
    }

    const tickets = await Ticket.find(query)
      .sort({ complainDate: -1 })
      .populate("submittedBy", "name email")
      .populate("dealer", "name phone location");

    res.status(200).json({
      message: "My tickets fetched successfully",
      count: tickets.length,
      tickets,
    });
  } catch (error: any) {
    console.error("Error in getMyTickets:", error);
    res.status(500).json({
      message: "Error fetching your tickets",
      error: error.message || error,
    });
  }
};

// Admin approves/rejects a ticket closed by service. Approved tickets go to guards;
// rejected tickets are reopened so service can work on them again.
export const updateTicketApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, remark } = req.body;

    const user = await User.findById(req.userId).select("role name");
    if (user?.role !== "admin") {
      res.status(403).json({ message: "Only admins can approve tickets" });
      return;
    }

    if (!["approved", "rejected"].includes(action)) {
      res.status(400).json({ message: "Action must be 'approved' or 'rejected'" });
      return;
    }
    if (action === "rejected" && !remark?.trim()) {
      res.status(400).json({ message: "Rejection reason is required" });
      return;
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }
    if (ticket.approvalStatus !== "pending") {
      res.status(400).json({ message: "Ticket is not awaiting approval" });
      return;
    }

    ticket.approvalStatus = action;
    ticket.approvedBy = user._id as any;
    ticket.approvedAt = new Date();
    ticket.approvalRemark = remark?.trim() || undefined;
    if (action === "rejected") {
      ticket.status = "Pending";
    }
    await ticket.save();

    await ticket.populate([
      { path: "submittedBy", select: "name email" },
      { path: "approvedBy", select: "name" },
      { path: "dealer", select: "name phone location" },
    ]);

    if (action === "approved") {
      await sendNotificationToRole(
        "guard",
        "✅ Ticket Resolved",
        `Ticket #${ticket.ticketId} for ${ticket.dealerName} (${ticket.location}) has been resolved.`,
        {
          ticketId: String(ticket._id),
          ticketNumber: String(ticket.ticketId),
          type: "ticket_closed",
          status: ticket.status,
          screen: "TicketDetail",
        }
      );
    }

    res.json({ success: true, message: `Ticket ${action}`, data: ticket });
  } catch (error: any) {
    res.status(500).json({ message: "Error updating approval", error: error.message });
  }
};
