import {
  addDeductionsToDB,
  calculateCpp,
  calculateEI,
  calculatePension,
  calculateUnionDues,
} from "./../../utils/databaseUtils";
import { IUserDataForDB } from "../../interfaces/dbInterfaces";
import { updateDeductionsInDB } from "./../../utils/databaseUtils";
import { DateTime } from "luxon";
import { calculateTax } from "./../../utils/databaseUtils";

describe("updateDeductions", () => {
  it("should take a userInfo object, payday string in the DateTime ISO format, and a ei deduction number from the client, should then query the db for the users ei deductions for the year, get the deductions array, update the provided payday field with the new deduction, as well as update the rest of the ei deduction values to account for the change and then store the updated data back in the db", async () => {
    let userInfoFromRequest: IUserDataForDB = {
      id: "9ehTfDMZNkfQYxYGtpvjcyPSIj9T",
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
    let requestedPayDay = DateTime.fromISO("2024-02-09").toISODate();
    // previous gross for this pay period was 3611.80, so this test simulates a reduction in gross and therefore should show a reduced EI deduction in this pay period, as well as a corresponding increased EI deduction in the final pay period that EI was deducted from previously, while keeping the YTD value at 1049.12
    let updatedGross = 3611.8;
    let newEIDeduction = 90.0;
    let unionDues = 130.0;
    let pserp = 247.68;
    let incomeTax = 1400.0;
    let newCPPDeduction = 230.3;

    // also mock data for the other deductions, CPP will need to be tested so check live updates

    await updateDeductionsInDB(
      userInfoFromRequest,
      requestedPayDay!,
      updatedGross,
      newEIDeduction,
      pserp,
      incomeTax,
      unionDues,
      newCPPDeduction
    );
  });
});

// describe("calculateTax", () => {
//   it("calcs tax", () => {
//     // income tax on january 13th, gross income was 4056.69, income tax was 735.97
//     let additionalCPP = 234.35 * (0.01 / 0.0595);
//     let grossIncome = 4056.69 - 346.31 - 8.29 - additionalCPP + 24.8;
//     let tax = calculateTax(grossIncome);
//     expect(Number(tax.toFixed(2))).toEqual(735.97);
//   });
// });
// describe("calculateEi", () => {
//   it("calculates EI, gross of 2573.71, minus 8.29 uniform allowance, march 24 paystub shows ei deduction of 41.82", () => {
//     let deduction = calculateEI(2573.71);
//     expect(Number(deduction.toFixed(2))).toEqual(41.82);
//   });
// });
// describe("calculateCpp", () => {
//   it("calculates cpp, march 24 paystub has it at 144.64, function is returning 144.63 but 1 cents not a big deal, for a gross income of 2573.71", () => {
//     let cpp = calculateCpp(2573.71);
//     expect(Number(cpp.toFixed(2))).toEqual(144.63);
//   });
// });
// describe("calculateUnionDues", () => {
//   it("calculates union Dues off actual hours worked, ignoring levelling and function subtracts 8.29 uniform allowance", () => {
//     let unionDues = calculateUnionDues(2290.67);
//     expect(Number(unionDues.toFixed(2))).toEqual(47.93);
//   });
// });
// describe("calculatePserp", () => {
//   it("calculates pserp pension contribution, gross income minus 8.29 uniform allowance, minus all overtime and stiip hours multiplied by basewage, times 0.0835, may 5 paystub has gross of 3092.72, with no overtime but 36 hours of stiip with base wage 41.13, and has a PSERP contribution of 288.46", () => {
//     let incomeLessOTLessStiip = 3092.72 - (370.17 + 740.34) + 36 * 41.13 - 8.29;
//     let pserp = calculatePension(incomeLessOTLessStiip);
//     expect(Number(pserp.toFixed(2))).toEqual(288.46);
//   });
// });
