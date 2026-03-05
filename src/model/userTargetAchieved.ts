// targetAchievedSchema.ts
import { Schema } from "mongoose";
import { TargetAchieved } from "../types";

const targetAchievedSchema = new Schema<TargetAchieved>({
  total: {
    type: Number,
    default: 0,
  },
  pending: {
    type: Number,
    default: 0,
  },
  completed: {
    type: Number,
    default: 0,
  },
  extra: {
    type: Number,
    default: 0,
  },
});

export default targetAchievedSchema;