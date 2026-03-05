import { Schema, model } from "mongoose";

const fileUploadSchema = new Schema({
  fileUrl: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  leadCount: {
    type: Number,
    default: 0,
  },
  leads: [
    {
      type: Schema.Types.ObjectId,
      ref: "Lead",
    },
  ],
});

const LeadFile = model("FileUpload", fileUploadSchema);
export default LeadFile;
