import { Schema, model } from "mongoose";
import { IVisitor } from "../types";

const visitorSchema = new Schema<IVisitor>({
  clientName: {
    type: String,
    required: true,
  },
  clientPhoneNumber: {
    type: Number,
    required: true,
  },
  clientAddress: {
    type: String,
    required: true,
  },
  visitDateTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  purpose: {
    type: String,
    required: true,
  },
  feedback: {
    type: String,
    default: "",
  },
  visitedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

const Visitor = model<IVisitor>("Visitor", visitorSchema);
export default Visitor;
