import {
  generateSingleDaysDataForClient,
  generateWholeStiipShift,
  generateLateCallShift,
} from "../../utils/scheduleGenerationUtils";
import {
  IScheduleItem,
  ISingleDaysPayDataForClient,
  IUserDataForDB,
} from "../../interfaces/dbInterfaces";

describe("generateSingleDaysDataForClient", () => {
  it("should return a singledaysPay data in the correct shape when given a userInfo it gets from the client and a sheduleItem day it gets from a previous function call", () => {
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
    let testScheduleItem = {
      date: new Date(2023, 10, 4),
      rotation: "Night 1",
    };

    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, testScheduleItem)
    ).toBeDefined();
    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, testScheduleItem)
    ).toHaveProperty("date");
    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, testScheduleItem)
    ).toHaveProperty("rotation");
    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, testScheduleItem)
    ).toHaveProperty("baseHoursWorked");
    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, testScheduleItem)
    ).toHaveProperty("dayTotal");
  });
});

describe("generateWholeStiipShift", () => {
  it("should return a stiip day with 0 earnings in the ISingleDaysPayData form", () => {
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
    let date: string = new Date(2023, 10, 3).toISOString();
    let rotation: string = "Night 1";

    let stiipDayData: ISingleDaysPayDataForClient = generateWholeStiipShift(
      userInfoFromRequest,
      date,
      rotation
    );
    expect(stiipDayData.stiipHours).toBeDefined();
  });
});

describe("generateLateCallShift", () => {
  it("should return an updated singleDaysPayData with OTHours, and regularOTEarnings values filled in", () => {
    const testUserInfo: IUserDataForDB = {
      id: "3r342edsfserseresdf",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "A",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "43.13",
    };
    // 27th should be 'Day 1' of A platoons rotation with the payDay being Nov 17th
    const dateOfLateCall = new Date(2023, 9, 27);
    const rotation = "Day 1";
    // shift start and end times will be used for wage calculations on the backend, originally start at 0600 on the 27th and end at 1800 on the 27th, updated shift end will be 1900, which should accrue night shift and weekend premiums of 1 hour
    const shiftStart = new Date(2023, 9, 27, 6);
    const originalShiftEnd = new Date(2023, 9, 27, 18);
    const updatedShiftEnd = new Date(2023, 9, 27, 19);
    const result = generateLateCallShift(
      testUserInfo,
      { date: dateOfLateCall, rotation },
      shiftStart,
      updatedShiftEnd,
      originalShiftEnd
    );
    expect(result.OTDoubleTime).toEqual(1);
  });
});
