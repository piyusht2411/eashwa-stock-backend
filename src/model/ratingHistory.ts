import { Schema, Types } from "mongoose";
import { RatingHistory } from "../types";

const ratingHistorySchema = new Schema<RatingHistory>({
  month: {
    type: String,
    required: true,
  },
  managerRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  adminRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  managerId: {
    type: Types.ObjectId,
    ref: "User",
    default: null,
  },
  adminId: {
    type: Types.ObjectId,
    ref: "User",
    default: null,
  },
});

export default ratingHistorySchema;
