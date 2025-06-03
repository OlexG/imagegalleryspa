import { Collection, MongoClient } from "mongodb";
import bcrypt from "bcrypt";

interface ICredentialsDocument {
    username: string;
    password: string;
}

export class CredentialsProvider {
    private readonly collection: Collection<ICredentialsDocument>;

    constructor(mongoClient: MongoClient) {
        const COLLECTION_NAME = process.env.CREDS_COLLECTION_NAME;
        if (!COLLECTION_NAME) {
            throw new Error("Missing CREDS_COLLECTION_NAME from env file");
        }
        this.collection = mongoClient.db().collection<ICredentialsDocument>(COLLECTION_NAME);
    }

    async registerUser(username: string, plaintextPassword: string): Promise<boolean> {
        try {
            // Check if username already exists
            const existingUser = await this.collection.findOne({ username: username });
            if (existingUser) {
                return false; // User already exists
            }

            // Generate salt and hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(plaintextPassword, salt);

            // Log salt and hash for debugging (as suggested in instructions)
            console.log(`Salt: ${salt}`);
            console.log(`Hash: ${hashedPassword}`);

            // Create new user record
            await this.collection.insertOne({
                username: username,
                password: hashedPassword // bcrypt already includes salt in the hash
            });

            return true; // Success
        } catch (error) {
            console.error("Error registering user:", error);
            throw error;
        }
    }

    async verifyPassword(username: string, plaintextPassword: string): Promise<boolean> {
        try {
            const user = await this.collection.findOne({ username: username });
            if (!user) {
                return false; // User not found
            }

            // Compare plaintext password with stored hash
            return await bcrypt.compare(plaintextPassword, user.password);
        } catch (error) {
            console.error("Error verifying password:", error);
            return false;
        }
    }
}
