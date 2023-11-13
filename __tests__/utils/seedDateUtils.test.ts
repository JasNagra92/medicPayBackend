import { getPayPeriodFromMonthYearAndPlatoon } from "../../utils/seedDateUtils";

describe("getMonthsPayPeriodsFromYearAndPlatoon", () => {
  it("should return the given months pay period data with the correct rotations for a platoon, year, and month", () => {
    getPayPeriodFromMonthYearAndPlatoon("C", 12, 2023);
  });
});
