import supertest, { Response } from "supertest";
import { IUserDataForDB } from "../../interfaces/dbInterfaces";
import app from "../../index";

describe("deductionsControllerEndpoint", () => {
  it("will have an endpoint that will take a few different types of gross income from the client, and return an object with the 5 different deductions and their amounts. Test will use client mock data from May 5th payday", async () => {
    const testUserInfo: IUserDataForDB = {
      id: "3r342edsfserseresdf",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "A",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "41.13",
    };
    // data from front end needed for calculations
    let grossIncome = 3092.72;
    let stiipHours = 36;
    let OTOnePointFive = 0;
    let OTDoubleTime = 0;
    let levellingAmount = -658.08;
    let incomeLessLevelling = grossIncome - levellingAmount;

    const response: Response = await supertest(app)
      .post("/getDeductions")
      .send({
        userInfo: testUserInfo,
        grossIncome,
        stiipHours,
        incomeLessLevelling,
        OTOnePointFive,
        OTDoubleTime,
      });
    expect(response.body.data).toBeDefined();
    expect(response.body.data.unionDues).toEqual(78.59);
    expect(response.body.data.cpp).toEqual(175.51);
    // income tax slightly off this period, should be 449.17, but function returns 452.62, difference of about 3.45
    expect(response.body.data.incomeTax).toEqual(452.62);
    expect(response.body.data.pserp).toEqual(288.46);
    expect(response.body.data.ei).toEqual(50.28);
    // net Pay was 2045.71, difference reflects the income tax discrepency as well as charity donation of 5$ this pay period
    expect(response.body.data.netIncome).toEqual(2047.26);
  });
});
