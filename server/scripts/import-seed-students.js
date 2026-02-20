import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectMongo, resolveMongoUri } from "../src/config/mongo.js";
import Student from "../src/models/Student.js";
import { seedStudents } from "../../src/features/admin/data/seedData.js";

dotenv.config();

const ALLOWED_STATUS = new Set([
  "Active",
  "Inactive",
  "Archived",
  "Graduated",
  "Pending",
  "Transferred",
]);

const toSafeDate = (value, fallback = new Date()) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const normalizeStatus = (value) => {
  const text = String(value || "").trim();
  return ALLOWED_STATUS.has(text) ? text : "Active";
};

const mapSeedStudent = (item) => {
  const createdAt = toSafeDate(
    item.createdAt || item.currentEnrollment?.enrolledAt || Date.now()
  );
  const updatedAt = toSafeDate(item.updatedAt || item.createdAt || Date.now(), createdAt);

  return {
    studentCode: String(item.studentCode || item.id || "").trim(),
    fullName: String(item.fullName || "").trim(),
    gradeYear: String(item.currentEnrollment?.gradeLevel || "").trim(),
    sectionClass: String(item.currentEnrollment?.section || "").trim(),
    guardianContact: String(item.guardianContact || "").trim(),
    status: normalizeStatus(item.status),
    enrollmentDate: toSafeDate(item.currentEnrollment?.enrolledAt || createdAt, createdAt),
    createdAt,
    updatedAt,
  };
};

const run = async () => {
  if (!resolveMongoUri()) {
    throw new Error("Missing MongoDB URI. Set MONGODB_URI, MONGO_URI, or DATABASE_URL.");
  }

  const docs = seedStudents
    .map(mapSeedStudent)
    .filter((student) => student.studentCode && student.fullName);

  if (!docs.length) {
    throw new Error("No valid students found in seed data.");
  }

  await connectMongo();

  const operations = docs.map((student) => ({
    updateOne: {
      filter: { studentCode: student.studentCode },
      update: {
        $set: {
          fullName: student.fullName,
          gradeYear: student.gradeYear,
          sectionClass: student.sectionClass,
          guardianContact: student.guardianContact,
          status: student.status,
          enrollmentDate: student.enrollmentDate,
          updatedAt: student.updatedAt,
        },
        $setOnInsert: {
          studentCode: student.studentCode,
          createdAt: student.createdAt,
        },
      },
      upsert: true,
    },
  }));

  const result = await Student.bulkWrite(operations, { ordered: false });

  console.log(
    `Students import complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}`
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Import students error:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors on failed startup
  }
  process.exit(1);
});
