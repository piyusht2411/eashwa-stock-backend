import { Schema, model } from "mongoose";
import { IDealer } from "../types";

const dealerSchema = new Schema<IDealer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    showroomName: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Dealer = model<IDealer>("Dealer", dealerSchema);

export default Dealer;
