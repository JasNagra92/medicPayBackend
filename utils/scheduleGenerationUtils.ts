import { IUserDataForDB, IVacationDates } from "./../interfaces/dbInterfaces";
import {
  ISingleDaysPayDataForClient,
  IScheduleItem,
} from "../interfaces/dbInterfaces";
import {
  generateEndTimeDate,
  generateStartTimeDate,
  getHoursWorked,
  getNightShiftPremiumHoursWorked,
  getWeekendPremiumHoursWorked,
} from "./hourAndMoneyUtils";
import { DateTime } from "luxon";

export const statDays2024 = [
  "2024-01-01",
  "2024-02-19",
  "2024-03-29",
  "2024-05-20",
  "2024-07-01",
  "2024-08-05",
  "2024-09-02",
  "2024-09-30",
  "2024-10-14",
  "2024-11-11",
  "2024-12-25",
];

function isOnStatDay(jsDate: Date): boolean {
  const dateToCheck = DateTime.fromJSDate(jsDate);

  // Check if the date falls on any of the stat days
  const isOnStatDay = statDays2024.some((statDay) => {
    const statDayDateTime = DateTime.fromISO(statDay);
    return (
      dateToCheck >= statDayDateTime.startOf("day") &&
      dateToCheck < statDayDateTime.endOf("day")
    );
  });

  return isOnStatDay;
}

export function isWholeShiftOnStatDay(
  userInfo: IUserDataForDB,
  day: IScheduleItem
) {
  const shiftStart = generateStartTimeDate(day, userInfo);
  const shiftEnd = generateEndTimeDate(day, userInfo);
  let shiftStartDay = DateTime.fromJSDate(shiftStart);
  let shiftEndDay = DateTime.fromJSDate(shiftEnd);

  // Check if shift starts and ends on any of the stat days representing the whole shift took place on a stat
  const isOnStatDay = statDays2024.some((statDay) => {
    const statDayDateTime = DateTime.fromISO(statDay);
    return (
      shiftStartDay.hasSame(statDayDateTime, "day") &&
      shiftEndDay.hasSame(statDayDateTime, "day")
    );
  });

  return isOnStatDay;
}
// function to check if a shift starts the day before a stat and ends on a stat, will need to handle this case seperately and count hours correctly
export function isShiftOnStatDay(userInfo: IUserDataForDB, day: IScheduleItem) {
  const shiftStart = generateStartTimeDate(day, userInfo);
  const shiftEnd = generateEndTimeDate(day, userInfo);
  let shiftStartDay = DateTime.fromJSDate(shiftStart);
  let shiftEndDay = DateTime.fromJSDate(shiftEnd);

  // Check if shift starts or ends on any of the stat days
  const isOnStatDay = statDays2024.some((statDay) => {
    const statDayDateTime = DateTime.fromISO(statDay);
    return (
      shiftStartDay.hasSame(statDayDateTime, "day") ||
      shiftEndDay.hasSame(statDayDateTime, "day")
    );
  });

  return isOnStatDay;
}

export function getHoursWorkedWithStatPremium(
  userInfo: IUserDataForDB,
  day: IScheduleItem
): { baseHoursWorked: number; OTStatReg: number } {
  const shiftStart = generateStartTimeDate(day, userInfo);
  const shiftEnd = generateEndTimeDate(day, userInfo);
  const hoursWorked = getHoursWorked(shiftStart, shiftEnd);

  let baseHoursWorked = 0;
  let OTStatReg = 0;

  // Extract fractions from start and end times
  const startFraction = shiftStart.getMinutes() / 60;
  const endFraction = shiftEnd.getMinutes() / 60;

  // Handle fractional start
  if (startFraction > 0) {
    // Check if the start hour is on a stat day
    if (isOnStatDay(shiftStart)) {
      OTStatReg += startFraction;
    } else {
      baseHoursWorked += 1 - startFraction;
    }
  }

  // Handle fractional end
  if (endFraction > 0) {
    // Check if the end hour is on a stat day
    if (isOnStatDay(shiftEnd)) {
      OTStatReg += endFraction;
    } else {
      baseHoursWorked += endFraction;
    }
  }

  // Iterate through each hour of the shift
  for (
    let currentHour = startFraction > 0 ? 1 : 0;
    currentHour < (endFraction > 0 ? hoursWorked - 1 : hoursWorked);
    currentHour++
  ) {
    const currentHourDateTime = DateTime.fromJSDate(shiftStart).plus({
      hour: currentHour,
    });

    // Check if the current hour is on a stat day
    let result = isOnStatDay(currentHourDateTime.toJSDate());

    // Increment counters based on whether the current hour is on the stat or not
    if (result) {
      OTStatReg += 1;
    } else {
      baseHoursWorked += 1; // Increment base hours for non-stat day
    }
  }

  return { baseHoursWorked, OTStatReg };
}

export function generatePartialStiipDaysDataForClient(
  userInfo: IUserDataForDB,
  day: IScheduleItem,
  shiftStart: Date,
  updatedShiftEnd: Date,
  originalShiftEnd: Date
): ISingleDaysPayDataForClient {
  const shiftStartForStiip = new Date(shiftStart);
  const originalShiftEndForStiip = new Date(originalShiftEnd);
  const shiftEndForStiip = new Date(updatedShiftEnd);

  const baseHoursWorked = getHoursWorked(shiftStartForStiip, shiftEndForStiip);
  const nightHoursWorked = getNightShiftPremiumHoursWorked(
    shiftStartForStiip,
    shiftEndForStiip
  );
  const weekendHoursWorked = getWeekendPremiumHoursWorked(
    shiftStartForStiip,
    shiftEndForStiip
  );

  const baseWageEarnings = baseHoursWorked * parseFloat(userInfo.hourlyWage);
  const nightEarnings = nightHoursWorked * 2.0;

  let alphaNightsEarnings;
  alphaNightsEarnings =
    userInfo.shiftPattern === "Alpha" ? nightHoursWorked * 3.6 : 0;

  const weekendEarnings = weekendHoursWorked * 2.25;

  const stiipHours =
    (originalShiftEndForStiip.getTime() - shiftEndForStiip.getTime()) /
    (1000 * 60 * 60);

  const dayTotal =
    baseWageEarnings +
    alphaNightsEarnings +
    nightEarnings +
    weekendEarnings +
    stiipHours * (parseFloat(userInfo.hourlyWage) * 0.75);

  return {
    date: day.date,
    rotation: day.rotation,
    shiftStart,
    shiftEnd: updatedShiftEnd,
    baseHoursWorked,
    nightHoursWorked,
    weekendHoursWorked,
    baseWageEarnings,
    nightEarnings,
    alphaNightsEarnings,
    weekendEarnings,
    dayTotal,
    stiipHours,
  };
}
// this function will loop through the pay period schedule, and create the singleDays work data for the client
export function generateSingleDaysDataForClient(
  userInfo: IUserDataForDB,
  day: IScheduleItem
): ISingleDaysPayDataForClient {
  const shiftStart = generateStartTimeDate(day, userInfo);
  const shiftEnd = generateEndTimeDate(day, userInfo);

  let OTStatReg = 0;
  let baseHoursWorked =
    day.rotation === "day off" || day.rotation === "R Day"
      ? 0
      : getHoursWorked(shiftStart, shiftEnd);

  if (day.rotation !== "day off") {
    if (isWholeShiftOnStatDay(userInfo, day)) {
      // if the entire shift took place on a stat day, the base hours variable will be 0 in order to reduce levelling, and instead of directly increasing levelling, the levelling calculation on the front end will add the OTStatReg variable hours into the equation
      OTStatReg = baseHoursWorked;
      baseHoursWorked = 0;
    } else if (isShiftOnStatDay(userInfo, day)) {
      ({ baseHoursWorked, OTStatReg } = getHoursWorkedWithStatPremium(
        userInfo,
        day
      ));
    }
  }

  const nightHoursWorked =
    day.rotation === "day off" || day.rotation === "R Day"
      ? 0
      : getNightShiftPremiumHoursWorked(shiftStart, shiftEnd);

  const weekendHoursWorked =
    day.rotation === "day off" || day.rotation === "R Day"
      ? 0
      : getWeekendPremiumHoursWorked(shiftStart, shiftEnd);

  let baseWageEarnings =
    day.rotation === "day off"
      ? 0
      : baseHoursWorked * parseFloat(userInfo.hourlyWage);

  if (day.rotation === "R Day") {
    baseWageEarnings = 12 * parseFloat(userInfo.hourlyWage);
  }

  const nightEarnings = nightHoursWorked * 2.0;
  let alphaNightsEarnings =
    userInfo.shiftPattern === "Alpha" ? nightHoursWorked * 3.6 : 0;
  const weekendEarnings = weekendHoursWorked * 2.25;

  const dayTotal =
    day.rotation === "day off"
      ? 0
      : baseWageEarnings +
        alphaNightsEarnings +
        nightEarnings +
        weekendEarnings +
        OTStatReg * (parseFloat(userInfo.hourlyWage) * 2);

  return {
    date: day.date,
    rotation: day.rotation,
    shiftStart,
    shiftEnd,
    baseHoursWorked,
    OTStatReg,
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

// function to generate a singleDaysPayData with late call overtime attached at 2.0 hourlyWage if the shift is an alpha, BC shifts will need a different calculation because their overtime from 11-12 hours worked is at 1.5x and anything over 12 is double time
export function generateLateCallShift(
  userInfo: IUserDataForDB,
  day: IScheduleItem,
  shiftStart: Date,
  updatedShiftEnd: Date,
  originalShiftEnd: Date
) {
  const shiftStartForOT = new Date(shiftStart);
  const originalShiftEndForOT = new Date(originalShiftEnd);
  const updatedShiftEndForOT = new Date(updatedShiftEnd);

  const baseHoursWorked = getHoursWorked(
    shiftStartForOT,
    originalShiftEndForOT
  );
  const regOTHours = getHoursWorked(
    originalShiftEndForOT,
    updatedShiftEndForOT
  );

  // calculate new premium values accounting for the updated shift end time
  const nightHoursWorked = getNightShiftPremiumHoursWorked(
    shiftStartForOT,
    updatedShiftEndForOT
  );
  const weekendHoursWorked = getWeekendPremiumHoursWorked(
    shiftStartForOT,
    updatedShiftEndForOT
  );

  const baseWageEarnings = baseHoursWorked * parseFloat(userInfo.hourlyWage);
  const regularOTEarnings =
    regOTHours * (parseFloat(userInfo.hourlyWage) * 2.0);
  const nightEarnings = nightHoursWorked * 2.0;

  let alphaNightsEarnings =
    userInfo.shiftPattern === "Alpha" ? nightHoursWorked * 3.6 : 0;

  const weekendEarnings = weekendHoursWorked * 2.25;

  const dayTotal =
    baseWageEarnings +
    alphaNightsEarnings +
    nightEarnings +
    weekendEarnings +
    regularOTEarnings;

  return {
    date: day.date,
    rotation: day.rotation,
    shiftStart,
    shiftEnd: updatedShiftEndForOT,
    baseHoursWorked,
    nightHoursWorked,
    weekendHoursWorked,
    baseWageEarnings,
    nightEarnings,
    alphaNightsEarnings,
    weekendEarnings,
    dayTotal,
    OTDoubleTime: regOTHours,
  };
}

// function to generate a singleDaysPayData when user requests to log overtime worked on a regular day off, hourly wage is 1.5x base rate up to 12 hours, then 2.0x base wage up to maximum 16 hour shift
export function generateRegularOTShift(
  userInfo: IUserDataForDB,
  date: Date,
  shiftStart: Date,
  shiftEnd: Date
) {
  const shiftStartForOT = new Date(shiftStart);
  const shiftEndForOT = new Date(shiftEnd);

  const regOTHours = getHoursWorked(shiftStartForOT, shiftEndForOT);

  // Calculate regular OT earnings for the first 12 hours
  const first12HoursEarnings =
    Math.min(regOTHours, 12) * (parseFloat(userInfo.hourlyWage) * 1.5);

  // If regOTHours is greater than 12, calculate earnings for hours above 12 at 2.0x the hourly wage
  const hoursAbove12Earnings =
    regOTHours > 12
      ? (regOTHours - 12) * (parseFloat(userInfo.hourlyWage) * 2.0)
      : 0;

  // calculate new premium values accounting for the updated shift end time
  const nightHoursWorked = getNightShiftPremiumHoursWorked(
    shiftStartForOT,
    shiftEndForOT
  );
  const weekendHoursWorked = getWeekendPremiumHoursWorked(
    shiftStartForOT,
    shiftEndForOT
  );

  const nightEarnings = nightHoursWorked * 2.0;
  const alphaNightsEarnings = nightHoursWorked * 3.6;
  const weekendEarnings = weekendHoursWorked * 2.25;

  const dayTotal =
    alphaNightsEarnings +
    nightEarnings +
    weekendEarnings +
    first12HoursEarnings +
    hoursAbove12Earnings;

  return {
    date,
    rotation: "Reg OT",
    baseHoursWorked: 0,
    baseWageEarnings: 0,
    shiftStart,
    shiftEnd,
    nightHoursWorked,
    weekendHoursWorked,
    nightEarnings,
    alphaNightsEarnings,
    weekendEarnings,
    dayTotal,
    OTOnePointFive: Math.min(regOTHours, 12),
    OTDoubleTime: regOTHours > 12 ? regOTHours - 12 : undefined,
  };
}

export function generateRDayOTShift(
  userInfo: IUserDataForDB,
  date: Date,
  shiftStart: Date,
  shiftEnd: Date
) {
  const shiftStartForOT = new Date(shiftStart);
  const shiftEndForOT = new Date(shiftEnd);

  const regOTHours = getHoursWorked(shiftStartForOT, shiftEndForOT);
  const baseWageEarnings = 12 * parseFloat(userInfo.hourlyWage);

  // Calculate regular OT earnings for the first 12 hours
  const first12HoursEarnings =
    Math.min(regOTHours, 12) * (parseFloat(userInfo.hourlyWage) * 1.5);

  // If regOTHours is greater than 12, calculate earnings for hours above 12 at 2.0x the hourly wage
  const hoursAbove12Earnings =
    regOTHours > 12
      ? (regOTHours - 12) * (parseFloat(userInfo.hourlyWage) * 2.0)
      : 0;

  // calculate new premium values accounting for the updated shift end time
  const nightHoursWorked = getNightShiftPremiumHoursWorked(
    shiftStartForOT,
    shiftEndForOT
  );
  const weekendHoursWorked = getWeekendPremiumHoursWorked(
    shiftStartForOT,
    shiftEndForOT
  );

  const nightEarnings = nightHoursWorked * 2.0;
  const alphaNightsEarnings = nightHoursWorked * 3.6;
  const weekendEarnings = weekendHoursWorked * 2.25;

  const dayTotal =
    baseWageEarnings +
    alphaNightsEarnings +
    nightEarnings +
    weekendEarnings +
    first12HoursEarnings +
    hoursAbove12Earnings;

  return {
    date,
    rotation: "R Day OT",
    baseHoursWorked: 0,
    baseWageEarnings,
    shiftStart,
    shiftEnd,
    nightHoursWorked,
    weekendHoursWorked,
    nightEarnings,
    alphaNightsEarnings,
    weekendEarnings,
    dayTotal,
    OTOnePointFive: Math.min(regOTHours, 12),
    OTDoubleTime: regOTHours > 12 ? regOTHours - 12 : undefined,
  };
}

// function to generate a singleDaysPayData when user requests to log a holiday recall shift, base wage earnings and hours should be calculated from the userInfo object, because user still gets paid their base wage, but all premiums needs to be calculated from the hours sent as overTimeShiftStart and End, as well as the overtimeDoubleTime variable needs to be set from the overtimeShiftStart and end variables
export function generateHolidayRecallShift(
  userInfo: IUserDataForDB,
  date: Date,
  shiftStart: Date,
  shiftEnd: Date,
  prevRotation?: string
) {
  const shiftStartForOT = new Date(shiftStart);
  const shiftEndForOT = new Date(shiftEnd);

  const OTDoubleTime = getHoursWorked(shiftStartForOT, shiftEndForOT);
  const OTDoubleTimeEarnings =
    OTDoubleTime * (parseFloat(userInfo.hourlyWage) * 2.0);
  const nightHoursWorked = getNightShiftPremiumHoursWorked(
    shiftStartForOT,
    shiftEndForOT
  );
  const weekendHoursWorked = getWeekendPremiumHoursWorked(
    shiftStartForOT,
    shiftEndForOT
  );
  const nightEarnings = nightHoursWorked * 2.0;
  const alphaNightsEarnings = nightHoursWorked * 3.6;
  const weekendEarnings = weekendHoursWorked * 2.25;

  let dayTotal =
    alphaNightsEarnings +
    nightEarnings +
    weekendEarnings +
    OTDoubleTimeEarnings;
  let baseHoursWorked = 0;
  let baseWageEarnings = 0;

  // if the ot the user worked was on a Vacation day, they are still paid their base wage, on top of the OTDouble Time
  if (prevRotation === "Vacation") {
    baseHoursWorked = userInfo.shiftPattern === "Alpha" ? 12 : 11;
    baseWageEarnings = parseFloat(userInfo.hourlyWage) * baseHoursWorked;
    dayTotal = dayTotal + baseWageEarnings;
  }

  return {
    date,
    rotation: "Recall",
    baseHoursWorked,
    baseWageEarnings,
    shiftStart,
    shiftEnd,
    nightHoursWorked,
    weekendHoursWorked,
    nightEarnings,
    alphaNightsEarnings,
    weekendEarnings,
    dayTotal,
    OTDoubleTime,
  };
}

export function generateVacationShift(
  userInfo: IUserDataForDB,
  date: IScheduleItem,
  shiftStart: Date,
  shiftEnd: Date
) {
  // Alpha employees shifts are always 12 hours, Bravo/Charlie are always 11
  const baseHoursWorked = userInfo.shiftPattern === "Alpha" ? 12 : 11;
  const nightHoursWorked = 0;
  const weekendHoursWorked = 0;
  const baseWageEarnings = baseHoursWorked * parseFloat(userInfo.hourlyWage);
  const nightEarnings = 0;
  const weekendEarnings = 0;
  const alphaNightsEarnings = 0;
  const dayTotal = baseWageEarnings;

  return {
    date: date.date,
    rotation: "Vacation",
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

export function generateVacationBlock(
  userInfo: IUserDataForDB,
  dates: IVacationDates[]
) {
  let data = [];
  for (const date of dates) {
    data.push(
      generateVacationShift(
        userInfo,
        { date: date.date, rotation: date.rotation },
        date.shiftStart as Date,
        date.shiftEnd as Date
      )
    );
  }
  return data;
}
