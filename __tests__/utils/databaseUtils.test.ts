import { addEIDeductionsToDB } from "./../../utils/databaseUtils";
import { IUserDataForDB } from "../../interfaces/dbInterfaces";
import { updateEIDeductionsInDB } from "./../../utils/databaseUtils";
import { DateTime } from "luxon";

describe("addEIDeductionsToDB", () => {
  it("should create db entry for given userInfo", async () => {
    let userInfoFromRequest: IUserDataForDB = {
      id: "fdifjsoenlkxcnvl",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "A",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "43.13",
    };
    await addEIDeductionsToDB(userInfoFromRequest, 2024);
  });
});

describe("updateEIDeductions", () => {
  it("should take a userInfo object, payday string in the DateTime ISO format, and a ei deduction number from the client, should then query the db for the users ei deductions for the year, get the deductions array, update the provided payday field with the new deduction, as well as update the rest of the ei deduction values to account for the change and then store the updated data back in the db", async () => {
    let userInfoFromRequest: IUserDataForDB = {
      id: "fdifjsoenlkxcnvl",
      email: "test",
      shiftPattern: "Alpha",
      platoon: "A",
      dayShiftStartTime: { hours: 6, minutes: 0 },
      dayShiftEndTime: { hours: 18, minutes: 0 },
      nightShiftStartTime: { hours: 18, minutes: 0 },
      nightShiftEndTime: { hours: 6, minutes: 0 },
      hourlyWage: "43.13",
    };
    let requestedPayDay = DateTime.fromISO("2024-02-09").toISODate();
    // previous gross for this pay period was 3611.80, so this test simulates a reduction in gross and therefore should show a reduced EI deduction in this pay period, as well as a corresponding increased EI deduction in the final pay period that EI was deducted from previously, while keeping the YTD value at 1002.45
    let updatedGross = 1611.8;

    await updateEIDeductionsInDB(
      userInfoFromRequest,
      requestedPayDay!,
      updatedGross
    );
  });
});
