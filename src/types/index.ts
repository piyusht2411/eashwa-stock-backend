import { Document, Types } from "mongoose";

export interface IDealer extends Document {
  name: string;
  phone?: string;
  location?: string;
  showroomName?: string;
  isActive: boolean;
}

export type Role = "admin" | "employee" | "hr" | "manager" | "admin-plant" | "guard";

export interface TargetAchieved {
  total: number;
  pending: number;
  completed: number;
  extra: number;
  history?: Array<{
    month: string;
    total: number;
    completed: number;
    pending: number;
    extra: number;
  }>;
}

export interface TargetAchievedHistory {
  month: string;
  total: number;
  completed: number;
  pending: number;
  extra: number;
}

export interface RatingHistory {
  month: string;
  managerRating?: number;
  adminRating?: number;
  managerId?: Types.ObjectId;
  adminId?: Types.ObjectId;
}

export interface ITargetAchieved {
  battery?: TargetAchieved;
  eRickshaw?: TargetAchieved;
  scooty?: TargetAchieved;
}

export interface IVisitor extends Document {
  clientName: string;
  clientPhoneNumber: number;
  clientAddress: string;
  visitDateTime: Date;
  purpose: string;
  feedback?: string;
  visitedBy?: Types.ObjectId;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  passwordResetToken: string;
  tokenExpire?: Date | null;
  isVerified?: boolean;
  address?: string;
  aadhaarNumber?: number;
  role: Role;
  employeeId?: string;
  phone?: number;
  post?: string;
  joiningDate?: string;
  lastWorkingDate?: Date;
  targetAchieved?: ITargetAchieved;
  profilePicture?: string;
  visitors?: Types.ObjectId[];
  dailyLeads?: Types.ObjectId[];
  leads?: Types.ObjectId[];
  targetLeads: {
    type: typeof Types.ObjectId;
    ref: string;
  }[];
  manages: Types.ObjectId[];
  orders?: Types.ObjectId[];
  managedBy?: Types.ObjectId;
  ratings: {
    current: number;
    history: RatingHistory[];
  };
  fcmToken?: string | null;
}

export interface IDailyLead extends Document {
  user: Types.ObjectId;
  date: Date;
  numberOfLeads: number;
  interestedLeads: number;
  notInterestedFake: number;
  nextMonthConnect: number;
  newDealers: number;
  oldDealers: number;
  callNotPick: number;
}

export interface Ilead extends Document {
  leadDate: Date;
  callingDate: Date;
  agentName: string;
  customerName: string;
  mobileNumber: string;
  occupation: string;
  location: string;
  town: string;
  state: string;
  status: string;
  remark: string;
  interestedAndNotInterested: string;
  officeVisitRequired: boolean;
  leadBy?: Types.ObjectId;
  isTargetLead: {
    type: BooleanConstructor;
    default: false;
  };
}

export interface LeadType extends Document {
  leadDate: Date;
  callingDate: Date;
  agentName: string;
  customerName: string;
  mobileNumber: string;
  occupation: string;
  location: string;
  town: string;
  state: string;
  status: string;
  remark: string;
  interestedAndNotInterested: string;
  officeVisitRequired: boolean;
  leadBy: Types.ObjectId;
  isTargetLead?: boolean;
}

// Flow: accounts verifies payment -> dispatch head dispatches -> admin approves -> guard
export type OrderStatus =
  | "pending_verification"   // waiting for accounts
  | "payment_received"
  | "payment_not_received"   // rejected by accounts
  | "ready_for_dispatch"     // waiting for dispatch head
  | "pending"                // held by dispatch head
  | "pending_admin_approval" // dispatched, waiting for admin
  | "cancelled"
  | "completed";             // approved by admin, visible to guard

export interface IOrderHistoryEntry {
  stage: "accounts" | "dispatch" | "admin";
  action: string;
  by?: Types.ObjectId;
  reason?: string;
  at: Date;
}

export interface IOrder extends Document {
  piNumber: string;
  partyName: string;
  showroomName: string;
  location: string;
  quantity: number;
  totalAmount: number;
  agentName: string;
  amountReceived: number;
  orderModel: string;
  colorVariants: string;
  batteryType: string;
  deadline: Date;
  agentPhone: string;
  dealerPhone: string;
  piPdf: string;
  submittedBy: Types.ObjectId;
  status: OrderStatus;
  orderId?: string;
  driverNumber?: string;
  vehicleNumber?: string;
  reminderSent: boolean;
  priority: number;
  transporterName?: string;
  pendingReason?: string;
  cancelReason?: string;
  remark?: String;
  rejectionReason?: string;
  approvalHistory: IOrderHistoryEntry[];
}

export interface IComponentDetail {
  code?: string;
  serialNumber?: string;
}

export interface ITicket extends Document {
  ticketId: number;
  dealer: Types.ObjectId;          // ref to Dealer
  dealerName: string;              // denormalized for display
  location: string;
  agentName: string;
  complaintRegarding: string[];    // ["Battery", "Charger", "Motor", "Controller"]
  battery?: IComponentDetail;
  charger?: IComponentDetail;
  motor?: IComponentDetail;
  controller?: IComponentDetail;
  type: "Repair" | "Replacement" | "Short" | "Bill";
  problemDescription?: string;
  purchaseDate: Date;
  complainDate: Date;
  status: "Pending" | "Complete" | "Out of Warranty";
  warrantyStatus?: "In Warranty" | "Out of Warranty";  // set by admin on update
  statusRemark?: string;
  submittedBy: Types.ObjectId;
  approvalStatus?: "pending" | "approved" | "rejected" | null; // admin approval after service closes the ticket
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  approvalRemark?: string;
}

export interface ICounter extends Document {
  name: string;
  seq: number;
}
