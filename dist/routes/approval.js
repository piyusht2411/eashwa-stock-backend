"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const approval_1 = require("../controller/approval");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Combined Orders + Tickets approval list for the mobile app (admin and guard)
router.get("/", authMiddleware_1.authenticateToken, approval_1.getApprovals);
exports.default = router;
