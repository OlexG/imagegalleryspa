import express, { Request, Response } from "express";
import { CredentialsProvider } from "../CredentialsProvider.js";
import jwt from "jsonwebtoken";

interface IAuthTokenPayload {
    username: string;
}

function generateAuthToken(username: string, jwtSecret: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const payload: IAuthTokenPayload = {
            username
        };
        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: "1d" },
            (error, token) => {
                if (error) reject(error);
                else resolve(token as string);
            }
        );
    });
}

export function registerAuthRoutes(app: express.Application, credentialsProvider: CredentialsProvider): void {
    // POST /auth/register - Register a new user
    app.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
        try {
            const { username, password } = req.body;

            // Validate request body
            if (!username || !password) {
                res.status(400).send({
                    error: "Bad request",
                    message: "Missing username or password"
                });
                return;
            }

            // Validate that username and password are strings
            if (typeof username !== "string" || typeof password !== "string") {
                res.status(400).send({
                    error: "Bad request",
                    message: "Username and password must be strings"
                });
                return;
            }

            console.log(`Attempting to register user: ${username}`);

            // Attempt to register the user
            const success = await credentialsProvider.registerUser(username, password);

            if (success) {
                // User registered successfully - create JWT token and log them in
                const expirationDate = new Date();
                expirationDate.setHours(expirationDate.getHours() + 24); // 24 hours from now

                const jwtToken = await generateAuthToken(username, req.app.locals.JWT_SECRET);

                const token = {
                    username: username,
                    expirationDate: expirationDate.toISOString(),
                    signature: jwtToken
                };

                console.log(`User ${username} registered and logged in successfully`);
                res.status(201).json(token);
            } else {
                // Username already exists
                res.status(409).send({
                    error: "Conflict",
                    message: "Username already taken"
                });
            }
        } catch (error) {
            console.error("Error in register route:", error);
            res.status(500).json({ error: "Failed to register user" });
        }
    });

    // POST /auth/login - Login user
    app.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
        try {
            const { username, password } = req.body;

            // Validate request body - HTTP 400 for missing username or password
            if (!username || !password) {
                res.status(400).send({
                    error: "Bad request",
                    message: "Missing username or password"
                });
                return;
            }

            // Validate that username and password are strings
            if (typeof username !== "string" || typeof password !== "string") {
                res.status(400).send({
                    error: "Bad request",
                    message: "Username and password must be strings"
                });
                return;
            }

            console.log(`Attempting to login user: ${username}`);

            // Verify password using CredentialsProvider
            const isValidPassword = await credentialsProvider.verifyPassword(username, password);

            if (isValidPassword) {
                // Create JWT token
                const expirationDate = new Date();
                expirationDate.setHours(expirationDate.getHours() + 24); // 24 hours from now

                const jwtToken = await generateAuthToken(username, req.app.locals.JWT_SECRET);

                const token = {
                    username: username,
                    expirationDate: expirationDate.toISOString(),
                    signature: jwtToken
                };

                console.log(`User ${username} logged in successfully`);
                res.json(token);
            } else {
                // HTTP 401 for bad username or password
                res.status(401).send({
                    error: "Unauthorized",
                    message: "Incorrect username or password"
                });
            }
        } catch (error) {
            console.error("Error in login route:", error);
            res.status(500).json({ error: "Failed to login user" });
        }
    });
} 