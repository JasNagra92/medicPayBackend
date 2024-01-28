import {
  getHoursWorked,
  generateEndTimeDate,
  generateStartTimeDate,
  getNightShiftPremiumHoursWorked,
  getWeekendPremiumHoursWorked,
} from "../../utils/hourAndMoneyUtils";

import { IUserDataForDB } from "../../interfaces/dbInterfaces";

const baseRate: number = 43.13;
const nightShiftPremium: number = 5.6;
const weekendPremium: number = 2.25;

describe("getHoursWorked", () => {
  it("returns 12 when given 2 start times 12 hours apart", () => {
    const startTime: Date = new Date(2023, 9, 5, 18, 0, 0);
    const endTime: Date = new Date(2023, 9, 6, 6, 0, 0);
    expect(getHoursWorked(startTime, endTime)).toBe(12);
  });
  it("returns 8 when given 2 dates 8 hours apart", () => {
    const startTime: Date = new Date(2023, 9, 5, 22, 0, 0);
    const endTime: Date = new Date(2023, 9, 6, 6, 0, 0);
    expect(getHoursWorked(startTime, endTime)).toBe(8);
  });
  it("returns 12 when given Nov5th 6pm to 6am", () => {
    const startTime: Date = new Date(2023, 10, 5, 6, 0, 0);
    const endTime: Date = new Date(2023, 10, 5, 18, 0, 0);
    expect(getHoursWorked(startTime, endTime)).toBe(12);
  });
});

describe("generateStartTimeDate", () => {
  it("should return a date object with the correct start time using the info from the userinfo object as well as a schedule item", () => {
    let userInfoTest: IUserDataForDB = {
      id: "test",
      email: "test@hotmail.com",
      hourlyWage: "",
      shiftPattern: "",
      platoon: "A",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 0, minutes: 0 },
      nightShiftStartTime: { hours: 0, minutes: 0 },
      nightShiftEndTime: { hours: 0, minutes: 0 },
    };

    let scheduleItem = { date: new Date(2023, 9, 27), rotation: "Day 1" };

    let expectedDate = new Date(2023, 9, 27, 6, 0);

    let result = generateStartTimeDate(scheduleItem, userInfoTest);
    expect(result).toEqual(expectedDate);
  });

  it("should return a date object with the correct end time using the info from the userinfo object as well as a schedule item when its a night shift", () => {
    let userInfoTest: IUserDataForDB = {
      id: "test",
      email: "test@hotmail.com",
      hourlyWage: "",
      shiftPattern: "",
      platoon: "A",
      dayShiftStartTime: { hours: 0, minutes: 0 },
      dayShiftEndTime: { hours: 0, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 0, minutes: 0 },
    };

    let scheduleItem = { date: new Date(2023, 9, 27), rotation: "Night 1" };

    let expectedDate = new Date(2023, 9, 27, 18, 0);

    let result = generateStartTimeDate(scheduleItem, userInfoTest);
    expect(result).toEqual(expectedDate);
  });
});

describe("generateEndTimeDate", () => {
  it("should return a date object with the correct end time using the info from the userinfo object as well as a schedule item when its a day shift", () => {
    let userInfoTest: IUserDataForDB = {
      id: "test",
      email: "test@hotmail.com",
      hourlyWage: "",
      shiftPattern: "",
      platoon: "A",
      dayShiftStartTime: { hours: 0, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 0, minutes: 0 },
      nightShiftEndTime: { hours: 0, minutes: 0 },
    };

    let scheduleItem = { date: new Date(2023, 9, 27), rotation: "Day 1" };

    let expectedDate = new Date(2023, 9, 27, 18, 0);

    let result = generateEndTimeDate(scheduleItem, userInfoTest);
    expect(result).toEqual(expectedDate);
  });
  it("should return a date object with the correct end time using the info from the userinfo object as well as a schedule item when its a night shift, should be the next day ", () => {
    let userInfoTest: IUserDataForDB = {
      id: "test",
      email: "test@hotmail.com",
      hourlyWage: "",
      shiftPattern: "",
      platoon: "A",
      dayShiftStartTime: { hours: 0, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 0, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
    };

    let scheduleItem = { date: new Date(2023, 9, 27), rotation: "night 1" };

    let expectedDate = new Date(2023, 9, 28, 6, 0);

    let result = generateEndTimeDate(scheduleItem, userInfoTest);
    expect(result).toEqual(expectedDate);
  });
});

describe("getNightShiftPremiumHoursWorked", () => {
  it("should return 12 if hours worked all fall between 1800 and 0600", () => {
    let shiftStart: Date = new Date(2023, 9, 15, 18);
    let shiftEnd: Date = new Date(2023, 9, 16, 6);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(12);
  });
  it("should return 0 if the start and end times are both during the day", () => {
    let shiftStart: Date = new Date(2023, 9, 15, 6);
    let shiftEnd: Date = new Date(2023, 9, 15, 18);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(0);
  });
  it("should return 9 if start time is 2100 and end time is 0900", () => {
    let shiftStart: Date = new Date(2023, 9, 15, 21);
    let shiftEnd: Date = new Date(2023, 9, 16, 9);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(9);
  });
  it("should return 6.5 if start time is friday night at 1800 and end time is saturday morning at 0030", () => {
    let shiftStart: Date = new Date(2023, 9, 27, 18);
    let shiftEnd: Date = new Date(2023, 9, 28, 0, 30);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6.5);
  });
  it("should return 6.5 if start time is sunday night at 2330 and end time is monday morning at 0600", () => {
    let shiftStart: Date = new Date(2023, 9, 22, 23, 30);
    let shiftEnd: Date = new Date(2023, 9, 23, 6);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6.5);
  });
  it("should return 5.5 if start time is friday night at 1830 and end time is saturday night at 0000", () => {
    let shiftStart: Date = new Date(2023, 9, 20, 18, 30);
    let shiftEnd: Date = new Date(2023, 9, 21, 0);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(5.5);
  });
  it("should return 6 if start time is friday night at 1730 and end time is saturday night at 0000", () => {
    let shiftStart: Date = new Date(2023, 9, 20, 17, 30);
    let shiftEnd: Date = new Date(2023, 9, 21, 0);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6);
  });
  it("should return 5.5 if start time is friday night at 1830 and end time is saturday night at 0030", () => {
    let shiftStart: Date = new Date(2023, 9, 20, 18, 30);
    let shiftEnd: Date = new Date(2023, 9, 21, 0, 30);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6);
  });
  it("should return 12 if start time is friday night at 1730 and end time is saturday morning at 0530", () => {
    let shiftStart: Date = new Date(2023, 9, 20, 17, 30);
    let shiftEnd: Date = new Date(2023, 9, 21, 5, 30);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(11.5);
  });
  it("should return 6.5 if start time is friday night at 1730 and end time is saturday night at 0030", () => {
    let shiftStart: Date = new Date(2023, 9, 20, 17, 30);
    let shiftEnd: Date = new Date(2023, 9, 21, 0, 30);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6.5);
  });
  it("should return 4.42 with start time of 0712 and end time of 2225", () => {
    let shiftStart: Date = new Date(2024, 0, 18, 7, 12);
    let shiftEnd: Date = new Date(2024, 0, 18, 22, 25);

    expect(getNightShiftPremiumHoursWorked(shiftStart, shiftEnd)).toBe(4.42);
  });
});

describe("getWeekendPremiumHoursWorked", () => {
  it("should return 12 if start time and end time is a 12 hour shift between friday night at 1800 and monday morning at 0600", () => {
    let shiftStart: Date = new Date(2023, 9, 28, 6);
    let shiftEnd: Date = new Date(2023, 9, 28, 18);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(12);
  });

  it("should return 3 if shift starts on a friday day at 0900 and ends friday night at 2100", () => {
    let shiftStart: Date = new Date(2023, 9, 27, 9);
    let shiftEnd: Date = new Date(2023, 9, 27, 21);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(3);
  });
  it("should return 6.5 if start time is friday night at 1800 and end time is saturday morning at 0030", () => {
    let shiftStart: Date = new Date(2023, 9, 27, 18);
    let shiftEnd: Date = new Date(2023, 9, 28, 0, 30);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6.5);
  });
  it("should return 6.5 if start time is sunday night at 2330 and end time is monday morning at 0630", () => {
    let shiftStart: Date = new Date(2023, 9, 22, 23, 30);
    let shiftEnd: Date = new Date(2023, 9, 23, 6, 30);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6.5);
  });
  it("should return 6.5 if start time is sunday night at 2330 and end time is monday morning at 0600", () => {
    let shiftStart: Date = new Date(2023, 9, 22, 23, 30);
    let shiftEnd: Date = new Date(2023, 9, 23, 6);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6.5);
  });
  it("should return 6 if start time is friday day at 1730 and end time is saturday morning at 0600", () => {
    let shiftStart: Date = new Date(2023, 9, 20, 17, 30);
    let shiftEnd: Date = new Date(2023, 9, 21, 0);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6);
  });
  it("should return 12 if start time is friday night at 1800 and end time is saturday morning at 0600", () => {
    let shiftStart: Date = new Date(2023, 9, 14, 18);
    let shiftEnd: Date = new Date(2023, 9, 15, 6);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(12);
  });
  it("should return 12 if start time is friday night at 1800 and end time is saturday morning at 0600", () => {
    let shiftStart: Date = new Date(2023, 9, 20, 18);
    let shiftEnd: Date = new Date(2023, 9, 21, 6);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(12);
  });
  it("should return 11.5 if start time is friday night at 1830 and end time is saturday morning at 0600", () => {
    let shiftStart: Date = new Date(2023, 9, 20, 18, 30);
    let shiftEnd: Date = new Date(2023, 9, 21, 6);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(11.5);
  });
  it("should return 6.5 if start time is friday day at 1230 and end time is saturday morning at 0030", () => {
    let shiftStart: Date = new Date(2023, 9, 20, 12, 30);
    let shiftEnd: Date = new Date(2023, 9, 21, 0, 30);

    expect(getWeekendPremiumHoursWorked(shiftStart, shiftEnd)).toBe(6.5);
  });
});
