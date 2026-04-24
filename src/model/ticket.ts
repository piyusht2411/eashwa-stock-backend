import { Schema, model } from "mongoose";
import { ITicket } from "../types";
import Counter from "./counter";

const componentDetailSchema = new Schema(
  {
    code: { type: String },
    serialNumber: { type: String },
  },
  { _id: false }
);

const ticketSchema = new Schema<ITicket>(
  {
    ticketId: {
      type: Number,
      unique: true,
    },
    dealer: { type: Schema.Types.ObjectId, ref: "Dealer" },
    dealerName: { type: String, required: true },
    location: { type: String, required: true },
    agentName: { type: String, required: true },
    complaintRegarding: [
      {
        type: String,
        enum: ["Battery", "Charger", "Motor", "Controller"],
      },
    ],
    battery: { type: componentDetailSchema },
    charger: { type: componentDetailSchema },
    motor: { type: componentDetailSchema },
    controller: { type: componentDetailSchema },
    type: {
      type: String,
      enum: ["Replacement", "Short", "Bill"],
      required: true,
    },
    problemDescription: { type: String },
    purchaseDate: { type: Date, required: true },
    complainDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Pending", "Complete", "Out of Warranty"],
      default: "Pending",
    },
    warrantyStatus: {
      type: String,
      enum: ["In Warranty", "Out of Warranty"],
      default: null,
    },
    statusRemark: { type: String },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ticketSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { name: "ticketId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.ticketId = 10000 + counter.seq;
  }
  next();
});

const Ticket = model<ITicket>("Ticket", ticketSchema);

export default Ticket;
