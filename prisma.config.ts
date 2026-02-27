import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI config (schema path, migrations, seed).
 * Replaces deprecated package.json#prisma. Database URL remains in schema.prisma (Prisma 6).
 * dotenv/config загружает .env из корня проекта, чтобы DATABASE_URL был доступен при migrate/generate.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
