import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Connection } from "mongoose";

let mongo: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  mongo = await MongoMemoryServer.create();
  const uri: string = mongo.getUri();

  await mongoose.connect(uri);
};

export const dropDB = async (): Promise<void> => {
  if (mongo) {
    const connection: Connection = mongoose.connection;
    await connection.dropDatabase();
    await connection.close();
    await mongo.stop();
  }
};

export const dropCollections = async () => {
  if (mongo) {
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.drop();
    }
  }
};
