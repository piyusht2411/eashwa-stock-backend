import { Request, Response } from "express";
import Dealer from "../model/dealer";

// CREATE dealer
export const createDealer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, location, showroomName } = req.body;
    if (!name) {
      res.status(400).json({ message: "Dealer name is required" });
      return;
    }
    const dealer = new Dealer({ name, phone, location, showroomName });
    await dealer.save();
    res.status(201).json({ message: "Dealer created successfully", dealer });
  } catch (error: any) {
    res.status(500).json({ message: "Error creating dealer", error: error.message });
  }
};

// GET all dealers
export const getDealers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, isActive } = req.query;
    const query: any = {};
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search) query.name = { $regex: search, $options: "i" };

    const dealers = await Dealer.find(query).sort({ name: 1 });
    res.status(200).json({ message: "Dealers fetched successfully", dealers });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching dealers", error: error.message });
  }
};

// GET single dealer
export const getDealerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      res.status(404).json({ message: "Dealer not found" });
      return;
    }
    res.status(200).json({ dealer });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching dealer", error: error.message });
  }
};

// UPDATE dealer
export const updateDealer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, location, showroomName, isActive } = req.body;
    const dealer = await Dealer.findByIdAndUpdate(
      req.params.id,
      { name, phone, location, showroomName, isActive },
      { new: true, runValidators: true }
    );
    if (!dealer) {
      res.status(404).json({ message: "Dealer not found" });
      return;
    }
    res.status(200).json({ message: "Dealer updated successfully", dealer });
  } catch (error: any) {
    res.status(500).json({ message: "Error updating dealer", error: error.message });
  }
};

// DELETE dealer
export const deleteDealer = async (req: Request, res: Response): Promise<void> => {
  try {
    const dealer = await Dealer.findByIdAndDelete(req.params.id);
    if (!dealer) {
      res.status(404).json({ message: "Dealer not found" });
      return;
    }
    res.status(200).json({ message: "Dealer deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting dealer", error: error.message });
  }
};
