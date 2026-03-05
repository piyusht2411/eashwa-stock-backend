// targetAchievedHistorySchema.ts
import { Schema } from "mongoose";
import { TargetAchievedHistory } from "../types";

const targetAchievedHistorySchema = new Schema<TargetAchievedHistory>({
  month: {
    type: String,
    required: true,
  },
  total: {
    type: Number,
    default: 0,
  },
  completed: {
    type: Number,
    default: 0,
  },
  pending: {
    type: Number,
    default: 0,
  },
  extra: {
    type: Number,
    default: 0,
  },
});

export default targetAchievedHistorySchema;
