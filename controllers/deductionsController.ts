import { IRequestForDeductionData } from "../interfaces/dbInterfaces";
import {
  addDeductionsToDB,
  calculateCpp,
  calculateEI,
  calculatePension,
  calculateTax,
  calculateUnionDues,
  updateDeductionsInDB,
} from "./../utils/databaseUtils";
import { Response } from "express";
import { db } from "../config/firebase";

export const getDeductions = async (
  req: IRequestForDeductionData,
  res: Response
) => {
  const {
    userInfo,
    grossIncome,
    stiipHours,
    incomeLessLevelling,
    OTDoubleTimeAmount,
    OTOnePointFiveAmount,
    payDay,
    OTStatReg,
  } = req.body;

  // check if the default deductions collection has already been created for this user, if not, create it
  let snapshot = await db.collection("Deductions").doc(userInfo.id).get();
  if (!snapshot.exists) {
    await addDeductionsToDB(userInfo, 2024);
  }

  //   calculate union dues, function deducts 8.29 uniform allowance during calculations
  const unionDues = calculateUnionDues(incomeLessLevelling);

  //   income figure for pension contribution deductions Overtime and uniform allowance, and considers stiiphours at users normal hourly rate, not stiip rate of .75%
  let incomeLessOTLessStiip =
    grossIncome -
    8.29 -
    stiipHours * (parseFloat(userInfo.hourlyWage) * 0.75) -
    (OTOnePointFiveAmount ? OTOnePointFiveAmount : 0) -
    (OTDoubleTimeAmount ? OTDoubleTimeAmount : 0) -
    (OTStatReg ? OTStatReg * parseFloat(userInfo.hourlyWage) : 0);
  // factor in super stat for new years and christmas - todo

  const additionForPserp = stiipHours * parseFloat(userInfo.hourlyWage);
  incomeLessOTLessStiip = incomeLessOTLessStiip + additionForPserp;
  const pserp = calculatePension(incomeLessOTLessStiip);

  //   ei and cpp calculations also considers uinform allowance in the function
  let ei = calculateEI(grossIncome);

  // this cpp figure also needs to not take gross income but instead take gross minus 8.29 and plus 24.8 if the payday is the first payday of the month
  let cpp = calculateCpp(grossIncome);

  // income Tax is calculated on gross income minus the 8.29 uinform allowance and minus the pre tax deductions which are union dues and pserp contributions
  let additionalCPP = cpp * (0.01 / 0.0595);

  // incomeForTaxCalculation needs to only add 24.8 on the first payday of every month, not every payday
  let incomeForTaxCalculation =
    grossIncome - 8.29 - (unionDues + pserp) + 24.8 - additionalCPP;
  const incomeTax = calculateTax(incomeForTaxCalculation);

  // once all deductions are calculated but before they are sent back to the client, EI and CPP amounts need to be checked against YTD values in the database to ensure that the new deduction amounts when added to the YTD values, do not exceed the yearly maximums. If the amounts will exceed the maximums, the deduction amounts for EI and CPP should be reduced and returned, and the updated values should be saved in the database along with the other deduction and income figures

  let result = await updateDeductionsInDB(
    userInfo,
    payDay,
    grossIncome,
    ei,
    pserp,
    incomeTax,
    unionDues,
    cpp
  );

  const netIncome =
    grossIncome -
    unionDues -
    result?.eiDeduction! -
    result?.cppDeduction! -
    incomeTax -
    pserp;

  res.status(200).send({
    data: {
      unionDues,
      ei: result?.eiDeduction!,
      cpp: result?.cppDeduction!,
      incomeTax,
      pserp,
      netIncome: Number(netIncome.toFixed(2)),
    },
  });
};
