import {
  generateSingleDaysDataForClient,
  generateWholeStiipShift,
} from "../../utils/scheduleGenerationUtils";
import {
  IScheduleItem,
  ISingleDaysPayDataForClient,
  IUserDataForDB,
} from "../../interfaces/dbInterfaces";

// describe("generateSingleDaysDataForClient", () => {
//   it("should return a singledaysPay data in the correct shape when given a userInfo it gets from the client and a sheduleItem day it gets from a previous function call", () => {
//     // November 17th
//     let requestedPayDay = new Date(2023, 10, 17);
//     let userInfoFromRequest: IUserDataForDB = {
//       id: "test",
//       email: "test",
//       shiftPattern: "Alpha",
//       platoon: "A",
//       dayShiftStartTime: { hours: 6, minutes: 0 },
//       dayShiftEndTime: { hours: 18, minutes: 0 },
//       nightShiftStartTime: { hours: 18, minutes: 0 },
//       nightShiftEndTime: { hours: 6, minutes: 0 },
//       hourlyWage: "43.13",
//     };

//     expect(
//       generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
//     ).toBeDefined();
//     expect(
//       generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
//     ).toHaveProperty("date");
//     expect(
//       generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
//     ).toHaveProperty("rotation");
//     expect(
//       generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
//     ).toHaveProperty("baseHoursWorked");
//     expect(
//       generateSingleDaysDataForClient(userInfoFromRequest, payPeriodSchedule[0])
//     ).toHaveProperty("dayTotal");
//   });
// });

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
