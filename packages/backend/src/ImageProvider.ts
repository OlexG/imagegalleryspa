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
        // Use aggregation pipeline with $lookup to denormalize author data
        const pipeline: any[] = [];

        // Add name search filter if provided (before lookup for efficiency)
        if (searchQuery) {
            pipeline.push({
                $match: {
                    name: { $regex: searchQuery, $options: "i" } // Case-insensitive substring search
                }
            });
        }

        // Add lookup and denormalization stages
        pipeline.push(
            {
                $lookup: {
                    from: process.env.USERS_COLLECTION_NAME,
                    localField: "authorId",
                    foreignField: "_id", 
                    as: "authorData"
                }
            },
            {
                $addFields: {
                    author: { $arrayElemAt: ["$authorData", 0] }
                }
            },
            {
                $project: {
                    authorData: 0,  // Remove the temporary authorData field
                    authorId: 0     // Remove the authorId field since we now have author object
                }
            }
        );

        return this.collection.aggregate(pipeline).toArray();
    }

    async updateImageName(imageId: string, newName: string): Promise<number> {
        const result = await this.collection.updateOne(
            { _id: new ObjectId(imageId) } as any,
            { $set: { name: newName } }
        );
        return result.matchedCount;
    }

    async getImageById(imageId: string) {
        // Use aggregation pipeline with $lookup to denormalize author data for a specific image
        const pipeline = [
            {
                $match: { _id: new ObjectId(imageId) }
            },
            {
                $lookup: {
                    from: process.env.USERS_COLLECTION_NAME,
                    localField: "authorId",
                    foreignField: "_id", 
                    as: "authorData"
                }
            },
            {
                $addFields: {
                    author: { $arrayElemAt: ["$authorData", 0] }
                }
            },
            {
                $project: {
                    authorData: 0,  // Remove the temporary authorData field
                    authorId: 0     // Remove the authorId field since we now have author object
                }
            }
        ];

        const results = await this.collection.aggregate(pipeline).toArray();
        return results.length > 0 ? results[0] : null;
    }
} 