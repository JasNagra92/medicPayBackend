import { IUserDataForDB } from "../../interfaces/dbInterfaces";
import supertest, { Response } from "supertest";
import app from "../../index";

describe("saveUserToDB", () => {
  it("should take a userInfo from the client and save it in the db", async () => {
    const testUserInfo: IUserDataForDB = {
      id: "3r342edsfserseresdf",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "A",
      rotation: "R1",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "41.13",
    };

    const response: Response = await supertest(app)
      .post("/users/saveUser")
      .send({ user: testUserInfo });

    console.log(response);
  });
});
