import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getAllEmployees,
  updateTarget,
  getTopEmployees,
  getEmployeeDetails,
  addVisitor,
  getVisitors,
  processExcelAndCreateLeads,
  getLeads,
  createLeadsHistory,
  getFileUploadHistory,
  getTargetFileUploadHistory,
  deleteRegularLeadFile,
  deleteTargetLeadFile,
  updateEmployee,
  getManagedEmployees,
  getVisitorsOfEmployee,
  updateLastWorkingDate,
} from "../controller/user";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/otp-verify", verifyOtp);
router.post("/add-visitor", authenticateToken, addVisitor);
//admin lead tagret upload
router.post("/process-leads", authenticateToken, processExcelAndCreateLeads);
//user feedbacks upload
router.post("/upload-file-leads", authenticateToken, createLeadsHistory);
router.patch("/update-employee/:id", authenticateToken, updateEmployee);
router.patch(
  "/update-last-working-date",
  authenticateToken,
  updateLastWorkingDate
);
router.put("/reset-password", resetPassword);
router.put("/update-target/:id", authenticateToken, updateTarget);
router.get("/employees", authenticateToken, getAllEmployees);
router.get(
  "/admin-managed-employees/:id",
  authenticateToken,
  getManagedEmployees
);

router.get("/managed-employees/", authenticateToken, getManagedEmployees);
router.get("/employee-detail/:userId", authenticateToken, getEmployeeDetails);
router.get("/get-visitor", authenticateToken, getVisitors);
router.get("/get-visitor/:id", authenticateToken, getVisitorsOfEmployee);
router.get("/top-employees", getTopEmployees);
router.get("/leads", authenticateToken, getLeads);
//user file lead
router.get("/get-file-lead", authenticateToken, getFileUploadHistory);
router.get("/get-target-lead", authenticateToken, getTargetFileUploadHistory);
//admin file lead
router.get("/get-file-lead/:id", authenticateToken, getFileUploadHistory);
router.get(
  "/get-target-lead/:id",
  authenticateToken,
  getTargetFileUploadHistory
);

router.delete(
  "/leads/regular-file/:fileId",
  authenticateToken,
  deleteRegularLeadFile
);
router.delete(
  "/leads/target-file/:fileId",
  authenticateToken,
  deleteTargetLeadFile
);

export default router;
