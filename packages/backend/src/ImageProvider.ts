import { MongoClient, Collection, ObjectId } from "mongodb";

interface IImageDocument {
    _id?: ObjectId | string;
    src: string;
    name: string;
    authorId: string;  // Simple string reference to user's _id
}

interface IUserDocument {
    _id?: string;  // User _id is a string like "chunkylover23"
    username: string;
    email?: string;
}

export class ImageProvider {
    private collection: Collection<IImageDocument>
    private usersCollection: Collection<IUserDocument>

    constructor(private readonly mongoClient: MongoClient) {
        const collectionName = process.env.IMAGES_COLLECTION_NAME;
        const usersCollectionName = process.env.USERS_COLLECTION_NAME;
        
        if (!collectionName) {
            throw new Error("Missing IMAGES_COLLECTION_NAME from environment variables");
        }
        if (!usersCollectionName) {
            throw new Error("Missing USERS_COLLECTION_NAME from environment variables");
        }
        
        this.collection = this.mongoClient.db().collection(collectionName);
        this.usersCollection = this.mongoClient.db().collection(usersCollectionName);
    }

    async getAllImages(searchQuery?: string) {
        // Use simple find query instead of complex aggregation
        let query: any = {};

        // Add name search filter if provided
        if (searchQuery) {
            query.name = { $regex: searchQuery, $options: "i" }; // Case-insensitive substring search
        }

        const images = await this.collection.find(query).toArray();

        // Fake the author data in memory to replace authorId with author object
        return images.map(image => {
            const { authorId, ...imageWithoutAuthorId } = image;
            return {
                ...imageWithoutAuthorId,
                author: {
                    _id: authorId,
                    username: `user_${authorId}`, // Fake username based on ID
                    email: `${authorId}@example.com` // Fake email
                }
            };
        });
    }

    async updateImageName(imageId: string, newName: string): Promise<number> {
        const result = await this.collection.updateOne(
            { _id: new ObjectId(imageId) } as any,
            { $set: { name: newName } }
        );
        return result.matchedCount;
    }

    async getImageById(imageId: string) {
        // Use simple findOne query instead of complex aggregation
        const image = await this.collection.findOne({ _id: new ObjectId(imageId) });
        
        if (!image) {
            return null;
        }

        // Fake the author data in memory to replace authorId with author object
        const { authorId, ...imageWithoutAuthorId } = image;
        return {
            ...imageWithoutAuthorId,
            author: {
                _id: authorId,
                username: `user_${authorId}`, // Fake username based on ID
                email: `${authorId}@example.com` // Fake email
            }
        };
    }

    async getImageWithAuthorId(imageId: string): Promise<IImageDocument | null> {
        // Get image document with authorId preserved for ownership verification
        const result = await this.collection.findOne({ _id: new ObjectId(imageId) });
        return result;
    }

    async getUserIdByUsername(username: string): Promise<string | null> {
        // Get user's _id from their username for ownership verification
        const user = await this.usersCollection.findOne({ username: username });
        return user?._id || null;
    }

    async createImage(src: string, name: string, authorId: string): Promise<ObjectId | string> {
        // Create a new image document in the database
        const imageDocument: Omit<IImageDocument, '_id'> = {
            src,
            name,
            authorId
        };
        
        const result = await this.collection.insertOne(imageDocument);
        return result.insertedId;
    }
} 