import { Request, Response } from "express";
import Product from "../model/product";
 
 
const addStock = async (updates: { 
    type: string; 
    item: string; 
    quantity: number; 
    updatedBy: string; 
    specification: string;
    partyName: string; // New optional field for party name
    location: string; // New optional field for location
}[]) => {
    const updatedProducts: any[] = [];
 
    for (const { type, item, quantity, updatedBy, specification, partyName, location } of updates) {
        const product = await Product.findOne({ type, item });
        
        if (!product) {
            throw new Error(`Product ${item} not found`);
        }

        const currentStock = Number(product.currentStock);
        const quantityToAdd = Number(quantity);

        // Update the product stock and other fields
        product.currentStock = currentStock + quantityToAdd;
        product.updatedBy = updatedBy;
        product.specification = specification;
        product.partyName = partyName; // Update product with party name if available
        product.location = location; // Update product with location if available

        // Add to stock history with partyName and location
        product.stockHistory.push({
            user: updatedBy,
            quantity,
            action: 'added',
            date: new Date(),
            speci: specification,
            partyName, // Store party name in history
            location, // Store location in history
        });

        await product.save();
        updatedProducts.push(product);
    }

    return updatedProducts;
};



const addSoldStock = async (updates: { 
    type: string; 
    item: string; 
    quantity: number; 
    updatedBy: string; 
    specification: string;
    partyName: string; // Make partyName optional if it may not always be provided
    location: string;   // Make location optional if it may not always be provided
}[]) => {
    const updatedProducts: any[] = [];
 
    for (const { type, item, quantity, updatedBy, specification, partyName, location } of updates) {
        const product = await Product.findOne({ type, item });
        if (!product) {
            throw new Error(`Product ${item} not found`);
        }

        const currentSoldStock = Number(product.soldStock);
        const quantityToAdd = Number(quantity);
        product.soldStock = currentSoldStock + quantityToAdd;
        product.updatedBy = updatedBy;
        product.specification = specification;
        product.partyName = partyName; // Update product with party name if available
        product.location = location; // Update product with location if available

        product.stockHistory.push({
            user: updatedBy,
            speci: specification,
            quantity,
            action: 'sold',
            date: new Date(),
            partyName: partyName || '-', // Use a default if partyName is not provided
            location: location || '-'    // Use a default if location is not provided
        });

        await product.save();
        updatedProducts.push(product);
    }
 
    return updatedProducts;
};

 
export const createProductHandler = async (req: Request, res: Response) => {
    // Destructure values from the request body
    const { type, item, currentStock, soldStock, updatedBy, specification, partyName, location } = req.body;

    // Ensure both partyName and location are provided since they are marked as required
    if (!partyName || !location) {
        return res.status(400).json({ message: 'Party name and location are required.' });
    }

    // Create a new product instance
    const newProduct = new Product({
        type,
        item,
        currentStock,
        soldStock,
        updatedBy,
        specification,
   
    });

    try {
        // Save the new product to the database
        const savedProduct = await newProduct.save();
        res.status(201).json({
            message: `Product ${savedProduct.item} added successfully.`,
            product: savedProduct,
        });
    } catch (error) {
        // Handle errors during save operation
        res.status(400).json({ message: (error as Error).message });
    }
};
 
export const addStockHandler = async (req: Request, res: Response) => {
    const { updates } = req.body;
    try {
        const updatedProducts = await addStock(updates);
        res.status(201).json({
            message: `Product added successfully.`,
            product: updatedProducts,
        });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

 
export const addSoldStockHandler = async (req: Request, res: Response) => {
    const { updates } = req.body; 
    try {
        const updatedProducts = await addSoldStock(updates);
        res.status(201).json({
            message: `Product added successfully.`,
            product: updatedProducts,
        });
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};
 
 
export const getBatteriesStock = async (req: Request, res: Response) => {
    try {
        const batteries = await Product.find({ type: 'Battery' });

        const response = batteries.map(battery => ({
            id: battery._id,
            type: battery.type,
            item: battery.item,
            currentStock: battery.currentStock,
            soldStock: battery.soldStock,
            remainingStock: battery.currentStock - battery.soldStock,
            lastUpdated: battery.lastUpdated,
            updatedBy: battery.updatedBy,
            partyName: battery.partyName || '-', // Include partyName
            location: battery.location || '-', // Include location
        }));

        res.json({
            message: "Battery retrieved successfully.",
            products: response,
        });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
 
export const getChargersStock = async (req: Request, res: Response) => {
    try {
        const chargers = await Product.find({ type: 'Charger' });

        const response = chargers.map(charger => ({
            id: charger._id,
            type: charger.type,
            item: charger.item,
            currentStock: charger.currentStock,
            soldStock: charger.soldStock,
            remainingStock: charger.currentStock - charger.soldStock,
            lastUpdated: charger.lastUpdated,
            updatedBy: charger.updatedBy,
            partyName: charger.partyName || '-', // Include partyName
            location: charger.location || '-', // Include location
        }));

        res.json({
            message: "Charger retrieved successfully.",
            products: response,
        });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};


export const getVehiclesStock = async (req: Request, res: Response) => {
    try {
        const vehicles = await Product.find({ type: 'Vehicle' });

        const response = vehicles.map(vehicle => ({
            id: vehicle._id,
            type: vehicle.type,
            item: vehicle.item,
            currentStock: vehicle.currentStock,
            soldStock: vehicle.soldStock,
            remainingStock: vehicle.currentStock - vehicle.soldStock,
            lastUpdated: vehicle.lastUpdated,
            updatedBy: vehicle.updatedBy,
            partyName: vehicle.partyName || '-', // Include partyName
            location: vehicle.location || '-', // Include location
        }));

        res.json({
            message: "Vehicle stock retrieved successfully.",
            products: response,
        });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getStockHistory = async (req: Request, res: Response) => {
    const { type } = req.params;

    if (!['battery', 'charger', 'vehicle'].includes(type.toLowerCase())) {
        return res.status(400).json({ message: "Invalid type. Use 'battery', 'charger', or 'vehicle'." });
    }

    const formattedType = type.charAt(0).toUpperCase() + type.slice(1);
    const products = await Product.find({ type: formattedType });

    if (products.length === 0) {
        return res.status(404).json({ message: `No ${type}s found.` });
    }

    const history = products.flatMap(product =>
        product.stockHistory.map(entry => ({
            item: product.item,
            action: entry.action,
            quantity: entry.quantity,
            user: entry.user,
            date: entry.date,
            specification: entry.speci || '-',
            partyName: entry.partyName || '-', // include partyName
            location: entry.location || '-', // include location
        }))
    );

    res.json({
        message: `${formattedType} stock history retrieved successfully.`,
        history,
    });
};

