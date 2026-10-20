// People who can log in to the mobile app for the dispatch approval flow.
// Each entry is matched against the user's email OR employeeId (case-insensitive).
export const ACCOUNTS_USERS: string[] = ["hardeeptyagi@gmail.com", "EASWAH50"];

export const DISPATCH_HEAD_USERS: string[] = ["nitinpandit13892@gmail.com", "EASWS0A30"];

export type AppRole = "admin" | "guard" | "accounts" | "dispatch";

const matches = (list: string[], user: { email?: string; employeeId?: string }) => {
  const ids = [user.email, user.employeeId]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  return list.some((entry) => ids.includes(entry.toLowerCase()));
};

// Returns the role a user has in the mobile app, or null if they can't use it
export const getAppRole = (user: {
  role?: string;
  email?: string;
  employeeId?: string;
} | null): AppRole | null => {
  if (!user) return null;
  if (matches(ACCOUNTS_USERS, user)) return "accounts";
  if (matches(DISPATCH_HEAD_USERS, user)) return "dispatch";
  if (user.role === "admin" || user.role === "guard") return user.role;
  return null;
};

// Mongo filter for users listed in one of the identifier lists above
export const userFilterFor = (list: string[]) => {
  const patterns = list.map((v) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
  return { $or: [{ email: { $in: patterns } }, { employeeId: { $in: patterns } }] };
};
