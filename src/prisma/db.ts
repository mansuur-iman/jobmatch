import "temporal-polyfill/full/global";
import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

const databaseUrl =
  process.env.NODE_ENV === "test"
    ? process.env["TEST_DATABASE_URL"]
    : process.env["DATABASE_URL"];

if (!databaseUrl)
  throw new Error("DATABASE_URL is not defined in the environment variables.");

export const db = postgres<Contract>({
  contractJson,
  url: databaseUrl,
});
