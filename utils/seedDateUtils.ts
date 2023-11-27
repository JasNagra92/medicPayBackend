import { DateTime } from "luxon";
import {
  IDeductions,
  IScheduleItem,
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

export const getPayPeriodFromMonthYearAndPlatoon = (
  platoon: string,
  month: number,
  year: number
) => {
  try {
    let seed = DateTime.fromISO(seedDateFirstPayday);
    let payPeriodStart = DateTime.fromISO(seedDateFirstPayPeriodStart);
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
          const rotationDay = rotation[(rotationIndex + day) % rotation.length];

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
  year: number,
  userInfo: IUserDataForDB
) {
  try {
    let seed = DateTime.fromISO(seedDateFirstPayday);
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
          const rotationDay = rotation[(rotationIndex + day) % rotation.length];
          // only run the logic for generating a pay days data and calculating the day total for shifts that were worked
          if (rotationDay !== "day off") {
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

      // Increment rotation index outside the loop
      rotationIndex = (rotationIndex + 14) % rotation.length;
    }
    // max amounts are for 2024
    const maxEIDeduction = 1049.12;
    const maxCPPDeduction = 3867.5;
    let totalEIDeduction = 0;
    let totalCPPDeduction = 0;
    let cppExemption = 3500 / 26;

    // after all the years work days have been populated, create a new array by generating work days data, and summing day Totals for each shift
    for (const [paydayDate, array] of Object.entries(data)) {
      let paydayTotal = 0;
      let hoursWorkedInPayPeriod = 0;

      // iterate over each array of dates in the payday

      for (const day of array) {
        let dayData = generateSingleDaysDataForClient(userInfo, day);
        paydayTotal += dayData.dayTotal;
        hoursWorkedInPayPeriod += dayData.baseHoursWorked!;
      }

      // Calculate the EI deduction for the current pay period but calculating the expected gross income minus 8.29 uniform allowance
      let currentEIDeduction =
        (Number(
          (80 - hoursWorkedInPayPeriod) * parseFloat(userInfo.hourlyWage) +
            paydayTotal
        ) -
          8.29) *
        0.0163;

      let currentCPPDeduction =
        (Number(
          (80 - hoursWorkedInPayPeriod) * parseFloat(userInfo.hourlyWage) +
            paydayTotal
        ) -
          8.29) *
        0.0595;

      // Calculate the YTD value excluding the current entry for both EI and CPP
      const ytdEIExcludingCurrent = totalEIDeduction;
      const ytdCPPExcludingCurrent = totalCPPDeduction;

      // Check if adding the current deduction exceeds the maximum for ei and then cpp
      if (totalEIDeduction + currentEIDeduction > maxEIDeduction) {
        // Adjust the current deduction to make sure it doesn't exceed the maximum
        currentEIDeduction = maxEIDeduction - totalEIDeduction;
        totalEIDeduction += currentEIDeduction;
      } else {
        // Continue with the normal deduction calculation
        totalEIDeduction += currentEIDeduction;
      }

      // Check if adding the current deduction exceeds the maximum for ei and then cpp
      if (totalCPPDeduction + currentCPPDeduction > maxCPPDeduction) {
        // Adjust the current deduction to make sure it doesn't exceed the maximum
        currentCPPDeduction = maxCPPDeduction - totalCPPDeduction;
        totalCPPDeduction += currentCPPDeduction;
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
        grossIncome: Number(
          (80 - hoursWorkedInPayPeriod) * parseFloat(userInfo.hourlyWage) +
            paydayTotal
        ),
      });
    }
    console.log(yearsEIDeductions);
    return yearsEIDeductions;
  } catch (error) {
    console.log(error + "erorr generating ei deductions");
  }
}
