import { getPayPeriodFromYearAndPlatoon } from "../../utils/seedDateUtils";

describe("getPayPeriodFromYearAndPlatoon", () => {
  it("should return the years pay period data with the correct rotations for a platoon and year", () => {
    getPayPeriodFromYearAndPlatoon("C", 2023);
  });
});
