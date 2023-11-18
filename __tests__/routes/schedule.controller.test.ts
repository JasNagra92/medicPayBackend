import supertest, { Response } from "supertest";
import app from "../../index";
import { IUserDataForDB, IVacationDates } from "../../interfaces/dbInterfaces";

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

describe("addOvertime endpoint", () => {
  it("should take shift data from client, and return a singleDays pay data with the overtime filled in. Client data should have updated shift end time representing what time they actually got off work, as well as an index to store it in the db for when it is retreived at another time", async () => {
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
    // previous tests set 28th and 29th to stiip days, 27th should be 'Day 1' of A platoons rotation with the payDay being Nov 17th
    const dateOfLateCall = new Date(2023, 9, 27).toISOString();
    const rotation = "Day 1";
    const payDay = "Nov 17, 2023";
    const index = 0;
    // shift start and end times will be used for wage calculations on the backend, originally start at 0600 on the 27th and end at 1800 on the 27th, updated shift end will be 1900, which should accrue night shift and weekend premiums of 1 hour
    const shiftStart = new Date(2023, 9, 27, 6);
    const originalShiftEnd = new Date(2023, 9, 27, 18);
    const updatedShiftEnd = new Date(2023, 9, 27, 19);

    const response = await supertest(app).post("/getPayData/addOvertime").send({
      userInfo: testUserInfo,
      index,
      date: dateOfLateCall,
      rotation,
      payDay,
      shiftStart,
      originalShiftEnd,
      updatedShiftEnd,
    });
    expect(response.body.data).toBeDefined();
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
    expect(response.body.data[1].workDaysInPayPeriod[2].stiipHours).toEqual(3);
    expect(response.body.data).toBeDefined();
  });
  it("should query the database and return a modified payperiod data with the late call overtime added on oct 27 from previous test", async () => {
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
    expect(response.body.data[1].workDaysInPayPeriod[0].OTDoubleTime).toEqual(
      1
    );
    expect(response.body.data).toBeDefined();
  });
});

describe("addHolidayBlock endpoint", () => {
  it("should accept an array of 4 dates from the client, store them in the database in the holidayBlocks>monthAndYear>user_id collection, this test will take a holiday block starting on Day 1, and store all 4 dates in an array with the payDay that they are placed in, it will also return 4 singleDayPayDatas with the premiums set to 0 and the rotation set to 'Vacation' ", async () => {
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
    const vacationDates: IVacationDates[] = [
      {
        date: new Date(2023, 9, 27),
        rotation: "Day 1",
        shiftStart: new Date(2023, 9, 27, 6),
        shiftEnd: new Date(2023, 9, 27, 18),
        payDay: new Date(2023, 10, 17).toISOString(),
        index: 0,
      },
      {
        date: new Date(2023, 9, 28),
        rotation: "Day 2",
        shiftStart: new Date(2023, 9, 28, 6),
        shiftEnd: new Date(2023, 9, 28, 18),
        payDay: new Date(2023, 10, 17).toISOString(),
        index: 1,
      },
      {
        date: new Date(2023, 9, 29),
        rotation: "Night 1",
        shiftStart: new Date(2023, 9, 29, 18),
        shiftEnd: new Date(2023, 9, 30, 6),
        payDay: new Date(2023, 10, 17).toISOString(),
        index: 2,
      },
      {
        date: new Date(2023, 9, 30),
        rotation: "Night 2",
        shiftStart: new Date(2023, 9, 30, 18),
        shiftEnd: new Date(2023, 9, 31, 6),
        payDay: new Date(2023, 10, 17).toISOString(),
        index: 3,
      },
    ];

    const response = await supertest(app)
      .post("/getPayData/addHolidayBlock")
      .send({ userInfo: testUserInfo, vacationDates });
    expect(response.body.data).toBeDefined();
  });
});
