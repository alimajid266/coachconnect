import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

export type CoachDatabase = PrismaClient;

export async function createCoachRepository(
  url = process.env.DATABASE_URL ?? "file:./prisma/dev.db",
): Promise<CoachDatabase> {
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}
