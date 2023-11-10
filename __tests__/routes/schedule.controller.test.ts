import supertest, { Response } from "supertest";
import app from "../../index";
import { IUserDataForDB } from "../../interfaces/dbInterfaces";

describe("getSchedule endpoint", () => {
  it("should recieve a userInfo object, and an array of payDays from the client, and then return an object containing the payPeriod Data for all the payDays the client sent", async () => {
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
    const testPayDay: string[] = [new Date(2023, 10, 17).toISOString()];

    const response: Response = await supertest(app).post("/getPayData").send({
      userInfo: testUserInfo,
      requestedPayDays: testPayDay,
    });
    console.log(response.body.data);
    expect(response.status).toBe(200);
  });
});
