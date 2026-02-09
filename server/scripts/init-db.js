import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const uri =
  process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
const collectionName = process.env.MONGO_COLLECTION || "invoices";

if (!uri) {
  console.error("Missing MongoDB URI. Set MONGODB_URI, MONGO_URI, or DATABASE_URL.");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const existing = await db
    .listCollections({ name: collectionName })
    .toArray();

  if (existing.length === 0) {
    await db.createCollection(collectionName);
    console.log(`Created collection: ${collectionName}`);
  } else {
    console.log(`Collection already exists: ${collectionName}`);
  }

  await mongoose.disconnect();
  console.log("Database connection OK.");
};

run().catch((err) => {
  console.error("Init DB error:", err);
  process.exit(1);
});
