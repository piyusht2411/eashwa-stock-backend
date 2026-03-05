import { Schema, model } from "mongoose";
import { Ilead } from "../types";

const leadSchema = new Schema<Ilead>({
  leadDate: { type: Date, required: true },
  callingDate: { type: Date, required: true },
  agentName: { type: String, required: true },
  customerName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  occupation: { type: String, required: true },
  location: { type: String, required: true },
  town: { type: String, required: true },
  state: { type: String, required: true },
  status: { type: String, required: true },
  remark: { type: String, required: true },
  interestedAndNotInterested: { type: String, required: true },
  officeVisitRequired: { type: Boolean, required: true, default: false },
  leadBy: { type: Schema.Types.ObjectId, ref: "User" },
  isTargetLead: {
    type: Boolean,
    default: false,
  },
});

const Lead = model<Ilead>("Lead", leadSchema);
export default Lead;
