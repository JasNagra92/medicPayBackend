import {
  getPayPeriodFromMonthYearAndPlatoon,
  getDeductionsForYear,
} from "../../utils/seedDateUtils";
import { IUserDataForDB } from "../../interfaces/dbInterfaces";

describe("getMonthsPayPeriodsFromYearAndPlatoon", () => {
  it("should return the given months pay period data with the correct rotations for a platoon, year, and month", () => {
    let data = getPayPeriodFromMonthYearAndPlatoon("A", "R1", 3, 2023);
  });
});

describe("getEIDeductionsForYear", () => {
  it("should return an array of payDays and the corresponding EI and CPP deductions due to be taken off that pay period", () => {
    let userInfoFromRequest: IUserDataForDB = {
      id: "test",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "D",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "43.13",
    };
    let data = getDeductionsForYear("D", "R1", 2024, userInfoFromRequest);
    console.log(data);
  });
});
