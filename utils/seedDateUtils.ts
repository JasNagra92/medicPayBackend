import { DateTime } from "luxon";
import {
  IDeductions,
  IScheduleItem,
  ISingleDaysPayDataForClient,
  IUserDataForDB,
} from "../interfaces/dbInterfaces";
import { generateSingleDaysDataForClient } from "./scheduleGenerationUtils";
const rotation = [
  "Day 1",
  "Day 2",
  "Night 1",
  "Night 2",
  "day off",
  "day off",
  "day off",
  "day off",
];

const seedDateFirstPayday = "2023-01-13";
const seedDateFirstPayPeriodStart = "2022-12-23";

//   where in the rotation index each platoon was on the first day of the second pay period in January, january 27 2023
const startingRotationIndex: Record<string, number> = {
  A: 4,
  B: 2,
  C: 0,
  D: 6,
};

// the dates of the first Rdays for each platoon and each rotation in jan 2023, each rotation day happens every 40 days starting form these seed dates
const RDaySeedDates: Record<string, Record<string, string>> = {
  A: {
    R1: "2023-01-28",
    R2: "2023-01-12",
    R3: "2023-02-05",
    R4: "2023-01-20",
  },
  B: {
    R1: "2023-02-07",
    R2: "2023-01-22",
    R3: "2023-02-06",
    R4: "2023-01-30",
  },
  C: {
    R1: "2023-02-01",
    R2: "2023-01-08",
    R3: "2023-02-09",
    R4: "2023-01-16",
  },
  D: {
    R1: "2023-01-02",
    R2: "2023-01-18",
    R3: "2023-02-10",
    R4: "2023-01-26",
  },
};

export const getPayPeriodFromMonthYearAndPlatoon = (
  platoon: string,
  RDay: string,
  month: number,
  year: number
) => {
  try {
    let seed = DateTime.fromISO(seedDateFirstPayday);
    let payPeriodStart = DateTime.fromISO(seedDateFirstPayPeriodStart);
    let RDaySeed = DateTime.fromISO(RDaySeedDates[platoon][RDay]);
    let data: Record<string, IScheduleItem[]> = {};

    // Initialize rotation index outside the loop based on the platoon
    let rotationIndex = startingRotationIndex[platoon];
    // run from 2023 onwards to whatever year is input by the user
    while (seed.year <= year) {
      let currentPayPeriodData: IScheduleItem[] = [];

      //   once the loop gets to the desired month and year start storing data
      if (seed.year === year && seed.month === month) {
        for (let day = 0; day < 14; day++) {
          const currentDate = payPeriodStart.plus({ days: day }).toISODate();
          let rotationDay = rotation[(rotationIndex + day) % rotation.length];

          if (currentDate === RDaySeed.toISODate()) {
            rotationDay = "R Day";
            //  increment Rday by 40 days
            RDaySeed = RDaySeed.plus({ days: 40 });
          }

          currentPayPeriodData.push({
            date: DateTime.fromISO(currentDate!).toJSDate(),
            rotation: rotationDay,
          });
        }

        data[seed.toISODate()!] = currentPayPeriodData;
      }

      //   increment all the counters by 14
      payPeriodStart = payPeriodStart.plus({ days: 14 });
      seed = seed.plus({ days: 14 });
      if (payPeriodStart > RDaySeed) {
        //  increment Rday by 40 days
        RDaySeed = RDaySeed.plus({ days: 40 });
      }
      // Increment rotation index outside the loop
      rotationIndex = (rotationIndex + 14) % rotation.length;
    }

    return data;
  } catch (error) {
    console.error("Error in getPayPeriodFromMonthYearAndPlatoon:", error);
    throw error;
  }
};

// function to take a given year and platoon, generate that platoon schedule for the year, and for the pay periods in each month, calculate the DayTotals for the default shifts, and return an object with gross income and both CPP/EI deductions listed for the default hours worked. This array will be saved for each user with the payday dates, and will be updated each time the user logs OT or sick time, the EI/CPP values will be updated and the previous values will be used to validate the updated EI/CPP figures to make sure the YTD maximums are not exceeded with the new deduction amounts
export function getDeductionsForYear(
  platoon: string,
  RDay: string,
  year: number,
  userInfo: IUserDataForDB
) {
  try {
    let seed = DateTime.fromISO(seedDateFirstPayday);
    let RDaySeed = DateTime.fromISO(RDaySeedDates[platoon][RDay]);
    let payPeriodStart = DateTime.fromISO(seedDateFirstPayPeriodStart);
    let data: Record<string, IScheduleItem[]> = {};
    let yearsEIDeductions: IDeductions[] = [];

    // Initialize rotation index outside the loop based on the platoon
    let rotationIndex = startingRotationIndex[platoon];

    while (seed.year <= year) {
      if (seed.year === year) {
        let currentPayPeriodData: IScheduleItem[] = [];

        for (let day = 0; day < 14; day++) {
          const currentDate = payPeriodStart.plus({ days: day }).toISODate();
          let rotationDay = rotation[(rotationIndex + day) % rotation.length];
          // only run the logic for generating a pay days data and calculating the day total for shifts that were worked
          if (rotationDay !== "day off") {
            if (currentDate === RDaySeed.toISODate()) {
              rotationDay = "R Day";
              //  increment Rday by 40 days
              RDaySeed = RDaySeed.plus({ days: 40 });
            }
            currentPayPeriodData.push({
              date: DateTime.fromISO(currentDate!).toJSDate(),
              rotation: rotationDay,
            });
          }
          data[seed.toISODate()!] = currentPayPeriodData;
        }
      }

      //   increment all the counters by 14
      payPeriodStart = payPeriodStart.plus({ days: 14 });
      seed = seed.plus({ days: 14 });

      if (payPeriodStart > RDaySeed) {
        //  increment Rday by 40 days
        RDaySeed = RDaySeed.plus({ days: 40 });
      }

      // Increment rotation index outside the loop
      rotationIndex = (rotationIndex + 14) % rotation.length;
    }
    // max amounts are for 2024
    const maxEIDeduction = 1049.12;
    const maxCPPDeduction = 3867.5;
    const secondCPPCeiling = maxCPPDeduction + 188;
    const eiRate2024 = 0.0166;
    const cppRate2024 = 0.0595;
    const secondCPPRate2024 = 0.04;
    let secondCPPDeduction = 0;
    let totalEIDeduction = 0;
    let totalCPPDeduction = 0;
    let totalCPPDeductionIncludingSecond = 0;
    let cumulativeYTDIncome = 0;

    // after all the years work days have been populated, create a new array by generating work days data, and summing day Totals for each shift
    for (const [paydayDate, array] of Object.entries(data)) {
      let paydayTotal = 0;
      let hoursWorkedInPayPeriod = 0;
      // create variables to store how many stat day hours were worked in the pay period so the levelling calculation at the end for grossIncome is correct
      let OTStatReg = 0;
      let workDaysInPayPeriod: ISingleDaysPayDataForClient[] = [];

      // iterate over each array of dates in the payday

      for (const day of array) {
        let dayData = generateSingleDaysDataForClient(userInfo, day);
        workDaysInPayPeriod.push(dayData);
      }

      hoursWorkedInPayPeriod = workDaysInPayPeriod.reduce(
        (total, day) => total + day.baseHoursWorked!,
        0
      );

      paydayTotal = workDaysInPayPeriod.reduce(
        (total, day) => total + day.dayTotal,
        0
      );

      OTStatReg = workDaysInPayPeriod.reduce(
        (total, day) => total + day.OTStatReg!,
        0
      );

      let RDayInPeriod = workDaysInPayPeriod.find(
        (day) => day.rotation === "R Day" || day.rotation === "R Day OT"
      );

      // Calculate the current gross income
      const currentGrossIncome =
        paydayTotal +
        (80 - (hoursWorkedInPayPeriod + OTStatReg + (RDayInPeriod ? 12 : 0))) *
          parseFloat(userInfo?.hourlyWage!);

      // Calculate the current YTDIncome by adding the current gross income to the cumulative total
      const currentYTDIncome = cumulativeYTDIncome + currentGrossIncome;

      // Update the cumulative YTDIncome for the next iteration
      cumulativeYTDIncome = currentYTDIncome;

      // Calculate the EI deduction for the current pay period but calculating the expected gross income minus 8.29 uniform allowance
      let currentEIDeduction = currentGrossIncome * eiRate2024;

      let cppExemption = 3500 / 26;
      // will need to add 24.80 if the payday is first payday of the month
      let currentCPPDeduction =
        (currentGrossIncome - cppExemption) * cppRate2024;

      // Calculate the YTD value excluding the current entry for both EI and CPP
      const ytdEIExcludingCurrent = totalEIDeduction;
      const ytdCPPExcludingCurrent = totalCPPDeduction;
      const ytdCPPIncludingSecondExcludingCurrent =
        totalCPPDeductionIncludingSecond;

      // Check if adding the current deduction exceeds the maximum for ei and then cpp
      if (totalEIDeduction + currentEIDeduction > maxEIDeduction) {
        // Adjust the current deduction to make sure it doesn't exceed the maximum
        currentEIDeduction = maxEIDeduction - totalEIDeduction;
        totalEIDeduction += currentEIDeduction;
      } else {
        // Continue with the normal deduction calculation
        totalEIDeduction += currentEIDeduction;
      }

      // needs to be a check at the start to see if totalCPPDeductionIncludingSecond is greater than 0, if it is that means that the first ceiling had been reached in the previous loop, and now in this loop the currentCPPDeduction needs to be recalculated using 4% minus the exemption, and that new value needs to be validated
      if (totalCPPDeductionIncludingSecond > 0) {
        currentCPPDeduction = 0;
        secondCPPDeduction =
          (currentGrossIncome - cppExemption) * secondCPPRate2024;

        if (secondCPPDeduction + totalCPPDeduction > secondCPPCeiling) {
          // if the total is above the max, reduce it so it isn't
          secondCPPDeduction = secondCPPCeiling - totalCPPDeduction;
          totalCPPDeduction += secondCPPDeduction;
          totalCPPDeductionIncludingSecond += secondCPPDeduction;
        } else {
          totalCPPDeduction += secondCPPDeduction;
          totalCPPDeductionIncludingSecond += secondCPPDeduction;
        }
      }

      // Check if adding the current deduction exceeds the maximum for CPP
      else if (totalCPPDeduction + currentCPPDeduction > maxCPPDeduction) {
        // Adjust the current CPP deduction to make sure it doesn't exceed the maximum
        currentCPPDeduction = maxCPPDeduction - totalCPPDeduction;
        totalCPPDeduction += currentCPPDeduction;

        // calculate how much went untaxed, tax it at 4% and store that as counting towards the second CPP ceiling
        let untaxedAmount =
          currentGrossIncome - currentCPPDeduction / cppRate2024;

        secondCPPDeduction = untaxedAmount * secondCPPRate2024;

        // Check if the new secondCPPDeduction exceeds the remaining space to the second CPP ceiling
        if (secondCPPDeduction + totalCPPDeduction > secondCPPCeiling) {
          // Adjust both currentCPPDeduction and secondCPPDeduction to reach the exact amount needed for the second CPP ceiling
          const remainingSpace = secondCPPCeiling - totalCPPDeduction;
          currentCPPDeduction = 0;
          secondCPPDeduction = remainingSpace;
          totalCPPDeduction += remainingSpace;
        } else {
          // If it doesn't exceed the ceiling, add it to the total CPP deduction
          totalCPPDeduction += secondCPPDeduction;
          totalCPPDeductionIncludingSecond = totalCPPDeduction;
        }
      } else {
        // Continue with the normal deduction calculation
        totalCPPDeduction += currentCPPDeduction;
      }

      // push cpp and ei deductions together

      yearsEIDeductions.push({
        currentEIDeduction: Number(currentEIDeduction.toFixed(2)),
        YTDEIDeduction: Number(ytdEIExcludingCurrent.toFixed(2)),
        currentCPPDeduction: Number(currentCPPDeduction.toFixed(2)),
        YTDCPPDeduction: Number(ytdCPPExcludingCurrent.toFixed(2)),
        payDay: paydayDate,
        grossIncome: Number(currentGrossIncome.toFixed(2)),
        YTDIncome: Number(currentYTDIncome.toFixed(2)),
        secondCPPDeduction,
        totalCPPDeductionIncludingSecond: Number(
          ytdCPPIncludingSecondExcludingCurrent.toFixed(2)
        ),
      });
    }
    return yearsEIDeductions;
  } catch (error) {
    console.log(error + "erorr generating ei deductions");
  }
}
