import { IUserDataForDB } from "./../interfaces/dbInterfaces";
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
import { format } from "date-fns";

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
