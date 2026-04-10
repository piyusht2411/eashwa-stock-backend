import { Request, Response } from "express";
import { createTicketService, getAllTicketsService, updateTicketStatusService } from "../services/ticketService"
import Ticket from "../model/ticket";
import User from "../model/user";
import * as admin from "firebase-admin";

const sendNotificationToRole = async (
  role: "admin" | "guard",
  title: string,
  body: string,
  data: Record<string, string>
) => {
  try {
    const users = await User.find({ role, fcmToken: { $ne: null } }).select("fcmToken");
    const tokens = users.map((u) => u.fcmToken!).filter(Boolean);
    if (tokens.length === 0) return;
    const response = await admin.messaging().sendEachForMulticast({ notification: { title, body }, data, tokens });
    console.log(`✅ Notification sent to ${role}s | Success: ${response.successCount}, Failed: ${response.failureCount}`);
  } catch (err) {
    console.error(`❌ Failed to send notification to ${role}:`, err);
  }
};


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
    const result = await getAllTicketsService(req.query);
    res.json({ message: "Tickets fetched successfully", ...result });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tickets", error });
  }
};

export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, statusRemark } = req.body;
    const ticket = await updateTicketStatusService(id, status, statusRemark);
    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }

    if (status === "Complete") {
      await sendNotificationToRole(
        "guard",
        "✅ Ticket Resolved",
        `Ticket #${ticket.ticketId} for ${ticket.dealerName} (${ticket.showroomName}) has been resolved.`,
        {
          ticketId: String(ticket._id),
          ticketNumber: String(ticket.ticketId),
          type: "ticket_closed",
          status: ticket.status,
          screen: "TicketDetail",
        }
      );
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
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
  }
};

export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const ticket = await Ticket.findById(id).populate("submittedBy", "name email");
    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching ticket", error: error.message });
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
      .populate("submittedBy", "name email");

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