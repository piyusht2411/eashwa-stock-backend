import { Schema, model } from "mongoose";
import { ICounter } from "../types";

const counterSchema = new Schema<ICounter>({
  name: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = model<ICounter>("Counter", counterSchema);

export default Counter;
