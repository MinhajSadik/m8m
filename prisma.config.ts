import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: (process.env["DATABASE_URL"] ??
      process.env["POSTGRES_PRISMA_URL"] ??
      process.env["POSTGRES_URL"]) as string,
    ...((process.env["DIRECT_URL"] ?? process.env["POSTGRES_URL_NON_POOLING"])
      ? { directUrl: process.env["DIRECT_URL"] ?? process.env["POSTGRES_URL_NON_POOLING"] }
      : {}),
  },
});
