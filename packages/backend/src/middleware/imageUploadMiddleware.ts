import { Request, Response, NextFunction } from "express";
import multer from "multer";

class ImageFormatError extends Error {}

const storageEngine = multer.diskStorage({
    destination: function (req, file, cb) {
        // TODO 1 - Read environment variable and set upload directory
        const uploadDir = process.env.IMAGE_UPLOAD_DIR || "uploads";
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // TODO 2 - Determine file extension and generate unique filename
        let fileExtension: string;
        
        // Determine file extension based on mimetype
        if (file.mimetype === "image/png") {
            fileExtension = "png";
        } else if (file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
            fileExtension = "jpg";
        } else {
            // Invalid file type
            cb(new ImageFormatError("Unsupported image type"), "");
            return;
        }
        
        // Generate unique filename with low collision probability
        const fileName = Date.now() + "-" + Math.round(Math.random() * 1E9) + "." + fileExtension;
        cb(null, fileName);
    }
});

export const imageMiddlewareFactory = multer({
    storage: storageEngine,
    limits: {
        files: 1,
        fileSize: 5 * 1024 * 1024 // 5 MB
    },
});

export function handleImageFileErrors(err: any, req: Request, res: Response, next: NextFunction) {
    if (err instanceof multer.MulterError || err instanceof ImageFormatError) {
        res.status(400).send({
            error: "Bad Request",
            message: err.message
        });
        return;
    }
    next(err); // Some other error, let the next middleware handle it
} 