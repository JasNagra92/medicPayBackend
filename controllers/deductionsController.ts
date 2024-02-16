import {
  IDeductions,
  IRequestForDeductionData,
} from "../interfaces/dbInterfaces";
import {
  addDeductionsToDB,
  calculateCpp,
  calculateEI,
  calculatePension,
  calculateTax,
  calculateUnionDues,
  updateDeductionsInDB,
} from "./../utils/databaseUtils";
import { Request, Response } from "express";
import { db } from "../config/firebase";
import { DateTime } from "luxon";

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
    OTSuperStat,
  } = req.body;

  // check if the default deductions collection has already been created for this user, if not, create it
  let snapshot = await db.collection("Deductions").doc(userInfo.id).get();
  if (!snapshot.exists) {
    await addDeductionsToDB(userInfo, 2024);
  }

  //   calculate union dues, function deducts 8.29 uniform allowance during calculations
  const unionDues = calculateUnionDues(incomeLessLevelling);

  //   income figure for pension contribution deducts Overtime and uniform allowance, and considers stiiphours at users normal hourly rate, not stiip rate of .75%
  let incomeLessOTLessStiip =
    grossIncome -
    8.29 -
    stiipHours * (parseFloat(userInfo.hourlyWage) * 0.75) -
    (OTOnePointFiveAmount ? OTOnePointFiveAmount : 0) -
    (OTDoubleTimeAmount ? OTDoubleTimeAmount : 0) -
    (OTStatReg ? OTStatReg * parseFloat(userInfo.hourlyWage) : 0) -
    (OTSuperStat ? OTSuperStat * (parseFloat(userInfo.hourlyWage) * 1.5) : 0);

  const additionForPserp = stiipHours * parseFloat(userInfo.hourlyWage);
  incomeLessOTLessStiip = incomeLessOTLessStiip + additionForPserp;
  const pserp = calculatePension(incomeLessOTLessStiip);

  //   ei and cpp calculations also considers uinform allowance in the function
  let ei = calculateEI(grossIncome);

  let cppDeduction = 0;
  let cppExemption = 3500 / 26;
  let secondCPPDeduction = 0;
  let cppCeilingOne = 3867.5;
  let cppCeilingTwo = 4055.5;
  let cppRateOne2024 = 0.0595;
  let cppRateTwo2024 = 0.04;

  // calculate the day of the payday and if it is the first payday of the month, will need to add 24.80 to taxable income for income tax and cpp calculations if it is
  const payDayDateTime = DateTime.fromISO(payDay);
  const day = payDayDateTime.day;

  let doc = await db.collection("Deductions").doc(userInfo.id).get();
  let deductions: IDeductions[] = doc.data()!.deductions;
  let foundDeduction = deductions.find(
    (deduction) => deduction.payDay === payDay
  );

  if (foundDeduction) {
    // scenario 1, YTD contribution less than ceiling 1
    if (foundDeduction.YTDCPPDeduction < cppCeilingOne) {
      // calculate a cpp deduction using the first rate minus the exemption
      cppDeduction =
        (grossIncome - cppExemption - 8.29 + (day <= 14 ? 24.8 : 0)) *
        cppRateOne2024;
      // this needs to be checked to see if adding it to the YTD value causes it to exceed the first ceiling
      if (foundDeduction.YTDCPPDeduction + cppDeduction > cppCeilingOne) {
        // in this case it needs to be reduced and the untaxed income needs to be taxed using the second CPP rate

        // this reduces the deduction to the exact amount needed to go from the YTD value up to the first ceiling
        cppDeduction = cppCeilingOne - foundDeduction.YTDCPPDeduction;

        // this will calculate how much income remains after subtracting the amount needed to reach the first ceiling so it can be taxed at 4% and evaluated
        let untaxedAmount = grossIncome - cppDeduction / cppRateOne2024;

        secondCPPDeduction = untaxedAmount * cppRateTwo2024;

        // now evaluate this secondCPPDeduction to see if adding it will exceed the second ceiling
        if (secondCPPDeduction + cppCeilingOne > cppCeilingTwo) {
          // if it does, reduce it so it is the exact amount needed to reach the second ceiling
          secondCPPDeduction = cppCeilingTwo - cppCeilingOne;
        }
      }
    }
    // scenario 2, YTD is greater than ceiling 1 but less than ceiling 2, then cppDeduction 1 will stay as 0 and 2 needs to be calculated
    else if (
      foundDeduction.YTDCPPDeduction >= cppCeilingOne &&
      foundDeduction.totalCPPDeductionIncludingSecond < cppCeilingTwo
    ) {
      // tax income at 4% because first ceiling has been reached
      secondCPPDeduction = grossIncome * cppRateTwo2024;

      // now validate it to make sure it doesn't exceed the second ceiling
      if (
        secondCPPDeduction + foundDeduction.totalCPPDeductionIncludingSecond >
        cppCeilingTwo
      ) {
        // this will reduce it to be the exact difference between the two values so the total deduction ends up being the exact ceiling
        secondCPPDeduction =
          cppCeilingTwo - foundDeduction.totalCPPDeductionIncludingSecond;
      }
    }
    // scenario 3 is if YTD has already passed the second ceiling, then both CPP deductions stay as 0
  } else {
    console.log(
      "Deduction not found for specified payDay in getDeductions function"
    );
  }

  // income Tax is calculated on gross income minus the 8.29 uinform allowance and minus the pre tax deductions which are union dues and pserp contributions
  let additionalCPP = cppDeduction * (0.01 / 0.0595) + secondCPPDeduction;

  // incomeForTaxCalculation needs to only add 24.8 on the first payday of every month, not every payday
  let incomeForTaxCalculation =
    grossIncome -
    8.29 -
    (unionDues + pserp) -
    additionalCPP +
    (day <= 14 ? 24.8 : 0);
  const incomeTax = calculateTax(incomeForTaxCalculation);

  // once all deductions are calculated but before they are sent back to the client, EI needs to be checked against YTD values in the database to ensure that the new deduction amount when added to the YTD values, does not exceed the yearly maximum. If the amount will exceed the maximum, the deduction amount for EI should be reduced and returned, and the updated value should be saved in the database along with the other deduction and income figures. The updateDeductionsInDB was also validating CPP figures previously but that is now handled prior to sending the CPP and secondCPP figures to the db, so the only thing the updateDeductionsInDB needs to do regarding CPP is update all the following entries with new YTD values and the last deductions object that gets updated with a new value needs to make sure that it does not exceed the maximum

  let result = await updateDeductionsInDB(
    userInfo,
    payDay,
    grossIncome,
    ei,
    pserp,
    incomeTax,
    unionDues,
    cppDeduction,
    secondCPPDeduction
  );

  const netIncome =
    grossIncome -
    unionDues -
    result?.eiDeduction! -
    cppDeduction -
    secondCPPDeduction -
    incomeTax -
    pserp;

  res.status(200).send({
    data: {
      unionDues,
      ei: result?.eiDeduction!,
      cpp: cppDeduction + secondCPPDeduction,
      incomeTax,
      pserp,
      netIncome: Number(netIncome.toFixed(2)),
    },
  });
};

export const resetDeductions = async (req: Request, res: Response) => {
  const { userInfo } = req.body;
  try {
    await addDeductionsToDB(userInfo, 2024);
    res.status(200).send({ data: "deductions reset with new info" });
  } catch (error) {
    console.log("error resetting deductions");
    res.status(200).send({ data: "error resetting deductions" });
  }
};

export const getYTD = async (req: Request, res: Response) => {
  const { userInfo } = req.body;
  try {
    let doc = await db.collection("Deductions").doc(userInfo.id).get();
    if (doc && doc.exists) {
      let deductions: IDeductions[] = doc.data()!.deductions;
      let monthsIncome = deductions.map((entry) => {
        return { income: entry.grossIncome, month: entry.payDay };
      });
      res.status(200).send({ months: monthsIncome });
    }
  } catch (error) {
    console.log(error);
  }
};
export const getSickHours = async (req: Request, res: Response) => {
  const { userInfo } = req.body;
  try {
    let doc = await db.collection("totalSickHours").doc(userInfo.id).get();
    if (doc && doc.exists) {
      let totalHours = doc.data();
      res.status(200).send({ totalHours });
    } else {
      res.status(200).send({ totalHours: 0 });
    }
  } catch (error) {
    console.log(error);
  }
};
export const getOTHours = async (req: Request, res: Response) => {
  const { userInfo } = req.body;
  try {
    let doc = await db.collection("totalOTHours").doc(userInfo.id).get();
    if (doc && doc.exists) {
      let { totalOTHours, totalRecallHours, totalLateCallHours }: any =
        doc.data();
      res
        .status(200)
        .send({
          data: {
            totalOTHours: totalOTHours ? totalOTHours : 0,
            totalRecallHours: totalRecallHours ? totalRecallHours : 0,
            totalLateCallHours: totalLateCallHours ? totalLateCallHours : 0,
          },
        });
    } else {
      res
        .status(200)
        .send({ totalOTHours: 0, totalRecallHours: 0, totalLateCallHours: 0 });
    }
  } catch (error) {
    console.log(error);
  }
};
