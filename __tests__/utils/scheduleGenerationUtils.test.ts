import {
  generateSingleDaysDataForClient,
  generateWholeStiipShift,
  generateLateCallShift,
} from "../../utils/scheduleGenerationUtils";
import {
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
  it("when given a userInfo from client, and a schedule item which includes a date, should generate a single pays data, for this test the day will take place during a statutory holiday, so shift start and end will both be within the stat pay accruing days. This will reduce base hours worked to 0, and instead have the 12 hours under the OTDoubleTime property of the days pay data", () => {
    let userInfoFromRequest: IUserDataForDB = {
      id: "test",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "B",
      rotation: "R1",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "43.13",
    };
    // B Platoon R1 works a day shift on Feb 19th, so the entire 12 hour shift should accrue stat pay, with baseHoursWorked being 0 so the levelling is still accurate
    let testScheduleItem = {
      date: new Date(2024, 1, 19),
      rotation: "Day 2",
    };
    let singleDaysPayData = generateSingleDaysDataForClient(
      userInfoFromRequest,
      testScheduleItem
    );
    expect(singleDaysPayData.OTStatReg).toEqual(12);
    expect(singleDaysPayData.baseHoursWorked).toEqual(0);
  });
  it("when given a userinfo and schedule item that correlates to a user who started a night shift the day before the stat, and finished on the stat with whole starts, eg 1800-0600, 6 hours should be under baseHoursWorked, and 6 hours should be under the OTStatReg property, with 6 hours of premiums", () => {
    let userInfoFromRequest: IUserDataForDB = {
      id: "test",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "A",
      rotation: "R1",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "43.13",
    };
    // A Platoon R1 works a night shift on Feb 19th, so first 6 hours of the shift should accrue base pay, with baseHoursWorked being 6 so the levelling is still accurate and OTStatReg should be 6
    let testScheduleItem = {
      date: new Date(2024, 1, 19),
      rotation: "Night 2",
    };
    let singleDaysPayData = generateSingleDaysDataForClient(
      userInfoFromRequest,
      testScheduleItem
    );
    expect(singleDaysPayData.OTStatReg).toEqual(6);
    expect(singleDaysPayData.baseHoursWorked).toEqual(6);
  });
  it("when given fractional start time and whole end time, with the shift starting not on a stat and ending on a stat, the base hours worked should be 5.5 and the otstatreg should be 6", () => {
    let userInfoFromRequest: IUserDataForDB = {
      id: "test",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "A",
      rotation: "R1",
      dayShiftStartTime: { hours: 6, minutes: 30 },
      dayShiftEndTime: { hours: 18, minutes: 30 },
      nightShiftStartTime: { hours: 18, minutes: 30 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "43.13",
    };
    // A Platoon R1 works a night shift on Feb 18th, so first 5.5 hours of the shift should accrue base pay, with baseHoursWorked being 6 so the levelling is still accurate and OTStatReg should be 6
    let testScheduleItem = {
      date: new Date(2024, 1, 18),
      rotation: "Night 1",
    };
    let singleDaysPayData = generateSingleDaysDataForClient(
      userInfoFromRequest,
      testScheduleItem
    );
    expect(singleDaysPayData.OTStatReg).toEqual(6);
    expect(singleDaysPayData.baseHoursWorked).toEqual(5.5);
  });
  it("if the shift has a whole start time but fractional end time, with shift starting not on a stat holiday but ending on a stat holiday, then basehours should be 6 and stat pay should be 5.5", () => {
    let userInfoFromRequest: IUserDataForDB = {
      id: "test",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "A",
      rotation: "R1",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 5, minutes: 30 },
      hourlyWage: "43.13",
    };
    // A Platoon R1 works a night shift on Feb 19th, so first 6 hours of the shift should accrue base pay, with baseHoursWorked being 6 so the levelling is still accurate and OTStatReg should be 6
    let testScheduleItem = {
      date: new Date(2024, 1, 18),
      rotation: "Night 2",
    };
    let singleDaysPayData = generateSingleDaysDataForClient(
      userInfoFromRequest,
      testScheduleItem
    );
    expect(singleDaysPayData.OTStatReg).toEqual(5.5);
    expect(singleDaysPayData.baseHoursWorked).toEqual(6);
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

  it("Late calls logged with a userInfo object that has shiftPattern as Bravo/Charlie, should have the first hour as 1.5x pay listed under the OTOnePointFive property, and all hours after that up to 16 maximum hours as 2.0x pay under the OTDoubleTime property", () => {
    const testUserInfo: IUserDataForDB = {
      id: "3r342edsfserseresdf",
      email: "test",
      shiftPattern: "Bravo/Charlie",
      platoon: "A",
      dayShiftStartTime: { hours: 9, minutes: 0 },
      dayShiftEndTime: { hours: 20, minutes: 0 },
      nightShiftStartTime: { hours: 14, minutes: 0 },
      nightShiftEndTime: { hours: 1, minutes: 0 },
      hourlyWage: "43.13",
    };
    // 14th should be 'Day 1' of A platoons rotation with the payDay being Nov 17th
    const dateOfLateCall = new Date(2024, 9, 14);
    const rotation = "Day 1";

    // shift start and end times will be used for wage calculations on the backend, originally start at 0900 on the 14th and end at 2000 on the 14th, updated shift end will be 2200, which should accrue night shift premium of 4 hours, with both OTOnePointFive and OTDoubleTime showing as 1 hour each
    const shiftStart = new Date(2024, 9, 14, 9);
    const originalShiftEnd = new Date(2024, 9, 14, 20);
    const updatedShiftEnd = new Date(2024, 9, 14, 22);
    const result = generateLateCallShift(
      testUserInfo,
      { date: dateOfLateCall, rotation },
      shiftStart,
      updatedShiftEnd,
      originalShiftEnd
    );
    expect(result.OTDoubleTime).toEqual(1);
    expect(result.OTOnePointFive).toEqual(1);
  });
  it("Late calls logged with a userInfo object that has shiftPattern as Bravo/Charlie, should have the first hour as 1.5x pay listed under the OTOnePointFive property, and all hours after that up to 16 maximum hours as 2.0x pay under the OTDoubleTime property", () => {
    const testUserInfo: IUserDataForDB = {
      id: "3r342edsfserseresdf",
      email: "test",
      shiftPattern: "Bravo/Charlie",
      platoon: "A",
      dayShiftStartTime: { hours: 9, minutes: 0 },
      dayShiftEndTime: { hours: 20, minutes: 0 },
      nightShiftStartTime: { hours: 14, minutes: 0 },
      nightShiftEndTime: { hours: 1, minutes: 0 },
      hourlyWage: "43.13",
    };
    // 14th should be 'Day 1' of A platoons rotation with the payDay being Nov 17th
    const dateOfLateCall = new Date(2024, 9, 14);
    const rotation = "Day 1";

    // shift start and end times will be used for wage calculations on the backend, originally start at 0900 on the 14th and end at 2000 on the 14th, updated shift end will be 2230, which should accrue night shift premium of 4.5 hours, with both OTOnePointFive of 1 and OTDoubleTime showing as 1.5
    const shiftStart = new Date(2024, 9, 14, 9);
    const originalShiftEnd = new Date(2024, 9, 14, 20);
    const updatedShiftEnd = new Date(2024, 9, 14, 22, 30);
    const result = generateLateCallShift(
      testUserInfo,
      { date: dateOfLateCall, rotation },
      shiftStart,
      updatedShiftEnd,
      originalShiftEnd
    );
    expect(result.OTDoubleTime).toEqual(1.5);
    expect(result.OTOnePointFive).toEqual(1);
    expect(result.nightHoursWorked).toEqual(4.5);
  });
});
