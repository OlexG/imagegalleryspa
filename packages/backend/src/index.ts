import express, { Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import { ValidRoutes } from "./shared/ValidRoutes.js";
import { connectMongo } from "./connectMongo.js";
import { ImageProvider } from "./ImageProvider.js";
import { CredentialsProvider } from "./CredentialsProvider.js";
import { registerImageRoutes } from "./routes/imageRoutes.js";
import { registerAuthRoutes } from "./routes/authRoutes.js";
import { verifyAuthToken } from "./middleware/verifyAuthToken.js";

dotenv.config(); // Read the .env file in the current working directory, and load values into process.env.
const PORT = process.env.PORT || 3000;
const STATIC_DIR = process.env.STATIC_DIR || "public";
const IMAGE_UPLOAD_DIR = process.env.IMAGE_UPLOAD_DIR || "uploads";

// Initialize MongoDB connection and providers
const mongoClient = connectMongo();
const imageProvider = new ImageProvider(mongoClient);
const credentialsProvider = new CredentialsProvider(mongoClient);

const app = express();

// Safely read JWT_SECRET and store in app.locals
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET from env file");
}
app.locals.JWT_SECRET = JWT_SECRET;

// Middleware for parsing JSON request bodies
app.use(express.json());

app.use(express.static(STATIC_DIR));
app.use("/uploads", express.static(IMAGE_UPLOAD_DIR));

app.get("/hello", (req: Request, res: Response) => {
    res.send("Hello, World");
});

// Register auth routes (before protection middleware)
registerAuthRoutes(app, credentialsProvider);

// Apply authentication middleware to all /api/* routes
app.use("/api/*", verifyAuthToken);

// Register image routes (now protected by authentication)
registerImageRoutes(app, imageProvider);

app.get(Object.values(ValidRoutes), (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "..", STATIC_DIR, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
