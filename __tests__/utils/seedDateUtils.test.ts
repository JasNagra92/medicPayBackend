import {
  getPayPeriodFromMonthYearAndPlatoon,
  getEIDeductionsForYear,
} from "../../utils/seedDateUtils";
import { IUserDataForDB } from "../../interfaces/dbInterfaces";

describe("getMonthsPayPeriodsFromYearAndPlatoon", () => {
  it("should return the given months pay period data with the correct rotations for a platoon, year, and month", () => {
    getPayPeriodFromMonthYearAndPlatoon("A", 11, 2024);
  });
});

describe("getEIDeductionsForYear", () => {
  it("should return an array of payDays and the corresponding EI deductions due to be taken off that pay period", () => {
    let userInfoFromRequest: IUserDataForDB = {
      id: "test",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "A",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "43.13",
    };
    let data = getEIDeductionsForYear("D", 2023, userInfoFromRequest);
    console.log(data);
  });
});
