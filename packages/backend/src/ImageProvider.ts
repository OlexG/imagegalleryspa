import { MongoClient, Collection, ObjectId } from "mongodb";

interface IImageDocument {
    _id?: ObjectId | string;
    src: string;
    name: string;
    authorId: string;  // Simple string reference to user's username
}

export class ImageProvider {
    private collection: Collection<IImageDocument>

    constructor(private readonly mongoClient: MongoClient) {
        const collectionName = process.env.IMAGES_COLLECTION_NAME;
        
        if (!collectionName) {
            throw new Error("Missing IMAGES_COLLECTION_NAME from environment variables");
        }
        
        this.collection = this.mongoClient.db().collection(collectionName);
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
                    username: authorId, // Use the actual username since authorId contains the username
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
                username: authorId, // Use the actual username since authorId contains the username
                email: `${authorId}@example.com` // Fake email
            }
        };
    }

    async getImageWithAuthorId(imageId: string): Promise<IImageDocument | null> {
        // Get image document with authorId preserved for ownership verification
        const result = await this.collection.findOne({ _id: new ObjectId(imageId) });
        return result;
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