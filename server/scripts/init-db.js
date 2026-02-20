import dotenv from "dotenv";
import mongoose from "mongoose";
import COLLECTION_MODELS from "../src/models/index.js";
import { connectMongo, resolveMongoUri } from "../src/config/mongo.js";
import Role from "../src/models/Role.js";
import Setting from "../src/models/Setting.js";

dotenv.config();

if (!resolveMongoUri()) {
  console.error("Missing MongoDB URI. Set MONGODB_URI, MONGO_URI, or DATABASE_URL.");
  process.exit(1);
}

const bootstrapDefaults = async () => {
  await Role.updateOne(
    { name: "admin" },
    {
      $setOnInsert: {
        name: "admin",
        description: "Default school admin role",
        permissions: [
          "users.read",
          "users.write",
          "teachers.manage",
          "students.manage",
          "classes.manage",
          "enrollments.manage",
          "attendance.manage",
          "finance.manage",
          "notices.manage",
          "messages.manage",
          "events.manage",
          "settings.manage",
          "audit.read",
        ],
        isSystem: true,
      },
    },
    { upsert: true }
  );

  await Setting.updateOne(
    { key: "school.profile" },
    {
      $setOnInsert: {
        key: "school.profile",
        value: {
          name: "Schola Academy",
          terms: ["1st Term", "2nd Term", "Summer"],
          feeTypes: ["Tuition", "Miscellaneous", "Laboratory"],
        },
        description: "Default school profile and finance terms.",
      },
    },
    { upsert: true }
  );
};

const run = async () => {
  await connectMongo();

  const modelEntries = Object.entries(COLLECTION_MODELS);
  for (const [collectionName, model] of modelEntries) {
    await model.init();
    console.log(`Ready collection/indexes: ${collectionName}`);
  }

  await bootstrapDefaults();
  console.log("Default role/settings bootstrap complete.");

  await mongoose.disconnect();
  console.log("Database connection OK.");
};

run().catch((err) => {
  console.error("Init DB error:", err);
  process.exit(1);
});
