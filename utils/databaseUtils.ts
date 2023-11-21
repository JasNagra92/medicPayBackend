import {
  IEIDeductions,
  IUserDataForDB,
  IVacationDates,
} from "./../interfaces/dbInterfaces";
import { db } from "../config/firebase";
import { getEIDeductionsForYear } from "./seedDateUtils";

export const removeDayFromDB = async (
  userInfo: IUserDataForDB,
  collectionInDB: string,
  monthAndYear: string,
  date: Date
) => {
  try {
    const response = await db
      .collection(collectionInDB)
      .doc(monthAndYear)
      .collection(userInfo.id)
      .doc(date.toISOString())
      .delete();
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const addHolidayBlockToDB = async (
  userInfo: IUserDataForDB,
  vacationDates: IVacationDates[]
) => {
  for (const date of vacationDates) {
    const monthAndYear = new Date(date.payDay).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const data = {
      index: date.index,
      prevRotation: date.rotation,
      rotation: date.rotation,
      payDay: date.payDay,
      shiftStart: date.shiftStart,
      shiftEnd: date.shiftEnd,
      // set worked boolean to false, if a user later toggles holiday recall on one of their work shifts, search this database after adding the overtime to the overtimeHoursDB and flip this boolean to true, so that when the user later requests a months pay data, during the holidayblock update, only retrieve documents with the worked flag being false, so the paydaydata doesn't get updated with the previously logged overtime shifts being switched to Vacation shifts
      worked: false,
    };
    try {
      const response = await db
        .collection("holidayBlocks")
        .doc(monthAndYear)
        .collection(userInfo.id)
        .doc(new Date(date.date).toISOString())
        .set(data);
      console.log("holiday block saved to db:" + response.writeTime);
    } catch (error) {
      console.log(error);
    }
  }
};

export const addEIDeductionsToDB = async (
  userInfo: IUserDataForDB,
  year: number
) => {
  let data = getEIDeductionsForYear(userInfo.platoon, year, userInfo);

  try {
    let res = await db
      .collection("EIDeductions")
      .doc(userInfo.id)
      .set({ deductions: data });
    console.log(res.writeTime + "saved ei deductions");
  } catch (error) {
    console.log(error + "saving ei deductions");
  }
};

export const updateEIDeductionsInDB = async (
  userInfo: IUserDataForDB,
  payDay: string,
  updatedGross: number
) => {
  try {
    let doc = await db.collection("EIDeductions").doc(userInfo.id).get();
    let deductions: IEIDeductions[] = doc.data()!.deductions;
    let foundPayDay = false;

    let updatedDeductionsArray = deductions.map(
      (deduction: IEIDeductions, index: number) => {
        if (deduction.payDay === payDay) {
          // Update the gross income
          deduction.grossIncome = updatedGross;

          // Calculate the EI deduction at 1.63% of the gross income
          const newDeduction = updatedGross * 0.0163;

          // Check if the new deduction, when added to YTD, exceeds the maximum
          if (deduction.YTD + newDeduction > 1002.45) {
            // Adjust the new deduction to make sure it doesn't exceed the maximum
            deduction.currentDeduction = 1002.45 - deduction.YTD;
          } else {
            // Set the new deduction
            deduction.currentDeduction = newDeduction;
          }

          // Check if index + 1 is within the bounds of the array before updating next YTD value
          if (index + 1 < deductions.length) {
            // Update the next YTD value to reflect this change
            deductions[index + 1].YTD =
              deduction.YTD + deduction.currentDeduction;
          }

          // Flip the boolean to true to now adjust every subsequent pay period's data
          foundPayDay = true;
          return deduction;
        }

        if (foundPayDay && index < deductions.length - 1) {
          // This is the first pay period with an updated YTD value

          // Calculate the EI deduction at 1.63% of the gross income
          const newDeduction = deduction.grossIncome * 0.0163;

          // Check if the new deduction, when added to YTD, exceeds the maximum
          if (deduction.YTD + newDeduction > 1002.45) {
            // Adjust the new deduction to make sure it doesn't exceed the maximum
            deduction.currentDeduction = 1002.45 - deduction.YTD;
          } else {
            // Set the new deduction
            deduction.currentDeduction = newDeduction;
          }

          // Check if index + 1 is within the bounds of the array before updating next YTD value
          if (index + 1 < deductions.length) {
            // Update the next YTD value to reflect this change
            deductions[index + 1].YTD =
              deduction.YTD + deduction.currentDeduction;
          }

          return deduction;
        }

        // Continue with normal deduction calculation
        return deduction;
      }
    );

    // Update the document with the new deductions array
    let res = await db.collection("EIDeductions").doc(userInfo.id).update({
      deductions: updatedDeductionsArray,
    });
    console.log(res.writeTime);
  } catch (error) {
    console.log(error);
  }
};
