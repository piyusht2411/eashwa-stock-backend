import Ticket from "../model/ticket";
import { ITicket } from "../types";

export const createTicketService = async (
  data: Partial<ITicket>
): Promise<ITicket> => {
  const ticket = new Ticket(data);
  await ticket.save();
  return ticket;
};

export const getAllTicketsService = async (
  filters: any
): Promise<ITicket[]> => {
  let query: any = {};
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.month) {
    // Expect filters.month in YYYY-MM format
    const [year, month] = filters.month.split("-");
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 1);
    query.complainDate = { $gte: start, $lt: end };
  }
  return Ticket.find(query)
    .sort({ complainDate: -1 })
    .populate("submittedBy", "name email");
};

export const updateTicketStatusService = async (
  id: string,
  status: "Pending" | "Complete" | "Out of Warranty",
  statusRemark?: string
): Promise<ITicket | null> => {
  const update: any = { status };
  if (status === "Pending" && statusRemark) {
    update.statusRemark = statusRemark;
  } else {
    update.statusRemark = undefined;
  }
  return Ticket.findByIdAndUpdate(id, update, { new: true });
};
