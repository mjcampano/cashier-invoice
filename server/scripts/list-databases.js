import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectMongo, resolveMongoUri } from "../src/config/mongo.js";

dotenv.config();

const run = async () => {
  if (!resolveMongoUri()) {
    console.error("Missing MongoDB URI. Set MONGODB_URI, MONGO_URI, or DATABASE_URL.");
    process.exit(1);
  }

  try {
    await connectMongo();
    const result = await mongoose.connection.db
      .admin()
      .command({ listDatabases: 1, nameOnly: true });

    const names = (result.databases || []).map((db) => db.name);
    console.log(`Databases (${names.length}):`);
    for (const name of names) {
      console.log(`- ${name}`);
    }
  } catch (error) {
    console.error(
      "Failed to list databases. Your user may not have listDatabases privilege.",
      error
    );
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();
