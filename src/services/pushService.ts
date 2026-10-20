import * as admin from "firebase-admin";
import User from "../model/user";
import { ACCOUNTS_USERS, AppRole, DISPATCH_HEAD_USERS, userFilterFor } from "../config/appRoles";

const usersForAppRole = (role: AppRole) => {
  if (role === "accounts") return userFilterFor(ACCOUNTS_USERS);
  if (role === "dispatch") return userFilterFor(DISPATCH_HEAD_USERS);
  return { role };
};

// Sends an FCM push to every app user with the given role who has logged in on a device
export const sendNotificationToRole = async (
  role: AppRole,
  title: string,
  body: string,
  data: Record<string, string>
) => {
  try {
    const users = await User.find({ ...usersForAppRole(role), fcmToken: { $ne: null } }).select("fcmToken");
    const tokens = users.map((u) => u.fcmToken!).filter(Boolean);
    if (tokens.length === 0) return;
    const response = await admin.messaging().sendEachForMulticast({ notification: { title, body }, data, tokens });
    console.log(`✅ Notification sent to ${role} | Success: ${response.successCount}, Failed: ${response.failureCount}`);
  } catch (err) {
    console.error(`❌ Failed to send notification to ${role}:`, err);
  }
};
