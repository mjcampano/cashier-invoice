import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { connectMongo, resolveMongoDbName, resolveMongoUri } from "../src/config/mongo.js";

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const SAMPLE_SIZE = toInt(process.env.MONGO_EXPORT_SAMPLE_SIZE, 200);
const OUTPUT_PATH = process.env.SCHEMA_EXPORT_PATH || "./schema-export.json";

const detectType = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "Date";
  if (Buffer.isBuffer(value)) return "Buffer";

  const ctorName = value?.constructor?.name;
  if (ctorName === "ObjectId") return "ObjectId";
  if (ctorName === "Decimal128") return "Decimal128";
  if (ctorName === "Binary") return "Binary";
  if (ctorName === "Long") return "Long";
  if (ctorName === "Int32") return "Int32";
  if (ctorName === "Timestamp") return "Timestamp";

  const baseType = typeof value;
  if (baseType === "object") return "object";
  return baseType;
};

const addFieldType = (map, fieldPath, fieldType) => {
  if (!fieldPath) return;
  if (!map.has(fieldPath)) {
    map.set(fieldPath, new Set());
  }
  map.get(fieldPath).add(fieldType);
};

const collectFieldTypes = (value, currentPath, typeMap) => {
  const type = detectType(value);
  addFieldType(typeMap, currentPath, type);

  if (type === "object") {
    const entries = Object.entries(value || {});
    for (const [key, nested] of entries) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      collectFieldTypes(nested, nextPath, typeMap);
    }
  }

  if (type === "array") {
    const arrayPath = `${currentPath}[]`;
    for (const item of value) {
      collectFieldTypes(item, arrayPath, typeMap);
    }
  }
};

const mapToSerializable = (typeMap) =>
  Object.fromEntries(
    [...typeMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fieldPath, typeSet]) => [fieldPath, [...typeSet].sort()])
  );

const sanitizeCollectionMeta = (meta) => {
  if (!meta || typeof meta !== "object") return {};

  const { name, type, info, idIndex, options } = meta;
  return { name, type, info, idIndex, options };
};

const run = async () => {
  if (!resolveMongoUri()) {
    console.error("Missing MongoDB URI. Set MONGODB_URI, MONGO_URI, or DATABASE_URL.");
    process.exit(1);
  }

  try {
    await connectMongo();
    const db = mongoose.connection.db;
    const collections = await db.listCollections({}, { nameOnly: false }).toArray();

    const report = {
      generatedAt: new Date().toISOString(),
      database: mongoose.connection.name || "unknown",
      targetDbNameOption: resolveMongoDbName() || "",
      sampleSizePerCollection: SAMPLE_SIZE,
      collections: [],
    };

    for (const collectionInfo of collections) {
      const name = collectionInfo.name;
      if (!name || name.startsWith("system.")) continue;

      const collection = db.collection(name);
      const documentCount = await collection.estimatedDocumentCount();
      const indexes = await collection.indexes();

      const effectiveSampleSize = Math.max(0, Math.min(SAMPLE_SIZE, documentCount));
      let samples = [];

      if (effectiveSampleSize > 0) {
        try {
          samples = await collection.aggregate([{ $sample: { size: effectiveSampleSize } }]).toArray();
        } catch {
          samples = await collection.find({}).limit(effectiveSampleSize).toArray();
        }
      }

      const typeMap = new Map();
      for (const sample of samples) {
        collectFieldTypes(sample, "", typeMap);
      }

      report.collections.push({
        name,
        documentCount,
        sampledDocuments: samples.length,
        metadata: sanitizeCollectionMeta(collectionInfo),
        indexes,
        inferredFieldTypes: mapToSerializable(typeMap),
      });
    }

    const outputFile = path.resolve(process.cwd(), OUTPUT_PATH);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, JSON.stringify(report, null, 2), "utf8");

    console.log(`Schema export complete: ${outputFile}`);
    console.log(`Collections exported: ${report.collections.length}`);
  } catch (error) {
    console.error("Schema export failed.");
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();
