import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectMongo, resolveMongoDbName, resolveMongoUri } from "../src/config/mongo.js";

dotenv.config();

const fail = (message, error) => {
  console.error(message);
  if (error) {
    console.error(error);
  }
  process.exit(1);
};

const run = async () => {
  const uri = resolveMongoUri();
  if (!uri) {
    fail("Missing MongoDB URI. Set MONGODB_URI, MONGO_URI, or DATABASE_URL.");
  }

  try {
    await connectMongo();
    const db = mongoose.connection.db;
    const admin = db.admin();

    const ping = await admin.ping();
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();

    console.log("MongoDB connection successful.");
    console.log(`Database: ${mongoose.connection.name || "unknown"}`);
    console.log(`Target dbName option: ${resolveMongoDbName() || "<from URI/default>"}`);
    console.log(`Ping result: ${JSON.stringify(ping)}`);
    console.log(`Collections (${collections.length}):`);
    for (const col of collections) {
      console.log(`- ${col.name}`);
    }
  } catch (error) {
    fail(
      "MongoDB connection failed. Check Atlas IP allowlist, DB user credentials, and connection string.",
      error
    );
  } finally {
    await mongoose.disconnect();
  }
};

run();
