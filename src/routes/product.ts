import { Router } from "express";
import {
  createProductHandler,
  addStockHandler,
    addSoldStockHandler,
    getBatteriesStock,
    getChargersStock,
    getStockHistory,
    getVehiclesStock,
} from "../controller/product";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post('/create-product', authenticateToken, createProductHandler);
router.post('/add-stock', authenticateToken, addStockHandler);
router.post('/add-sold-stock',authenticateToken, addSoldStockHandler);
router.get('/batteries-stock', getBatteriesStock);
router.get('/chargers-stock', getChargersStock);
router.get('/stock-history/:type', getStockHistory);
router.get('/vehicles-stock', getVehiclesStock);


export default router;
