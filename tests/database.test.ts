import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCoachRepository, type CoachDatabase } from "@/lib/coach-repository";

let database: CoachDatabase;

describe("coach database foundation", () => {
  beforeEach(async () => {
    database = await createCoachRepository("file:/tmp/coachconnect-test.db");
    await database.coach.deleteMany();
  });

  afterEach(async () => {
    await database.$disconnect();
  });

  it("stores only broad public location and PKR session pricing", async () => {
    const coach = await database.coach.create({
      data: {
        name: "Ayesha Khan",
        sport: "Cricket",
        city: "Lahore",
        broadArea: "Gulberg",
        sessionPricePkr: 3500,
        offersOnline: false,
        approved: true,
      },
    });

    expect(coach).toMatchObject({
      city: "Lahore",
      broadArea: "Gulberg",
      sessionPricePkr: 3500,
      approved: true,
    });
    expect(coach).not.toHaveProperty("exactAddress");
    expect(coach).not.toHaveProperty("email");
  });
});
