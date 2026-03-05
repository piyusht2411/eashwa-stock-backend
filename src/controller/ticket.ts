import { Request, Response } from "express";
import { createTicketService, getAllTicketsService, updateTicketStatusService } from "../services/ticketService"
import Ticket from "../model/ticket";


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
    const filters = req.query;
    const tickets = await getAllTicketsService(filters);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tickets", error });
  }
};

export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, statusRemark } = req.body;
    // Add role check if needed, e.g., if (req.user.role !== 'admin' && req.user.post !== 'service') return unauthorized
    const ticket = await updateTicketStatusService(id, status, statusRemark);
    if (!ticket) {
      res.status(404).json({ message: "Ticket not found" });
      return;
    }
    res.json({ message: "Status updated", ticket });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
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