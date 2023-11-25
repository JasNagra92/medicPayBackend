import { IRequestForDeductionData } from "../interfaces/dbInterfaces";
import {
  calculateCpp,
  calculateEI,
  calculatePension,
  calculateTax,
  calculateUnionDues,
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
  const ei = calculateEI(grossIncome);
  const cpp = calculateCpp(grossIncome);

  // income Tax is calculated on gross income minus the 8.29 uinform allowance and minus the pre tax deductions which are union dues and pserp contributions
  let incomeForTaxCalculation = grossIncome - 8.29 - (unionDues + pserp);
  const incomeTax = calculateTax(incomeForTaxCalculation);
  const netIncome = grossIncome - unionDues - ei - cpp - incomeTax - pserp;

  res.status(200).send({
    data: {
      unionDues,
      ei,
      cpp,
      incomeTax,
      pserp,
      netIncome: Number(netIncome.toFixed(2)),
    },
  });
};
