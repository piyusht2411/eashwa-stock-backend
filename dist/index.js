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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db = require("./config/db");
const user_1 = __importDefault(require("./routes/user"));
const product_1 = __importDefault(require("./routes/product"));
const twillio_1 = __importDefault(require("./routes/twillio"));
const request_1 = __importDefault(require("./routes/request"));
const image_1 = __importDefault(require("./routes/image"));
const order_1 = __importDefault(require("./routes/order"));
const ticket_1 = __importDefault(require("./routes/ticket"));
const dailyLeads_1 = __importDefault(require("./routes/dailyLeads"));
const morgan_1 = __importDefault(require("morgan"));
const admin = __importStar(require("firebase-admin"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8000;
if (!admin.apps.length) {
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'), // crucial fix for newlines
        };
        // Optional: add more fields if you want (usually not needed)
        // privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK initialized from environment variables');
    }
    catch (err) {
        console.error('Failed to initialize Firebase Admin SDK:', err);
        // Optionally: throw err;  or just continue without notifications
    }
}
var corsOptions = {
    origin: [
        "http://localhost:3000",
        "https://eashwa-frontend-iptp.vercel.app",
        "https://eashwastock.in",
        "https://www.eashwastock.in"
    ],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
app.use((0, morgan_1.default)("dev"));
app.use((0, cookie_parser_1.default)());
app.use("/api/user", user_1.default);
app.use("/api/products", product_1.default);
app.use("/api/request-order", request_1.default);
app.use("/api/request", twillio_1.default);
app.use("/api/images", image_1.default);
app.use("/api/orders", order_1.default);
app.use("/api/tickets", ticket_1.default);
app.use("/api/daily-leads", dailyLeads_1.default);
app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message });
});
app.get("/", (req, res) => {
    res.send("Welcome to the Server");
});
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db.connectDB(process.env.MONGO_URL);
        app.listen(port, () => console.log(`Server is connected to port : ${port}`));
    }
    catch (error) {
        console.log(error);
    }
});
start();
