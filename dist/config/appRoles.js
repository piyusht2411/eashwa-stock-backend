"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userFilterFor = exports.getAppRole = exports.SERVICE_USERS = exports.DISPATCH_HEAD_USERS = exports.ACCOUNTS_USERS = void 0;
// People who can log in to the mobile app for the dispatch approval flow.
// Each entry is matched against the user's email OR employeeId (case-insensitive).
exports.ACCOUNTS_USERS = ["hardeeptyagi@gmail.com", "EASWAH50"];
exports.DISPATCH_HEAD_USERS = ["nitinpandit13892@gmail.com", "EASWS0A30"];
// Service team: closes tickets (In / Out of Warranty) like the web ticket table
exports.SERVICE_USERS = ["EASAL009"];
const matches = (list, user) => {
    const ids = [user.email, user.employeeId]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
    return list.some((entry) => ids.includes(entry.toLowerCase()));
};
// Returns the role a user has in the mobile app, or null if they can't use it
const getAppRole = (user) => {
    if (!user)
        return null;
    if (matches(exports.ACCOUNTS_USERS, user))
        return "accounts";
    if (matches(exports.DISPATCH_HEAD_USERS, user))
        return "dispatch";
    if (matches(exports.SERVICE_USERS, user))
        return "service";
    if (user.role === "admin" || user.role === "guard")
        return user.role;
    return null;
};
exports.getAppRole = getAppRole;
// Mongo filter for users listed in one of the identifier lists above
const userFilterFor = (list) => {
    const patterns = list.map((v) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
    return { $or: [{ email: { $in: patterns } }, { employeeId: { $in: patterns } }] };
};
exports.userFilterFor = userFilterFor;
