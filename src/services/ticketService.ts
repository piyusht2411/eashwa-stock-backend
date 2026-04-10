import Ticket from "../model/ticket";
import { ITicket } from "../types";

export const createTicketService = async (
  data: Partial<ITicket>
): Promise<ITicket> => {
  const ticket = new Ticket(data);
  await ticket.save();
  return ticket;
};

export const getAllTicketsService = async (filters: any) => {
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip = (page - 1) * limit;

  let query: any = {};
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.month) {
    const [year, month] = filters.month.split("-");
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 1);
    query.complainDate = { $gte: start, $lt: end };
  }

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .sort({ complainDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("submittedBy", "name email"),
    Ticket.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    tickets,
    count: tickets.length,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export const updateTicketStatusService = async (
  id: string,
  status: "Pending" | "Complete" | "Out of Warranty",
  statusRemark?: string
): Promise<ITicket | null> => {
  const update: any = { status };
  if (statusRemark) {
    update.statusRemark = statusRemark;
  } else {
    update.statusRemark = undefined;
  }
  return Ticket.findByIdAndUpdate(id, update, { new: true });
};
