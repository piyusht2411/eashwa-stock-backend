import { Schema, model, Types } from "mongoose";
import { genSaltSync, hashSync } from "bcrypt";
import { IUser } from "../types";
import targetAchievedHistorySchema from "./targetAchievedHistory";
import ratingHistorySchema from "./ratingHistory";
import targetAchievedSchema from "./userTargetAchieved";

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  post: {
    type: String,
    default: "",
  },
  passwordResetToken: {
    type: String,
    default: "",
  },
  tokenExpire: {
    type: Date,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
    default: "",
  },
  aadhaarNumber: {
    type: Number,
    default: null,
  },
  role: {
    type: String,
    enum: ["admin", "employee", "hr", "manager", "admin-plant", "guard"],
    default: "employee",
    required: true,
  },
  employeeId: {
    type: String,
    default: "",
  },
  phone: {
    type: Number,
    default: null,
  },
  joiningDate: {
    type: String,
    default: "",
  },
  lastWorkingDate: {
    type: Date,
  },
  targetAchieved: {
    battery: {
      current: {
        type: targetAchievedSchema,
        default: () => ({}),
      },
      history: [targetAchievedHistorySchema],
    },
    eRickshaw: {
      current: {
        type: targetAchievedSchema,
        default: () => ({}),
      },
      history: [targetAchievedHistorySchema],
    },
    scooty: {
      current: {
        type: targetAchievedSchema,
        default: () => ({}),
      },
      history: [targetAchievedHistorySchema],
    },
  },
  profilePicture: {
    type: String,
    default: "",
  },
  visitors: [
    {
      type: Types.ObjectId,
      ref: "Visitor",
    },
  ],
  dailyLeads: [
    {
      type: Types.ObjectId,
      ref: "DailyLead",
    },
  ],
  leads: [
    {
      type: Types.ObjectId,
      ref: "Lead",
    },
  ],
  targetLeads: [{ type: Types.ObjectId, ref: "Lead" }],
  manages: [
    {
      type: Types.ObjectId,
      ref: "User",
    },
  ],
  managedBy: {
    type: Types.ObjectId,
    ref: "User",
    default: null,
  },
  orders: [
    {
      type: Types.ObjectId,
      ref: "Order",
    },
  ],
  ratings: {
    current: {
      type: Number,
      default: 0,
    },
    history: [ratingHistorySchema],
  },
  fcmToken: {
    type: String,
    default: null,
    sparse: true,
  },
});

userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password") && !user.isModified("passwordResetToken")) {
    return next();
  }
  const salt = genSaltSync(10);
  if (user.isModified("password")) {
    user.password = hashSync(user.password, salt);
  }
  if (user.isModified("passwordResetToken")) {
    user.passwordResetToken = hashSync(user.passwordResetToken, salt);
  }
  next();
});

userSchema.pre("save", function (next) {
  const user = this;
  if (user.isModified("ratings.history")) {
    const ratings = user.ratings.history
      .flatMap((entry) => [entry.managerRating, entry.adminRating])
      .filter((rating): rating is number => typeof rating === "number");
    user.ratings.current =
      ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;
  }
  next();
});

const User = model<IUser>("User", userSchema);

export default User;
