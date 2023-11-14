import supertest, { Response } from "supertest";
import app from "../../index";
import { IUserDataForDB } from "../../interfaces/dbInterfaces";

describe("addStiip endpoint", () => {
  it("should recieve a request, sent when the user toggles stiip usage for a single day, either whole shift or partial shift, if a whole shift, should create a new singleDaysPayData and send it back to the client", async () => {
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
  it("should add a users stiip shift into the database, 4 fields, date of bookoff, index which represents where in the workDaysInPayPeriod the new sick days data should go into, rotation to build the sick day data, and the wholeShift boolean to represent if it was a partial shit or a full shift, if wholeShift is false and the user logged a partial book off, store shift start/end and updated end times", async () => {
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
    const dateOfStiip = new Date(2023, 9, 28).toISOString();
    const rotation = "Day 2";
    const payDay = "Nov 17, 2023";
    const index = 1;
    const response: Response = await supertest(app)
      .post("/getPayData/addStiip")
      .send({
        userInfo: testUserInfo,
        date: dateOfStiip,
        rotation,
        payDay,
        index,
      });
    expect(response.body.data).toBeDefined();
    expect(response.body.data.stiipHours).toBeDefined();
  });
  it("should add a users stiip shift into the database for a partial shift, send shift start times for the specific shift in the request, including updatedEndTime, get back a single sickday with partial stiip filled out, but on the backend also save the partial shift into the db", async () => {
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
    const dateOfStiip = new Date(2023, 9, 29).toISOString();
    const rotation = "Night 1";
    const payDay = "Nov 17, 2023";
    const index = 2;
    // user was scheduled to start on the 29th of Oct at 1800, but booked off at 0300 instead of scheduled 0600 end time on the next day on the 30th
    const shiftStart = new Date(2023, 9, 29, 18);
    const originalShiftEnd = new Date(2023, 9, 30, 6);
    const updatedShiftEnd = new Date(2023, 9, 30, 3);
    const response: Response = await supertest(app)
      .post("/getPayData/addPartialStiip")
      .send({
        userInfo: testUserInfo,
        index,
        date: dateOfStiip,
        rotation,
        payDay,
        shiftStart,
        originalShiftEnd,
        updatedShiftEnd,
      });
    expect(response.body.data).toBeDefined();
    expect(response.body.data.stiipHours).toBeDefined();
  });
});

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
  it("should query the database and return a modified payperiod data with the previous sick days inserted at the correct indexes for each payday in the month that the user previously logged sick hours for", async () => {
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
    const testMonth: number = 11;
    const testYear: number = 2023;

    const response: Response = await supertest(app).post("/getPayData").send({
      userInfo: testUserInfo,
      month: testMonth,
      year: testYear,
    });
    // addStiip endpoint test adds a partial sick day for the payDay of November 17th, at the 2nd index which is Oct 29th, so check that index to see if the stiip hours were added
    console.log(response.body.data[1].workDaysInPayPeriod[2]);
    expect(response.body.data[1].workDaysInPayPeriod[2].stiipHours).toEqual(3);
    expect(response.body.data).toBeDefined();
  });
});
