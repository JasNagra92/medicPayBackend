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

// this function will loop through the pay period schedule, and create the singleDays work data for the client
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
  const alphaNightsEarnings = nightHoursWorked * 3.6;
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
  const alphaNightsEarnings = nightHoursWorked * 3.6;
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
