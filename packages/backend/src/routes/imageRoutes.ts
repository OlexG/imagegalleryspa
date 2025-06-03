import express, { Request, Response } from "express";
import { ImageProvider } from "../ImageProvider.js";
import { ObjectId } from "mongodb";
import { imageMiddlewareFactory, handleImageFileErrors } from "../middleware/imageUploadMiddleware.js";

function waitDuration(numMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, numMs));
}

export function registerImageRoutes(app: express.Application, imageProvider: ImageProvider): void {
    // GET /api/images - Get all images with optional search query parameter
    app.get("/api/images", async (req: Request, res: Response): Promise<void> => {
        try {
            await waitDuration(Math.random() * 5000); // Wait random duration between 0 and 5 seconds
            
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

            // Get the image with authorId to check ownership
            const image = await imageProvider.getImageWithAuthorId(imageId);
            
            if (!image) {
                res.status(404).send({
                    error: "Not Found",
                    message: "Image does not exist"
                });
                return;
            }

            // Check if the logged-in user is the owner of the image
            const loggedInUsername = req.user?.username;
            if (!loggedInUsername) {
                res.status(403).send({
                    error: "Forbidden",
                    message: "User authentication required"
                });
                return;
            }

            // Get the user's _id from their username
            const userId = await imageProvider.getUserIdByUsername(loggedInUsername);
            if (!userId) {
                res.status(403).send({
                    error: "Forbidden",
                    message: "User not found"
                });
                return;
            }

            // Compare the user's _id with the image's authorId
            if (image.authorId !== userId) {
                res.status(403).send({
                    error: "Forbidden",
                    message: "You can only edit your own images"
                });
                return;
            }

            console.log(`User ${loggedInUsername} (ID: ${userId}) is authorized to edit image ${imageId}`);

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

    // POST /api/images - Upload a new image
    app.post(
        "/api/images",
        imageMiddlewareFactory.single("image"),
        handleImageFileErrors,
        async (req: Request, res: Response): Promise<void> => {
            try {
                // Check if file and name are present
                if (!req.file) {
                    res.status(400).json({
                        error: "Bad Request",
                        message: "Image file is required"
                    });
                    return;
                }

                const { name } = req.body;
                if (!name || typeof name !== "string" || name.trim() === "") {
                    res.status(400).json({
                        error: "Bad Request",
                        message: "Image name is required"
                    });
                    return;
                }

                // Get the logged-in user's username from the auth token
                const loggedInUsername = req.user?.username;
                if (!loggedInUsername) {
                    res.status(401).json({
                        error: "Unauthorized",
                        message: "User authentication required"
                    });
                    return;
                }

                // Get the user's _id from their username
                const userId = await imageProvider.getUserIdByUsername(loggedInUsername);
                if (!userId) {
                    res.status(401).json({
                        error: "Unauthorized",
                        message: "User not found"
                    });
                    return;
                }

                // Create the src path for serving the image
                const src = `/uploads/${req.file.filename}`;

                // Create the image document in the database
                const imageId = await imageProvider.createImage(src, name.trim(), userId);

                console.log(`User ${loggedInUsername} uploaded image ${req.file.filename} with ID ${imageId}`);

                // Respond with HTTP 201 Created
                res.status(201).send();
            } catch (error) {
                console.error("Error creating image:", error);
                res.status(500).json({ error: "Failed to create image" });
            }
        }
    );
} 