import {
  IDeductions,
  IUserDataForDB,
  IVacationDates,
} from "./../interfaces/dbInterfaces";
import { db } from "../config/firebase";
import { getEIDeductionsForYear } from "./seedDateUtils";
import puppeteer, { Page } from "puppeteer";

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
      .collection("Deductions")
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
    let doc = await db.collection("Deductions").doc(userInfo.id).get();
    let deductions: IDeductions[] = doc.data()!.deductions;
    let foundPayDay = false;

    let updatedDeductionsArray = deductions.map(
      (deduction: IDeductions, index: number) => {
        if (deduction.payDay === payDay) {
          // Update the gross income
          deduction.grossIncome = updatedGross;

          // Calculate the EI deduction at 1.63% of the gross income
          const newDeduction = updatedGross * 0.0163;

          // Check if the new deduction, when added to YTD, exceeds the maximum
          if (deduction.YTDEIDeduction + newDeduction > 1002.45) {
            // Adjust the new deduction to make sure it doesn't exceed the maximum
            deduction.currentEIDeduction = 1002.45 - deduction.YTDEIDeduction;
          } else {
            // Set the new deduction
            deduction.currentEIDeduction = newDeduction;
          }

          // Check if index + 1 is within the bounds of the array before updating next YTD value
          if (index + 1 < deductions.length) {
            // Update the next YTD value to reflect this change
            deductions[index + 1].YTDEIDeduction =
              deduction.YTDEIDeduction + deduction.currentEIDeduction;
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
          if (deduction.YTDEIDeduction + newDeduction > 1002.45) {
            // Adjust the new deduction to make sure it doesn't exceed the maximum
            deduction.currentEIDeduction = 1002.45 - deduction.YTDEIDeduction;
          } else {
            // Set the new deduction
            deduction.currentEIDeduction = newDeduction;
          }

          // Check if index + 1 is within the bounds of the array before updating next YTD value
          if (index + 1 < deductions.length) {
            // Update the next YTD value to reflect this change
            deductions[index + 1].YTDEIDeduction =
              deduction.YTDEIDeduction + deduction.currentEIDeduction;
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
    console.log(res.writeTime);
  } catch (error) {
    console.log(error);
  }
};

export const calculateTax = (grossIncome: number) => {
  function calculateFederalTax(annualTaxableIncome: number) {
    let taxRateFed, constantFed;

    switch (true) {
      case annualTaxableIncome >= 0 && annualTaxableIncome <= 53359:
        taxRateFed = 0.15;
        constantFed = 0;
        break;
      case annualTaxableIncome <= 106717:
        taxRateFed = 0.205;
        constantFed = 2935;
        break;
      case annualTaxableIncome <= 165430:
        taxRateFed = 0.26;
        constantFed = 8804;
        break;
      case annualTaxableIncome <= 235675:
        taxRateFed = 0.29;
        constantFed = 13767;
        break;
      default:
        taxRateFed = 0.33;
        constantFed = 23194;
    }

    return { taxRateFed, constantFed };
  }
  let annualTaxableIncome = grossIncome * 26;
  let { taxRateFed, constantFed } = calculateFederalTax(annualTaxableIncome);

  let fedTax = annualTaxableIncome * taxRateFed - constantFed;
  let fedTaxCredits = (15000 + 3754.45 + 1002.45 + 1368.0) * 0.15;
  let fedTaxPayable = (fedTax - fedTaxCredits) / 26;

  function calculateProvincialTax(annualTaxableIncome: number) {
    let taxRateProv, constantProv;

    switch (true) {
      case annualTaxableIncome >= 0 && annualTaxableIncome <= 45654:
        taxRateProv = 0.0506;
        constantProv = 0;
        break;
      case annualTaxableIncome <= 91310:
        taxRateProv = 0.077;
        constantProv = 1205;
        break;
      case annualTaxableIncome <= 104835:
        taxRateProv = 0.105;
        constantProv = 3762;
        break;
      case annualTaxableIncome <= 127299:
        taxRateProv = 0.1229;
        constantProv = 5638;
        break;
      case annualTaxableIncome <= 172602:
        taxRateProv = 0.147;
        constantProv = 8706;
        break;
      case annualTaxableIncome <= 240716:
        taxRateProv = 0.168;
        constantProv = 12331;
        break;
      default:
        taxRateProv = 0.205;
        constantProv = 21238;
    }

    return { taxRateProv, constantProv };
  }

  let { taxRateProv, constantProv } =
    calculateProvincialTax(annualTaxableIncome);

  let provTax = annualTaxableIncome * taxRateProv - constantProv;
  let provTaxCredits = (11981 + 3754.45 + 1002.45) * 0.0506;
  let provTaxPayable = (provTax - provTaxCredits) / 26;

  // use online calculator, total cash income is gross - 8.29 for uinform allowance, calculator gives you accurate tax deduction. Non-cash insurable for EI is 24.80. Ei deduction uses gross income minus 8.29 uniform allowance and is multiplied by 1.63%, calculator also accurately gives you cpp value. Union dues are calculated off actual hours worked * 2.1%, and pserp deduction is 80 hours plus premiums and no overtime added multiplied by 8.35% pserp for jan 1, was stat pay but superstat was not pensionable, and deduct uniform allowance
  return Number((fedTaxPayable + provTaxPayable).toFixed(2));
};
export const calculateEI = (grossIncome: number) => {
  let eiDeduction = (grossIncome - 8.29) * 0.0163;
  return Number(eiDeduction.toFixed(2));
};
export const calculateCpp = (grossIncome: number) => {
  let exemption = 3500 / 26;
  let cpp = 0.0595 * (grossIncome - 8.29 - exemption);
  return Number(cpp.toFixed(2));
};
export const calculateUnionDues = (incomeLessLevelling: number) => {
  let unionDues = (incomeLessLevelling - 8.29) * 0.021;
  return Number(unionDues.toFixed(2));
};
export const calculatePension = (incomeLessOTLessStiip: number) => {
  let pserp = incomeLessOTLessStiip * 0.0835;
  return Number(pserp.toFixed(2));
};
