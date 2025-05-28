import express, { Request, Response } from "express";
import { ImageProvider } from "../ImageProvider.js";
import { ObjectId } from "mongodb";

function waitDuration(numMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, numMs));
}

export function registerImageRoutes(app: express.Application, imageProvider: ImageProvider): void {
    // GET /api/images - Get all images with optional search query parameter
    app.get("/api/images", async (req: Request, res: Response): Promise<void> => {
        try {
            await waitDuration(1000); // Wait 1 second
            
            // Handle search query parameter
            const searchParam = req.query.search;
            let searchQuery: string | undefined;
            
            if (typeof searchParam === "string") {
                searchQuery = searchParam;
                console.log(`Searching for images with name containing: "${searchQuery}"`);
            } else if (searchParam !== undefined) {
                // Parameter exists but is not a simple string (array, object, etc.)
                res.status(400).json({ error: "Search parameter must be a single string value" });
                return;
            } else {
                console.log("Fetching all images (no search query provided)");
            }
            
            const images = await imageProvider.getAllImages(searchQuery);
            res.json(images);
        } catch (error) {
            console.error("Error fetching images from database:", error);
            res.status(500).json({ error: "Failed to fetch images" });
        }
    });

    // PUT /api/images/:id - Update an image's name
    app.put("/api/images/:id", async (req: Request, res: Response): Promise<void> => {
        try {
            const imageId = req.params.id;
            const { name } = req.body;
            const MAX_NAME_LENGTH = 100;

            console.log(`I will try to set the name of ${imageId} to ${name}`);

            // Validate request body format
            if (!name) {
                res.status(400).send({
                    error: "Bad Request",
                    message: "Name field is required"
                });
                return;
            }

            if (typeof name !== "string") {
                res.status(400).send({
                    error: "Bad Request",
                    message: "Name field must be a string"
                });
                return;
            }

            // Check if image name exceeds maximum length
            if (name.length > MAX_NAME_LENGTH) {
                res.status(422).send({
                    error: "Unprocessable Entity",
                    message: `Image name exceeds ${MAX_NAME_LENGTH} characters`
                });
                return;
            }

            // Check if imageId is a valid ObjectId format
            if (!ObjectId.isValid(imageId)) {
                res.status(404).send({
                    error: "Not Found",
                    message: "Image does not exist"
                });
                return;
            }

            // Update the image name
            const matchedCount = await imageProvider.updateImageName(imageId, name);
            
            if (matchedCount > 0) {
                // Successfully updated - respond with 204 No Content
                res.status(204).send();
            } else {
                // No documents were matched - image doesn't exist
                res.status(404).send({
                    error: "Not Found",
                    message: "Image does not exist"
                });
            }
        } catch (error) {
            console.error("Error updating image:", error);
            res.status(500).json({ error: "Failed to update image" });
        }
    });
} 