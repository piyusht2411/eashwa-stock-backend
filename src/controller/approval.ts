import { Request, Response } from "express";
import Order from "../model/order";
import Ticket from "../model/ticket";
import User from "../model/user";
import { getAppRole } from "../config/appRoles";
import { ADMIN_REJECTED_NOW } from "../services/orderService";

// Combined list across Orders and Tickets. Both keep their own collections and workflows;
// admin filters map each one's admin decision onto To Approve / Approved / Rejected, and guards
// also get read-only views of work still in progress.
type ApprovalFilter = "to_approve" | "approved" | "rejected" | "pending" | "ready_for_dispatch";

const ROLE_FILTERS: Record<"admin" | "guard", ApprovalFilter[]> = {
  admin: ["to_approve", "approved", "rejected"],
  guard: ["approved", "to_approve", "ready_for_dispatch", "pending"],
};

// null = that side has nothing for this filter (tickets are never ready for dispatch)
const ORDER_QUERIES: Record<ApprovalFilter, any> = {
  to_approve: { status: "pending_admin_approval" },
  approved: { status: "completed" },
  rejected: ADMIN_REJECTED_NOW,
  // Waiting on payment verification or on hold with dispatch
  pending: { status: { $in: ["pending_verification", "pending"] } },
  ready_for_dispatch: { status: "ready_for_dispatch" },
};

const TICKET_QUERIES: Record<ApprovalFilter, any> = {
  to_approve: { approvalStatus: "pending" },
  approved: { approvalStatus: "approved" },
  rejected: { approvalStatus: "rejected" },
  pending: { status: "Pending" },
  ready_for_dispatch: null,
};

// Approval strip shown on the cards; null = cards show their own status badge instead
const APPROVAL_STATUS: Record<ApprovalFilter, "pending" | "approved" | "rejected" | null> = {
  to_approve: "pending",
  approved: "approved",
  rejected: "rejected",
  pending: null,
  ready_for_dispatch: null,
};

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select("role email employeeId");
    const appRole = getAppRole(user);
    if (appRole !== "admin" && appRole !== "guard") {
      res.status(403).json({ success: false, message: "You are not allowed to view approvals." });
      return;
    }

    const allowed = ROLE_FILTERS[appRole];
    const requested = req.query.filter as ApprovalFilter;
    const filter: ApprovalFilter = allowed.includes(requested) ? requested : allowed[0];

    const isExport = req.query.export === "true";
    const page = isExport ? 1 : Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = isExport ? 5000 : Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const orderQuery: any[] = [ORDER_QUERIES[filter]];
    const ticketQuery: any[] = [TICKET_QUERIES[filter]];
    const includeTickets = TICKET_QUERIES[filter] !== null;

    const month = req.query.month as string;
    if (/^\d{4}-\d{2}$/.test(month || "")) {
      const [year, monthNum] = month.split("-").map(Number);
      const range = { $gte: new Date(year, monthNum - 1, 1), $lt: new Date(year, monthNum, 1) };
      orderQuery.push({ createdAt: range });
      ticketQuery.push({ complainDate: range });
    }

    const search = ((req.query.search as string) || "").trim();
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

    const [orders, tickets, orderTotal, ticketTotal] = await Promise.all([
      Order.find({ $and: orderQuery })
        .sort({ updatedAt: -1 })
        .limit(take)
        .populate("submittedBy", "name email"),
      includeTickets
        ? Ticket.find({ $and: ticketQuery })
            .sort({ updatedAt: -1 })
            .limit(take)
            .populate("submittedBy", "name email")
            .populate("dealer", "name phone location")
        : [],
      Order.countDocuments({ $and: orderQuery }),
      includeTickets ? Ticket.countDocuments({ $and: ticketQuery }) : 0,
    ]);

    const approvalStatus = APPROVAL_STATUS[filter];
    const items = [
      ...orders.map((o) => ({ kind: "order" as const, approvalStatus, sortDate: o.get("updatedAt") as Date, data: o })),
      ...tickets.map((t) => ({ kind: "ticket" as const, approvalStatus, sortDate: t.get("updatedAt") as Date, data: t })),
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch approvals.", error: error.message });
  }
};
