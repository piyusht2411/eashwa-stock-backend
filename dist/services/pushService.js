"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationToRole = void 0;
const admin = __importStar(require("firebase-admin"));
const user_1 = __importDefault(require("../model/user"));
const appRoles_1 = require("../config/appRoles");
const usersForAppRole = (role) => {
    if (role === "accounts")
        return (0, appRoles_1.userFilterFor)(appRoles_1.ACCOUNTS_USERS);
    if (role === "dispatch")
        return (0, appRoles_1.userFilterFor)(appRoles_1.DISPATCH_HEAD_USERS);
    return { role };
};
// Sends an FCM push to every app user with the given role who has logged in on a device
const sendNotificationToRole = (role, title, body, data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_1.default.find(Object.assign(Object.assign({}, usersForAppRole(role)), { fcmToken: { $ne: null } })).select("fcmToken");
        const tokens = users.map((u) => u.fcmToken).filter(Boolean);
        if (tokens.length === 0)
            return;
        const response = yield admin.messaging().sendEachForMulticast({ notification: { title, body }, data, tokens });
        console.log(`✅ Notification sent to ${role} | Success: ${response.successCount}, Failed: ${response.failureCount}`);
    }
    catch (err) {
        console.error(`❌ Failed to send notification to ${role}:`, err);
    }
});
exports.sendNotificationToRole = sendNotificationToRole;
