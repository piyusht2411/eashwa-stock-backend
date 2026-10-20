import { Schema, model, Types, Document } from "mongoose";
import { IOrder } from "../types";

const orderSchema = new Schema<IOrder>(
  {
    piNumber: { type: String, required: true },
    partyName: { type: String, required: true },
    showroomName: { type: String, required: true },
    location: { type: String, required: true },
    quantity: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    agentName: { type: String, required: true },
    amountReceived: { type: Number, required: true },
    orderModel: { type: String, required: true },
    colorVariants: { type: String, required: true },
    batteryType: { type: String, required: true },
    deadline: { type: Date, required: true },
    agentPhone: { type: String, required: true },
    dealerPhone: { type: String, required: true },
    piPdf: { type: String, required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: [
        "pending_verification",
        "payment_received",
        "payment_not_received",
        "ready_for_dispatch",
        "pending",
        "pending_admin_approval",
        "cancelled",
        "completed",
      ],
      default: "pending_verification",
    },
    orderId: { type: String },
    driverNumber: { type: String },
    vehicleNumber: { type: String },
    transporterName: {type: String},
    remark: {type: String},
    pendingReason :{ type :String, default: "" },
     cancelReason :{ type :String, default: "" },
    reminderSent: { type: Boolean, default: false },
    priority: { type: Number, default: null },
    // Latest rejection reason from accounts or admin
    rejectionReason: { type: String },
    approvalHistory: [
      {
        _id: false,
        stage: { type: String, enum: ["accounts", "dispatch", "admin"], required: true },
        action: { type: String, required: true },
        by: { type: Schema.Types.ObjectId, ref: "User" },
        reason: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.virtual("pendency").get(function () {
  return this.deadline < new Date() && this.status !== "completed";
});

orderSchema.set("toObject", { virtuals: true });
orderSchema.set("toJSON", { virtuals: true });

const Order = model<IOrder>("Order", orderSchema);
export default Order;