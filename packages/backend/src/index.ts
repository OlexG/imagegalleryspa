import express, { Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import { ValidRoutes } from "./shared/ValidRoutes.js";
import { connectMongo } from "./connectMongo.js";
import { ImageProvider } from "./ImageProvider.js";
import { registerImageRoutes } from "./routes/imageRoutes.js";

dotenv.config(); // Read the .env file in the current working directory, and load values into process.env.
const PORT = process.env.PORT || 3000;
const STATIC_DIR = process.env.STATIC_DIR || "public";

// Initialize MongoDB connection and ImageProvider
const mongoClient = connectMongo();
const imageProvider = new ImageProvider(mongoClient);

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

app.use(express.static(STATIC_DIR));

app.get("/hello", (req: Request, res: Response) => {
    res.send("Hello, World");
});

// Register image routes
registerImageRoutes(app, imageProvider);

app.get(Object.values(ValidRoutes), (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "..", STATIC_DIR, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
