import { Request, Response } from 'express';
import RequestModel from '../model/request';
import User from '../model/user';
import * as admin from 'firebase-admin';

const sendNotificationToRole = async (
  role: 'admin' | 'guard',
  title: string,
  body: string,
  data: Record<string, string>
) => {
  try {
    const users = await User.find({
      role,
      fcmToken: { $ne: null },
    }).select('fcmToken');

    const tokens = users.map((u) => u.fcmToken!).filter(Boolean);

    if (tokens.length === 0) return;

    const message = {
      notification: { title, body },
      data,
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ Notification sent to ${role}s | Success: ${response.successCount}, Failed: ${response.failureCount}`);
  } catch (err) {
    console.error(`❌ Failed to send notification to ${role}:`, err);
  }
};

// ====================== 1. SUBMIT REQUEST (from Expo app) ======================
export const submitRequest = async (req: Request, res: Response): Promise<void> => {
  const { name, productDescription, vendorName, userPhoneNumber, amount, time } = req.body;

  if (!name || !productDescription || !vendorName || !userPhoneNumber || amount == null || !time) {
    res.status(400).json({ success: false, message: 'All fields required' });
    return;
  }

  try {
    const newRequest = new RequestModel({
      name,
      productDescription,
      vendorName,
      userPhoneNumber,
      amount: Number(amount),
      time,
      status: 'pending',
    });

    await newRequest.save();

    // === SEND TO ADMINS ONLY ===
    await sendNotificationToRole(
      'admin',
      '🛒 New Request Received',
      `${name} requested ${productDescription} • ₹${amount}`,
      {
        requestId: String(newRequest._id),
        type: 'new_request',
        screen: 'RequestDetail',
      }
    );

    res.status(201).json({
      success: true,
      message: 'Request submitted. Admins notified.',
      data: newRequest,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ====================== 2. UPDATE STATUS (Admin PUT) ======================
export const updateRequestStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized: Admin login required' });
    return;
  }

  if (!['accepted', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, message: "Status must be 'accepted' or 'rejected'" });
    return;
  }
  if (status === 'rejected' && !rejectionReason) {
    res.status(400).json({ success: false, message: 'Rejection reason required' });
    return;
  }

  try {
    const updateData: any = { status, statusUpdatedBy: userId };
    if (status === 'rejected') updateData.rejectionReason = rejectionReason;

    const updatedRequest = await RequestModel.findByIdAndUpdate(id, updateData, { new: true }).populate("statusUpdatedBy", "name");

    if (!updatedRequest) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    // === SEND TO GUARDS ONLY ===
    const statusText = status === 'accepted' ? '✅ Accepted' : '❌ Rejected';
    await sendNotificationToRole(
      'guard',
      `Request ${statusText}`,
      `${updatedRequest.name} - ${updatedRequest.productDescription}`,
      {
        requestId: String(updatedRequest._id),
        type: 'status_update',
        status: updatedRequest.status,
        rejectionReason: updatedRequest.rejectionReason || '',
      }
    );

    res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      data: updatedRequest,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getAllRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    // ────────────────────────────────────────────────
    // 1. Extract & parse query parameters
    // ────────────────────────────────────────────────
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const status = req.query.status as string | undefined;
    const monthStr = req.query.month as string | undefined; // 1–12
    const yearStr = req.query.year as string | undefined;   // e.g. 2025

    // Validate pagination values
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit)); // cap at 100 to prevent abuse

    // Build base query
    const query: any = {};

    // Status filter (existing)
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      query.status = status;
    }

    // Month + Year filter (both required for the filter to apply)
    if (monthStr && yearStr) {
      const month = parseInt(monthStr);
      const year = parseInt(yearStr);

      if (!isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
        const startOfMonth = new Date(year, month - 1, 1);           // e.g. 2025-03-01
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // e.g. 2025-03-31 23:59:59.999

        query.createdAt = {
          $gte: startOfMonth,
          $lte: endOfMonth,
        };
      }
    }

    // ────────────────────────────────────────────────
    // 2. Get total count for pagination + status breakdown counts
    //    (status breakdown uses date filter only, not status filter)
    // ────────────────────────────────────────────────
    const dateQuery = query.createdAt ? { createdAt: query.createdAt } : {};

    const [total, statusAgg] = await Promise.all([
      RequestModel.countDocuments(query),
      RequestModel.aggregate([
        { $match: dateQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = { pending: 0, accepted: 0, rejected: 0, all: 0 };
    for (const { _id, count } of statusAgg) {
      if (_id === 'pending') statusCounts.pending = count;
      else if (_id === 'accepted') statusCounts.accepted = count;
      else if (_id === 'rejected') statusCounts.rejected = count;
      statusCounts.all += count;
    }

    // ────────────────────────────────────────────────
    // 3. Fetch paginated & sorted data
    // ────────────────────────────────────────────────
    const requests = await RequestModel.find(query)
      .sort({ createdAt: -1 })           // newest first
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate("statusUpdatedBy", "name");

    // ────────────────────────────────────────────────
    // 4. Build response with pagination info
    // ────────────────────────────────────────────────
    const totalPages = Math.ceil(total / safeLimit);
    const hasNextPage = safePage < totalPages;
    const hasPrevPage = safePage > 1;

    res.status(200).json({
      success: true,
      data: requests,
      statusCounts,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
        hasNextPage,
        hasPrevPage,
        countThisPage: requests.length,
      },
      filtersApplied: {
        status: status || null,
        month: monthStr ? parseInt(monthStr) : null,
        year: yearStr ? parseInt(yearStr) : null,
      },
    });
  } catch (error: any) {
    console.error('getAllRequests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message,
    });
  }
};

// ======================
// 4. GET - Single request by ID
// ======================
export const getRequestById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const request = await RequestModel.findById(id).populate("statusUpdatedBy", "name");

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    res.status(200).json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request',
      error: error.message,
    });
  }
};

/**
 * GET - All requests for a specific month/year (NO pagination)
 * Used by React Native Expo app to export data to Excel using xlsx
 * 
 * Example calls:
 * GET /api/request/export-by-month?month=3&year=2025
 * GET /api/request/export-by-month?month=12&year=2024&status=accepted
 */
export const getRequestsByMonthForExport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { month: monthStr, year: yearStr, status } = req.query;

    // Validation
    if (!monthStr || !yearStr) {
      res.status(400).json({
        success: false,
        message: 'month and year query parameters are required (e.g. ?month=3&year=2025)',
      });
      return;
    }

    const month = parseInt(monthStr as string);
    const year = parseInt(yearStr as string);

    if (
      isNaN(month) ||
      isNaN(year) ||
      month < 1 ||
      month > 12 ||
      year < 2020 || // adjust range as needed
      year > 2030
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid month (1-12) or year',
      });
      return;
    }

    // Build MongoDB date range for full month
    const startOfMonth = new Date(year, month - 1, 1);                    // 2025-03-01 00:00:00
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);        // 2025-03-31 23:59:59.999

    const query: any = {
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    };

    // Optional status filter
    if (status && ['pending', 'accepted', 'rejected'].includes(status as string)) {
      query.status = status;
    }

    // Fetch ALL records (no limit, no skip)
    const requests = await RequestModel.find(query)
      .sort({ createdAt: -1 })   // newest first
      .populate("statusUpdatedBy", "name");

    res.status(200).json({
      success: true,
      count: requests.length,
      month,
      year,
      status: status || 'all',
      data: requests,
    });
  } catch (error: any) {
    console.error('Export API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests for export',
      error: error.message,
    });
  }
};