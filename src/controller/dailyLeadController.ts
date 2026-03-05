import { Request, Response } from "express";
import * as dailyLeadService from "../services/dailyLeadService";

export const createDailyLead = async (req: Request, res: Response) => {
  try {
    const dailyLead = await dailyLeadService.createDailyLead(req.body);
    return res.status(201).json(dailyLead);
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || "Error creating daily lead entry",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

export const getAllDailyLeads = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const result = await dailyLeadService.getAllDailyLeads(page, limit, month, year);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: "Error fetching daily leads", error: error.message });
  }
};

export const getDailyLeadsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const result = await dailyLeadService.getDailyLeadsByUser(userId, page, limit, month, year);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching user's daily leads",
      error: error.message,
    });
  }
};

export const updateDailyLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await dailyLeadService.updateDailyLead(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Daily lead entry not found" });
    }
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Error updating" });
  }
};

export const deleteDailyLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await dailyLeadService.deleteDailyLead(id);
    if (!deleted) {
      return res.status(404).json({ message: "Daily lead entry not found" });
    }
    return res.status(200).json({ message: "Deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: "Error deleting entry", error: error.message });
  }
};

export const getDailyLeadById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dailyLead = await dailyLeadService.getById(id);
    if (!dailyLead) return res.status(404).json({ message: "Not found" });
    res.status(200).json(dailyLead);
  } catch (error) {
    res.status(500).json({ message: "Error fetching", error });
  }
};