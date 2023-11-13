import { IUserDataForDB } from "./../interfaces/dbInterfaces";
import {
  ISingleDaysPayDataForClient,
  ITwoWeekPayPeriodForClient,
  IPlatoonStart,
  IScheduleItem,
} from "../interfaces/dbInterfaces";
import { sub } from "date-fns";
import {
  generateEndTimeDate,
  generateStartTimeDate,
  getHoursWorked,
  getNightShiftPremiumHoursWorked,
  getWeekendPremiumHoursWorked,
} from "./hourAndMoneyUtils";

const nightShiftStartHour: number = 18;
const nightShiftEndHour: number = 6;

const commonPlatoonStart1: IPlatoonStart = {
  A: 6,
  B: 4,
  C: 2,
  D: 0,
};
const commonPlatoonStart2: IPlatoonStart = {
  A: 5,
  B: 3,
  C: 1,
  D: 7,
};
const commonPlatoonStart3: IPlatoonStart = {
  A: 3,
  B: 1,
  C: 7,
  D: 5,
};
const commonPlatoonStart4: IPlatoonStart = {
  A: 2,
  B: 0,
  C: 5,
  D: 4,
};
const commonPlatoonStart5: IPlatoonStart = {
  A: 1,
  B: 7,
  C: 5,
  D: 3,
};
// object that has months as the keys, and the properties are every platoon, on day 1 of the corresponding month, where along the 4 on 4 off schedule the platoon begins, index 0 corresponds to Day 1, index 2 corresponds to Day 2 etc.., this will be used to find the rotation in the requested pay period from the users platoon and which month the pay period they are requesting data for is in
const platoonStarts2023: Record<number, IPlatoonStart> = {
  9: commonPlatoonStart1,
  10: commonPlatoonStart2,
  11: commonPlatoonStart3,
};
const platoonStarts2024: Record<number, IPlatoonStart> = {
  0: commonPlatoonStart4,
  1: commonPlatoonStart5,
  2: commonPlatoonStart1,
  3: commonPlatoonStart2,
  4: commonPlatoonStart3,
  5: commonPlatoonStart4,
  6: { A: 0, B: 6, C: 4, D: 2 },
  7: { A: 7, B: 5, C: 3, D: 1 },
  8: commonPlatoonStart1,
  9: { A: 4, B: 2, C: 0, D: 6 },
  10: commonPlatoonStart3,
  11: commonPlatoonStart5,
};
// the 4 on 4 of schedule
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

// util function to the get start of the desired pay period
export function getPayPeriodStart(payDay: Date): Date {
  const payPeriodStart = sub(payDay, { days: 21 });
  return payPeriodStart;
}

// this function will create a 6 week schedule when given a pay day that the user picks, it will start from the first month of the pay period start date for the given pay day, and go for 6 weeks. After that schedule is created, it will then only return the 2 weeks that will be paid out on the given payday
export function getPayPeriodSchedule(
  payPeriodStart: Date,
  platoon: string
): IScheduleItem[] {
  // make sure the platoon is one of the 4 accepted values

  const payPeriodStartMonth: number = payPeriodStart.getMonth();

  // initialize an empty schedule that will be filled in a for loop
  let payPeriodSchedule = [];

  interface IPlatoonStarts {
    [year: number]: Record<number, IPlatoonStart>;
  }

  // get the starting index from the platoonStarts2023 or 2024 object
  const platoonStarts: IPlatoonStarts = {
    2023: platoonStarts2023,
    2024: platoonStarts2024,
    // Add additional platoonStarts object for other years as needed
  };

  // Function to get starting index based on the year
  const getStartingIndex = (
    payPeriodStart: Date,
    year: number,
    platoon: string
  ) => {
    const payPeriodStartMonth = payPeriodStart.getMonth();
    return platoonStarts[year][payPeriodStartMonth][platoon];
  };

  // Usage
  let startingIndex = getStartingIndex(
    payPeriodStart,
    payPeriodStart.getFullYear(),
    platoon
  );

  // define the rotation index using the starting index
  let rotationIndex = startingIndex;

  // Use a while loop to collect 14 items
  let i = 1;
  while (payPeriodSchedule.length < 14) {
    let currentDay = new Date(2023, payPeriodStartMonth, i);

    if (currentDay >= payPeriodStart) {
      payPeriodSchedule.push({
        date: currentDay,
        rotation: rotation[rotationIndex],
      });
    }

    // Increment the rotation index with a modulo operator to loop back to the start after reaching the 4th day off
    rotationIndex = (rotationIndex + 1) % rotation.length;
    i++;
  }

  return payPeriodSchedule;
}

// this function will loop through the pay period schedule, and create the singleDays work data for the client
export function generateSingleDaysDataForClient(
  userInfo: IUserDataForDB,
  day: IScheduleItem
): ISingleDaysPayDataForClient {
  const shiftStart = generateStartTimeDate(day, userInfo);
  const shiftEnd = generateEndTimeDate(day, userInfo);

  const baseHoursWorked =
    day.rotation === "day off" ? 0 : getHoursWorked(shiftStart, shiftEnd);
  const nightHoursWorked =
    day.rotation === "day off"
      ? 0
      : getNightShiftPremiumHoursWorked(shiftStart, shiftEnd);
  const weekendHoursWorked =
    day.rotation === "day off"
      ? 0
      : getWeekendPremiumHoursWorked(shiftStart, shiftEnd);

  const baseWageEarnings =
    day.rotation === "day off"
      ? 0
      : baseHoursWorked * parseFloat(userInfo.hourlyWage);
  const nightEarnings = nightHoursWorked * 2.0;
  const alphaNightsEarnings = nightHoursWorked * 3.6;
  const weekendEarnings = weekendHoursWorked * 2.25;

  const dayTotal =
    day.rotation === "day off"
      ? 0
      : baseWageEarnings +
        alphaNightsEarnings +
        nightEarnings +
        weekendEarnings;

  return {
    date: day.date,
    rotation: day.rotation,
    shiftStart,
    shiftEnd,
    baseHoursWorked,
    nightHoursWorked,
    weekendHoursWorked,
    baseWageEarnings,
    nightEarnings,
    alphaNightsEarnings,
    weekendEarnings,
    dayTotal,
  };
}

// function to generate a daysPayData where the user indicates they stipped the whole day
export function generateWholeStiipShift(
  userInfo: IUserDataForDB,
  date: string,
  rotation: string
) {
  const day = {
    date: new Date(date),
    rotation,
  };
  const shiftStart = generateStartTimeDate(day, userInfo);
  const shiftEnd = generateEndTimeDate(day, userInfo);

  const baseHoursWorked = 0;
  const nightHoursWorked = 0;
  const weekendHoursWorked = 0;

  const baseWageEarnings = 0;
  const nightEarnings = 0;
  const alphaNightsEarnings = 0;
  const weekendEarnings = 0;

  const stiipHours = getHoursWorked(shiftStart, shiftEnd);

  const dayTotal = 0.75 * parseFloat(userInfo.hourlyWage) * stiipHours;

  return {
    date: day.date,
    rotation: day.rotation,
    shiftStart,
    shiftEnd,
    baseHoursWorked,
    nightHoursWorked,
    weekendHoursWorked,
    baseWageEarnings,
    nightEarnings,
    alphaNightsEarnings,
    weekendEarnings,
    stiipHours,
    dayTotal,
  };
}

// function to generate specified number of paydates starting from provided payday
export function generatePaydaysMap(
  firstPayday: Date,
  numberOfPaydays: number
): Map<string, Date[]> {
  const paydaysMap = new Map<string, Date[]>();

  for (let i = 0; i < numberOfPaydays; i++) {
    const nextPayday = new Date(firstPayday);
    nextPayday.setDate(nextPayday.getDate() + i * 14); // Incrementing 14 days for each iteration

    const key = `${nextPayday.getMonth()} ${nextPayday.getFullYear()}`;

    if (!paydaysMap.has(key)) {
      paydaysMap.set(key, []);
    }

    paydaysMap.get(key)!.push(nextPayday);
  }

  return paydaysMap;
}

export const payDaysMap = generatePaydaysMap(new Date(2023, 10, 3), 32);
