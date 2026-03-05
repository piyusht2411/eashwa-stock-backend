"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../controller/user");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post("/register", user_1.register);
router.post("/login", user_1.login);
router.post("/forgot-password", user_1.forgotPassword);
router.post("/otp-verify", user_1.verifyOtp);
router.post("/add-visitor", authMiddleware_1.authenticateToken, user_1.addVisitor);
//admin lead tagret upload
router.post("/process-leads", authMiddleware_1.authenticateToken, user_1.processExcelAndCreateLeads);
//user feedbacks upload
router.post("/upload-file-leads", authMiddleware_1.authenticateToken, user_1.createLeadsHistory);
router.patch("/update-employee/:id", authMiddleware_1.authenticateToken, user_1.updateEmployee);
router.patch("/update-last-working-date", authMiddleware_1.authenticateToken, user_1.updateLastWorkingDate);
router.put("/reset-password", user_1.resetPassword);
router.put("/update-target/:id", authMiddleware_1.authenticateToken, user_1.updateTarget);
router.get("/employees", authMiddleware_1.authenticateToken, user_1.getAllEmployees);
router.get("/admin-managed-employees/:id", authMiddleware_1.authenticateToken, user_1.getManagedEmployees);
router.get("/managed-employees/", authMiddleware_1.authenticateToken, user_1.getManagedEmployees);
router.get("/employee-detail/:userId", authMiddleware_1.authenticateToken, user_1.getEmployeeDetails);
router.get("/get-visitor", authMiddleware_1.authenticateToken, user_1.getVisitors);
router.get("/get-visitor/:id", authMiddleware_1.authenticateToken, user_1.getVisitorsOfEmployee);
router.get("/top-employees", user_1.getTopEmployees);
router.get("/leads", authMiddleware_1.authenticateToken, user_1.getLeads);
//user file lead
router.get("/get-file-lead", authMiddleware_1.authenticateToken, user_1.getFileUploadHistory);
router.get("/get-target-lead", authMiddleware_1.authenticateToken, user_1.getTargetFileUploadHistory);
//admin file lead
router.get("/get-file-lead/:id", authMiddleware_1.authenticateToken, user_1.getFileUploadHistory);
router.get("/get-target-lead/:id", authMiddleware_1.authenticateToken, user_1.getTargetFileUploadHistory);
router.delete("/leads/regular-file/:fileId", authMiddleware_1.authenticateToken, user_1.deleteRegularLeadFile);
router.delete("/leads/target-file/:fileId", authMiddleware_1.authenticateToken, user_1.deleteTargetLeadFile);
exports.default = router;
