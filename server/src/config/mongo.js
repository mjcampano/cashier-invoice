import mongoose from "mongoose";

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
};

export const resolveMongoUri = () =>
  process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || "";

export const resolveMongoDbName = () =>
  (process.env.MONGO_DB_NAME || "").trim();

export const resolveMongoOptions = () => {
  const directConnection = toBool(process.env.MONGO_DIRECT_CONNECTION);
  const tls = toBool(process.env.MONGO_TLS);
  const dbName = resolveMongoDbName();

  return {
    appName: process.env.MONGO_APP_NAME || "cashier-invoice-api",
    serverSelectionTimeoutMS: toInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10000),
    ...(dbName ? { dbName } : {}),
    ...(directConnection === undefined ? {} : { directConnection }),
    ...(tls === undefined ? {} : { tls }),
  };
};

export const getDbStateLabel = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState] || "unknown";
};

export const connectMongo = async () => {
  const uri = resolveMongoUri();
  if (!uri) {
    throw new Error("Missing MongoDB URI. Set MONGODB_URI, MONGO_URI, or DATABASE_URL.");
  }

  await mongoose.connect(uri, resolveMongoOptions());
  return mongoose.connection;
};
