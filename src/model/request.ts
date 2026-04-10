import { Schema, model } from 'mongoose';
import { IRequest } from '../types';

const requestSchema = new Schema<IRequest>(
  {
    name: { type: String, required: true, trim: true },
    productDescription: { type: String, required: true, trim: true },
    vendorName: { type: String, required: true, trim: true },
    userPhoneNumber: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    time: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    statusUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

const Request = model<IRequest>('Request', requestSchema);
export default Request;