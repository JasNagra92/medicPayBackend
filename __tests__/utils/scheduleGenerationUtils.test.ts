import {
  getPayPeriodStart,
  getPayPeriodSchedule,
  generateSingleDaysDataForClient,
  generatePaydaysMap,
  generateWholeStiipShift,
} from "../../utils/scheduleGenerationUtils";
import {
  IScheduleItem,
  ISingleDaysPayDataForClient,
  IUserDataForDB,
} from "../../interfaces/dbInterfaces";

describe("getPayPeriodStart", () => {
  it("function returns Oct 13,2023, when given a pay day date of Nov 3rd, 2023, pay periods always start 21 days before pay day and run for 14 days", () => {
    const payDay = new Date(2023, 10, 3);
    const expectedDate = new Date(2023, 9, 13);

    expect(getPayPeriodStart(payDay)).toEqual(expectedDate);
  });
});

describe("getPayPeriodSchedule", () => {
  it("When given a pay day and a platoon by the user, it finds the start of the pay period for that pay day, finds the month that it is in, and then creates a 45 day schedule for the given platoon, in the format of an array filled with 45 objects, 1 object per day, {date: Date object, rotation: day 1/day 2/night 1/night 2/day off}, but only returns the 14 days of the pay period", () => {
    // user input
    const payDay: Date = new Date(2023, 10, 3);
    const platoon: string = "A";

    const payPeriodStart: Date = getPayPeriodStart(payDay);

    const schedule: IScheduleItem[] = getPayPeriodSchedule(
      payPeriodStart,
      platoon
    );

    expect(schedule).toHaveLength(14);
    expect(schedule[0].rotation).toBe("Night 1");
    expect(schedule[2].rotation).toBe("day off");
  });
  it("Day 1's date should be December 8th when given a payday of Dec 29th", () => {
    const payDay: Date = new Date(2023, 11, 29);
    const platoon: string = "C";

    const payPeriodStart: Date = getPayPeriodStart(payDay);

    const schedule: IScheduleItem[] = getPayPeriodSchedule(
      payPeriodStart,
      platoon
    );

    expect(schedule[0].date).toEqual(new Date(2023, 11, 8));
  });
  it("first schedule item when given a payday of Dec 1st and C platoon, should be Nov 10th which is a Night 1", () => {
    const payDay: Date = new Date(2023, 11, 1);
    const platoon: string = "C";

    const payPeriodStart: Date = getPayPeriodStart(payDay);

    const schedule: IScheduleItem[] = getPayPeriodSchedule(
      payPeriodStart,
      platoon
    );

    expect(schedule[0].rotation).toEqual("Night 1");
  });
  it("first schedule item when given a payday of Dec 1st and A platoon, should be Nov 10th which is a day off", () => {
    const payDay: Date = new Date(2023, 11, 1);
    const platoon: string = "A";

    const payPeriodStart: Date = getPayPeriodStart(payDay);

    const schedule: IScheduleItem[] = getPayPeriodSchedule(
      payPeriodStart,
      platoon
    );

    expect(schedule[0].rotation).toEqual("day off");
    expect(schedule[0].date).toEqual(new Date(2023, 10, 10));
  });
});
describe("generateSingleDaysDataForClient", () => {
  it("should return a singledaysPay data in the correct shape when given a userInfo it gets from the client and a sheduleItem day it gets from a previous function call", () => {
    // November 17th
    let requestedPayDay = new Date(2023, 10, 17);
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

    let payPeriodStart = getPayPeriodStart(requestedPayDay);
    let payPeriodSchedule = getPayPeriodSchedule(
      payPeriodStart,
      userInfoFromRequest.platoon
    );

    expect(payPeriodSchedule).toBeDefined();
    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
    ).toBeDefined();
    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
    ).toHaveProperty("date");
    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
    ).toHaveProperty("rotation");
    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
    ).toHaveProperty("baseHoursWorked");
    expect(
      generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
    ).toHaveProperty("dayTotal");
  });
});

describe("generatePaydaysMap", () => {
  it("should return a map of the paydays in each month from nov 2023 to dec 2024", () => {
    let payDays = generatePaydaysMap(new Date(2023, 10, 3), 32);

    expect(payDays).toBeDefined();
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
