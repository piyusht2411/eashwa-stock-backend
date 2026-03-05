import { Schema, model } from "mongoose";
import { ITicket } from "../types";
import Counter from "./counter";

const ticketSchema = new Schema<ITicket>(
  {
    ticketId: {
      type: Number,
      unique: true,
    },
    dealerName: { type: String, required: true },
    dealerPhone: { type: String, required: true },
    location: { type: String, required: true },
    showroomName: { type: String, required: true },
    agentName: { type: String, required: true },
    agentPhone: { type: String, required: true },
    complaintRegarding: [
      {
        type: String,
        enum: ["Battery", "Charger", "Motor", "Controller", "Vehicle", "Other"],
      },
    ],
    purchaseDate: { type: Date, required: true },
    complainDate: { type: Date, default: Date.now },
    warrantyStatus: {
      type: String,
      enum: ["In Warranty", "Out of Warranty", "Dispatch Problem"],
      required: true,
    },
    remark: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Complete", "Out of Warranty"],
      default: "Pending",
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
