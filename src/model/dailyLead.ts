// schemas/dailyLead.ts
import { Schema, model } from "mongoose";
import { IDailyLead } from "../types"; 

const dailyLeadSchema = new Schema<IDailyLead>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    numberOfLeads: {
      type: Number,
      default: 0,
    },
    interestedLeads: {
      type: Number,
      default: 0,
    },
    notInterestedFake: {
      type: Number,
      default: 0,
    },
    nextMonthConnect: {
      type: Number,
      default: 0,
    },
    newDealers: {
      type: Number,
      default: 0,
    },
    oldDealers: {
      type: Number,
      default: 0,
    },
    callNotPick : {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const DailyLead = model<IDailyLead>("DailyLead", dailyLeadSchema);

export default DailyLead;