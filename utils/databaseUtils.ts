import {
  IDeductions,
  IUserDataForDB,
  IVacationDates,
} from "./../interfaces/dbInterfaces";
import { db } from "../config/firebase";
import { getDeductionsForYear } from "./seedDateUtils";
import { DateTime } from "luxon";

export const saveUserToDB = async (user: IUserDataForDB) => {
  try {
    let res = await db.collection("users").doc(user.id).set(user);
    console.log("saved user successfully");
  } catch (error) {
    console.log("error saving user to db");
  }
};

export const calculateTax = (grossIncome: number) => {
  function calculateFederalTax(annualTaxableIncome: number) {
    let taxRateFed, constantFed;

    switch (true) {
      case annualTaxableIncome >= 0 && annualTaxableIncome <= 55867:
        taxRateFed = 0.15;
        constantFed = 0;
        break;
      case annualTaxableIncome <= 111733:
        taxRateFed = 0.205;
        constantFed = 3073;
        break;
      case annualTaxableIncome <= 173205:
        taxRateFed = 0.26;
        constantFed = 9218;
        break;
      case annualTaxableIncome <= 246752:
        taxRateFed = 0.29;
        constantFed = 14414;
        break;
      default:
        taxRateFed = 0.33;
        constantFed = 24284;
    }

    return { taxRateFed, constantFed };
  }

  let annualTaxableIncome = grossIncome * 26;
  let { taxRateFed, constantFed } = calculateFederalTax(annualTaxableIncome);

  // max ei and cpp amounts are 1049.12 and 3867.50 for 2024, the canada employment amount still had 1368.00 as of last check on Nov 27th 2023. Max CPP contributions in this formula are actually the Base CPP contribution which is calculated by maxCPP * (.0495/.0595), so max in 2023 was 3754.45 which led to a max base amount of 3123.45. 2024 numbers will be different
  let fedTax = annualTaxableIncome * taxRateFed - constantFed;
  let fedTaxCredits = (15705 + 3217.5 + 1049.12 + 1368.0) * 0.15;
  let fedTaxPayable = (fedTax - fedTaxCredits) / 26;

  function calculateProvincialTax(annualTaxableIncome: number) {
    let taxRateProv, constantProv;

    switch (true) {
      case annualTaxableIncome >= 0 && annualTaxableIncome <= 47939:
        taxRateProv = 0.0506;
        constantProv = 0;
        break;
      case annualTaxableIncome <= 95875:
        taxRateProv = 0.077;
        constantProv = 1266;
        break;
      case annualTaxableIncome <= 110076:
        taxRateProv = 0.105;
        constantProv = 3950;
        break;
      case annualTaxableIncome <= 133664:
        taxRateProv = 0.1229;
        constantProv = 5920;
        break;
      case annualTaxableIncome <= 181232:
        taxRateProv = 0.147;
        constantProv = 9142;
        break;
      case annualTaxableIncome <= 252752:
        taxRateProv = 0.168;
        constantProv = 12948;
        break;
      default:
        taxRateProv = 0.205;
        constantProv = 22299;
    }

    return { taxRateProv, constantProv };
  }

  let { taxRateProv, constantProv } =
    calculateProvincialTax(annualTaxableIncome);

  // change to ei and cpp max amounts here as well
  let provTax = annualTaxableIncome * taxRateProv - constantProv;
  let provTaxCredits = (12580 + 3217.5 + 1049.12) * 0.0506;
  let provTaxPayable = (provTax - provTaxCredits) / 26;

  // use online calculator, total cash income is gross - 8.29 for uinform allowance, calculator gives you accurate tax deduction. Non-cash insurable for EI is 24.80. Ei deduction uses gross income minus 8.29 uniform allowance and is multiplied by 1.63%, calculator also accurately gives you cpp value. Union dues are calculated off actual hours worked * 2.1%, and pserp deduction is 80 hours plus premiums and no overtime added multiplied by 8.35% pserp for jan 1, was stat pay but superstat was not pensionable, and deduct uniform allowance
  return Number((fedTaxPayable + provTaxPayable).toFixed(2));
};
export const calculateEI = (grossIncome: number) => {
  let eiDeductionRate = 0.0166;
  let eiDeduction = (grossIncome - 8.29) * eiDeductionRate;
  return Number(eiDeduction.toFixed(2));
};
export const calculateCpp = (grossIncome: number) => {
  let exemption = 3500 / 26;
  let cpp = 0.0595 * (grossIncome - 8.29 - exemption);
  return Number(cpp.toFixed(2));
};
export const calculateUnionDues = (incomeLessLevelling: number) => {
  let unionDues = incomeLessLevelling * 0.021;
  return Number(unionDues.toFixed(2));
};
export const calculatePension = (incomeLessOTLessStiip: number) => {
  let pserp = incomeLessOTLessStiip * 0.0835;
  return Number(pserp.toFixed(2));
};
export const removeDayFromDB = async (
  userInfo: IUserDataForDB,
  collectionInDB: string,
  monthAndYear: string,
  date: Date
) => {
  try {
    // Get the document
    const docRef = db
      .collection(collectionInDB)
      .doc(monthAndYear)
      .collection(userInfo.id)
      .doc(date.toISOString());

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error("Document not found.");
    }

    const data = doc.data();
    if (data?.wholeShift) {
      try {
        // If wholeShift is true, reduce the totalHours by 12
        await reduceTotalHoursBy(userInfo.id, 12);
      } catch (error) {
        console.log(error);
      }
    } else {
      // if whole shift is false it is a partial sick day
      if (data?.updatedShiftEnd && data?.originalShiftEnd) {
        const updatedEndDT = DateTime.fromISO(data.updatedShiftEnd);
        const originalEndDT = DateTime.fromISO(data.originalShiftEnd);
        const hoursDifference = originalEndDT.diff(updatedEndDT, "hours").hours;
        console.log(hoursDifference);
        await reduceTotalHoursBy(userInfo.id, hoursDifference);
      } else {
        throw new Error("Missing updatedShiftEnd or originalShiftEnd fields.");
      }
    }

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

async function reduceTotalHoursBy(userId: string, hours: number) {
  try {
    const totalHoursRef = db.collection("totalSickHours").doc(userId);
    const totalHoursDoc = await totalHoursRef.get();
    if (!totalHoursDoc.exists) {
      console.warn("Total hours document not found.");
      return;
    }
    const currentTotalHours = totalHoursDoc.data()!.totalHours || 0;
    const newTotalHours = Math.max(currentTotalHours - hours, 0); // Ensure totalHours doesn't go below 0
    await totalHoursRef.update({ totalHours: newTotalHours });
  } catch (error) {
    console.error("Error reducing total hours: ", error);
    throw error;
  }
}

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

export const addDeductionsToDB = async (
  userInfo: IUserDataForDB,
  year: number
) => {
  let data;
  if (userInfo.rotation) {
    data = getDeductionsForYear(
      userInfo.platoon,
      year,
      userInfo,
      userInfo.rotation!
    );
  } else {
    data = getDeductionsForYear(userInfo.platoon, year, userInfo);
  }

  try {
    let res = await db
      .collection("Deductions")
      .doc(userInfo.id)
      .set({ deductions: data });
    console.log(res.writeTime + "saved deductions");
  } catch (error) {
    console.log(error + "saving deductions");
  }
};

// this function when provided a new grossIncome from the client, needs to generate new deduction amounts for the 5 deductions and save them in the databse, CPP and EI however need to first be validated to make sure the new calculated deductions do not cause the YTD values to exceed the yearly maximums, and once the new values are input, update the YTD values for the other entries in the array to reflect the updated values
export const updateDeductionsInDB = async (
  userInfo: IUserDataForDB,
  payDay: string,
  updatedGross: number,
  newEIDeduction: number,
  pserp: number,
  incomeTax: number,
  unionDues: number,
  cppDeduction: number,
  secondCPPDeduction: number
) => {
  try {
    let doc = await db.collection("Deductions").doc(userInfo.id).get();
    let deductions: IDeductions[] = doc.data()!.deductions;
    let foundPayDay = false;
    const maxEIDeduction = 1049.12;
    let cppExemption = 3500 / 26;
    let cppCeilingOne = 3867.5;
    let cppCeilingTwo = 4055.5;
    let cppRateOne2024 = 0.0595;
    let cppRateTwo2024 = 0.04;

    let updatedDeductionsArray = deductions.map(
      (deduction: IDeductions, index: number) => {
        if (deduction.payDay === payDay) {
          // Update the gross income and the fixed deductions
          deduction.grossIncome = updatedGross;
          deduction.incomeTax = incomeTax;
          deduction.unionDues = unionDues;
          deduction.pserpDeduction = pserp;

          // Check if the new deduction, when added to YTD, exceeds the maximum for EI
          if (deduction.YTDEIDeduction + newEIDeduction > maxEIDeduction) {
            // Adjust the new deduction to make sure it doesn't exceed the maximum
            deduction.currentEIDeduction = 1049.12 - deduction.YTDEIDeduction;
            // update the newEIDeduction variable to this new reduced value, so it can be returned when this function is called and the new reduced value sent back to the client
            newEIDeduction = 1049.12 - deduction.YTDEIDeduction;
          } else {
            // Set the new deduction
            deduction.currentEIDeduction = newEIDeduction;
          }

          // update the new CPP values that were validated already in the getDeductions function
          deduction.currentCPPDeduction = cppDeduction;
          deduction.secondCPPDeduction = secondCPPDeduction;

          // Check if index + 1 is within the bounds of the array before updating next YTD value
          if (index + 1 < deductions.length) {
            // Update the next YTD value to reflect this change
            deductions[index + 1].YTDEIDeduction =
              deduction.YTDEIDeduction + deduction.currentEIDeduction;

            deductions[index + 1].YTDCPPDeduction =
              deduction.YTDCPPDeduction +
              deduction.currentCPPDeduction +
              deduction.secondCPPDeduction;
            if (deduction.secondCPPDeduction > 0) {
              deductions[index + 1].totalCPPDeductionIncludingSecond =
                deduction.YTDCPPDeduction +
                deduction.currentCPPDeduction +
                deduction.secondCPPDeduction;
            }
          }

          // Flip the boolean to true to now adjust every subsequent pay period's data
          foundPayDay = true;
          return deduction;
        }

        if (foundPayDay && index < deductions.length - 1) {
          // This is the first pay period with an updated YTD value

          // Check if the old deduction, when added to the new YTD, exceeds the maximum
          if (
            deduction.YTDEIDeduction + deduction.currentEIDeduction >
            maxEIDeduction
          ) {
            // Adjust the deduction to make sure it doesn't exceed the maximum
            deduction.currentEIDeduction =
              maxEIDeduction - deduction.YTDEIDeduction;
          }

          // this will be where the new YTD is evaluated and the currentCPPDeduction and the secondCPPDeductions are edited to stay within the maximums
          // scenario 1 - the new YTD is equal to or greater than the second ceiling, reduce both deductions to 0
          if (deduction.YTDCPPDeduction >= cppCeilingTwo) {
            deduction.currentCPPDeduction = 0;
            deduction.secondCPPDeduction = 0;
          }
          // scenario 2 - the new YTD is between the 2 ceilings, so first ceiling has already been reached, reduce current to 0, and calculate a new second CPP deduction and evaluate it to prevent the second ceiling from being exceeded
          else if (
            deduction.YTDCPPDeduction >= cppCeilingOne &&
            deduction.YTDCPPDeduction < cppCeilingTwo
          ) {
            // reduce the current step 1 deduction to 0
            deduction.currentCPPDeduction = 0;

            // calculate a 2nd cpp deduction from the gross income
            secondCPPDeduction = deduction.grossIncome * cppRateTwo2024;
            // now validate it to make sure it doesn't exceed the second ceiling
            if (
              secondCPPDeduction + deduction.YTDCPPDeduction >
              cppCeilingTwo
            ) {
              // this will reduce it so it does not exceed the second ceiling
              secondCPPDeduction = cppCeilingTwo - deduction.YTDCPPDeduction;
            }
            // now that the secondCPPDeduction for this new deduction period has been calculated and verified, set it
            deduction.secondCPPDeduction = secondCPPDeduction;
          }
          // scenario 3 is when the new YTD is less than the first ceiling, in this case first the first cpp deduction should be calculated from the gross income, then verified/reduced if it surpasses the first ceiling, and if it does pass the first ceiling, the 2nd cpp deduction needs to be calculated/verified and set as the second deduction property
          else if (deduction.YTDCPPDeduction < cppCeilingOne) {
            cppDeduction =
              (deduction.grossIncome - cppExemption) * cppRateOne2024;

            // now check if this deduction, when added to the new YTD value, exceeds ceiling 1, in this case the untaxed income needs to be taxed at the second cpp rate and stored as the secondCPPDeduction property
            if (cppDeduction + deduction.YTDCPPDeduction > cppCeilingOne) {
              // first reduce it to make it the correct amount
              cppDeduction = cppCeilingOne - deduction.YTDCPPDeduction;

              let untaxedAmount =
                deduction.grossIncome - cppDeduction / cppRateOne2024;

              secondCPPDeduction = untaxedAmount * cppRateTwo2024;

              // now verify this second cpp deduction and reduce it if necessary
              if (secondCPPDeduction + cppCeilingOne > cppCeilingTwo) {
                // if it does, reduce it to the exact amount needed to reach the second ceiling
                secondCPPDeduction = cppCeilingTwo - cppCeilingOne;
              }
              // now both deductions should be correct so set them as the properties
              deduction.currentCPPDeduction = cppDeduction;
              deduction.secondCPPDeduction = secondCPPDeduction;
            }
          }

          // Check if index + 1 is within the bounds of the array before updating next YTD value
          if (index + 1 < deductions.length) {
            // Update the next YTD value to reflect this change
            deductions[index + 1].YTDEIDeduction =
              deduction.YTDEIDeduction + deduction.currentEIDeduction;
            deductions[index + 1].YTDCPPDeduction =
              deduction.YTDCPPDeduction +
              deduction.currentCPPDeduction +
              deduction.secondCPPDeduction;
            // if the current pay period, has a second deduction, then the next pay periods totalDeductionIncludingSecond needs to be accurate using these new figures
            if (deduction.secondCPPDeduction > 0) {
              deductions[index + 1].totalCPPDeductionIncludingSecond =
                deduction.YTDCPPDeduction +
                deduction.currentCPPDeduction +
                deduction.secondCPPDeduction;
            }
          }

          return deduction;
        }

        // Continue with normal deduction calculation
        return deduction;
      }
    );

    // Update the document with the new deductions array
    let res = await db.collection("Deductions").doc(userInfo.id).update({
      deductions: updatedDeductionsArray,
    });
    console.log(res.writeTime + " updated deductions - this is the writeTime");
    // return the 2 deductions that could have changed if the payday they were updated in had a YTD exceed the maximum
    return {
      eiDeduction: newEIDeduction,
    };
  } catch (error) {
    console.log(error);
  }
};
