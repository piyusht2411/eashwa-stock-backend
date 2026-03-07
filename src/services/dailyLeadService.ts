// services/dailyLeadService.ts
import DailyLead from "../model/dailyLead"; // adjust import path
import { Types } from "mongoose";
import { IDailyLead } from "../types";

export const createDailyLead = async (data: Partial<IDailyLead> & { dealerType?: "new" | "old"; dealerCount?: number }): Promise<IDailyLead> => {
  if (!data.user) {
    throw new Error("user is required");
  }
  if (!data.date) {
    throw new Error("date is required");
  }

  // Normalize date to start of day for query
  const date = new Date(data.date);
  date.setHours(0, 0, 0, 0);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  let entry = await DailyLead.findOne({
    user: data.user,
    date: { $gte: date, $lt: nextDay },
  });

  const dealerInc: any = {};
  if (data.dealerType && data.dealerCount !== undefined && ["new", "old"].includes(data.dealerType)) {
    const field = `${data.dealerType}Dealers`;
    dealerInc[field] = data.dealerCount;
  }

  if (entry) {
    // Update existing entry
    const update: any = {
      $set: {},
    };
    if (data.numberOfLeads !== undefined) update.$set.numberOfLeads = data.numberOfLeads;
    if (data.interestedLeads !== undefined) update.$set.interestedLeads = data.interestedLeads;
    if (data.notInterestedFake !== undefined) update.$set.notInterestedFake = data.notInterestedFake;
    if (data.nextMonthConnect !== undefined) update.$set.nextMonthConnect = data.nextMonthConnect;

    if (Object.keys(dealerInc).length > 0) {
      update.$inc = dealerInc;
    }

    entry = await DailyLead.findByIdAndUpdate(entry._id, update, { new: true, runValidators: true });
  } else {
    // Create new entry
    const createData: any = {
      user: data.user,
      date: data.date,
      numberOfLeads: data.numberOfLeads || 0,
      interestedLeads: data.interestedLeads || 0,
      notInterestedFake: data.notInterestedFake || 0,
      nextMonthConnect: data.nextMonthConnect || 0,
      newDealers: dealerInc.newDealers || 0,
      oldDealers: dealerInc.oldDealers || 0,
      callNotPick: data.callNotPick || 0,
    };

    entry = await DailyLead.create(createData);
  }

  if (!entry) {
    throw new Error("Failed to create or update daily lead");
  }

  return entry;
};

export const getAllDailyLeads = async (
  page: number = 1,
  limit: number = 10,
  month?: number,
  year?: number
) => {
  const query: any = {};

  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    query.date = { $gte: start, $lt: end };
  } else if (year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    query.date = { $gte: start, $lt: end };
  }

  const dailyLeads = await DailyLead.find(query)
    .populate("user", "name email employeeId")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ date: -1 })
    .lean();

  const monthlyTotals = await DailyLead.aggregate([
    { $match: query },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
        totalLeads: { $sum: "$numberOfLeads" },
        totalInterested: { $sum: "$interestedLeads" },
        totalNotInterestedFake: { $sum: "$notInterestedFake" },
        totalNextMonthConnect: { $sum: "$nextMonthConnect" },
        totalNewDealers: { $sum: "$newDealers" },
        totalOldDealers: { $sum: "$oldDealers" },
        totalCallNotPick: { $sum: "$callNotPick" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  return { dailyLeads, monthlyTotals };
};

export const getDailyLeadsByUser = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  month?: number,
  year?: number
) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const query: any = { user: new Types.ObjectId(userId) };

  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    query.date = { $gte: start, $lt: end };
  } else if (year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    query.date = { $gte: start, $lt: end };
  }

  const dailyLeads = await DailyLead.find(query)
    .populate("user", "name email employeeId")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ date: -1 })
    .lean();

  const monthlyTotals = await DailyLead.aggregate([
    { $match: query },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
        totalLeads: { $sum: "$numberOfLeads" },
        totalInterested: { $sum: "$interestedLeads" },
        totalNotInterestedFake: { $sum: "$notInterestedFake" },
        totalNextMonthConnect: { $sum: "$nextMonthConnect" },
        totalNewDealers: { $sum: "$newDealers" },
        totalOldDealers: { $sum: "$oldDealers" },
        totalCallNotPick: { $sum: "$callNotPick" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  return { dailyLeads, monthlyTotals };
};

export const updateDailyLead = async (
  id: string,
  data: Partial<IDailyLead> & { dealerType?: "new" | "old"; dealerCount?: number }
): Promise<IDailyLead | null> => {
  if (!Types.ObjectId.isValid(id)) return null;

  const dealerInc: any = {};
  if (data.dealerType && data.dealerCount !== undefined && ["new", "old"].includes(data.dealerType)) {
    const field = `${data.dealerType}Dealers`;
    dealerInc[field] = data.dealerCount;
  }

  const update: any = {};
  if (Object.keys(dealerInc).length > 0) {
    update.$inc = dealerInc;
  }

  update.$set = {};
  if (data.numberOfLeads !== undefined) update.$set.numberOfLeads = data.numberOfLeads;
  if (data.interestedLeads !== undefined) update.$set.interestedLeads = data.interestedLeads;
  if (data.notInterestedFake !== undefined) update.$set.notInterestedFake = data.notInterestedFake;
  if (data.nextMonthConnect !== undefined) update.$set.nextMonthConnect = data.nextMonthConnect;
  if (data.date !== undefined) update.$set.date = data.date;
  // Note: Updating user is not recommended, but if needed, add here

  if (Object.keys(update.$set).length === 0) delete update.$set;

  if (Object.keys(update).length === 0) {
    return await DailyLead.findById(id);
  }

  return await DailyLead.findByIdAndUpdate(id, update, { new: true, runValidators: true });
};

export const deleteDailyLead = async (id: string): Promise<IDailyLead | null> => {
  if (!Types.ObjectId.isValid(id)) return null;
  return await DailyLead.findByIdAndDelete(id);
};

export const getById = async (id: string) => {
  return await DailyLead.findById(id).populate("user", "name email");
};