import {
  generateSingleDaysDataForClient,
  generateWholeStiipShift,
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
