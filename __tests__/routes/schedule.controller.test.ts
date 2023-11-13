import supertest, { Response } from "supertest";
import app from "../../index";
import { IUserDataForDB } from "../../interfaces/dbInterfaces";

describe("getSchedule endpoint", () => {
  it("should recieve a userInfo object, and month and year from the client, and then return an object containing the payPeriod Data for the paydays in that month and year", async () => {
    const testUserInfo: IUserDataForDB = {
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
    const testMonth: number = 4;
    const testYear: number = 2024;

    const response: Response = await supertest(app).post("/getPayData").send({
      userInfo: testUserInfo,
      month: testMonth,
      year: testYear,
    });
    expect(
      response.body.data[0].workDaysInPayPeriod[3].shiftStart
    ).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toHaveProperty("payDay");
    expect(response.body.data[0]).toHaveProperty("workDaysInPayPeriod");
    expect(response.body.data[0].workDaysInPayPeriod.length).toEqual(14);
  });
});

describe("addStiip endpoint", () => {
  it("should recieve a request, sent when the user toggles stiip usage for a single day, either whole shift or partial shift, if a whole shift, should create a new singleDaysPayData and send it back to the client", async () => {
    const testUserInfo: IUserDataForDB = {
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

    const dateOfStiip = new Date(2023, 10, 5).toISOString();
    const rotation = "Night 1";
    const response = await supertest(app).post("/getPayData/addStiip").send({
      userInfo: testUserInfo,
      date: dateOfStiip,
      rotation,
    });
    expect(response.body.data).toBeDefined();
    expect(response.body.data.stiipHours).toEqual(12);
    expect(response.body.data.baseHoursWorked).toEqual(0);
  });
});
