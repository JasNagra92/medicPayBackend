import { IRequestForDeductionData } from "../interfaces/dbInterfaces";
import {
  calculateCpp,
  calculateEI,
  calculatePension,
  calculateTax,
  calculateUnionDues,
  updateDeductionsInDB,
} from "./../utils/databaseUtils";
import { Request, Response } from "express";

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
  } = req.body;

  //   calculate union dues, function deducts 8.29 uniform allowance during calculations
  const unionDues = calculateUnionDues(incomeLessLevelling);

  //   income figure for pension contribution deductions Overtime and uniform allowance, and considers stiiphours at users normal hourly rate, not stiip rate of .75%
  let incomeLessOTLessStiip =
    grossIncome -
    8.29 -
    stiipHours * (parseFloat(userInfo.hourlyWage) * 0.75) -
    (OTOnePointFiveAmount ? OTOnePointFiveAmount : 0) -
    (OTDoubleTimeAmount ? OTDoubleTimeAmount : 0);
  const additionForPserp = stiipHours * parseFloat(userInfo.hourlyWage);
  incomeLessOTLessStiip = incomeLessOTLessStiip + additionForPserp;
  const pserp = calculatePension(incomeLessOTLessStiip);

  //   ei and cpp calculations also considers uinform allowance in the function
  let ei = calculateEI(grossIncome);
  let cpp = calculateCpp(grossIncome);

  // income Tax is calculated on gross income minus the 8.29 uinform allowance and minus the pre tax deductions which are union dues and pserp contributions
  let incomeForTaxCalculation = grossIncome - 8.29 - (unionDues + pserp);
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
