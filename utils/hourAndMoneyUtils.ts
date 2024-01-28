import { IScheduleItem, IUserDataForDB } from "../interfaces/dbInterfaces";
import { DateTime } from "luxon";

// function to check if start is a whole and end is a fraction
export function endFractionStartWhole(
  shiftStart: Date,
  shiftEnd: Date
): boolean {
  return shiftStart.getMinutes() === 0 && shiftEnd.getMinutes() !== 0;
}

// function to return how many hours between 2 date objects fall within night shift premium hours
export function getNightShiftPremiumHoursWorked(
  shiftStart: Date,
  shiftEnd: Date
): number {
  const shiftStartDT = DateTime.fromJSDate(shiftStart);
  const shiftEndDT = DateTime.fromJSDate(shiftEnd);

  const start = DateTime.max(
    shiftStartDT,
    DateTime.fromObject({
      year: shiftStartDT.year,
      month: shiftStartDT.month,
      day: shiftStartDT.day,
      hour: 18,
    })
  );
  const end = DateTime.min(
    shiftEndDT,
    DateTime.fromObject({
      year: shiftEndDT.year,
      month: shiftEndDT.month,
      day: shiftStartDT.day + 1,
      hour: 6,
    })
  );
  if (start < end) {
    const duration = end.diff(start, "hours");
    return parseFloat(duration.hours.toFixed(2));
  } else {
    return 0;
  }
}

// function to return how many hours between 2 date objects fall within weekend shift premium hours
export function getWeekendPremiumHoursWorked(
  shiftStart: Date,
  shiftEnd: Date
): number {
  const shiftStartDT = DateTime.fromJSDate(shiftStart);
  const shiftEndDT = DateTime.fromJSDate(shiftEnd);

  const fridayNightStart = shiftStartDT
    .set({ hour: 18, minute: 0, second: 0, millisecond: 0 })
    .set({ weekday: 5 }); // Friday
  const mondayMorningEnd = fridayNightStart.plus({ days: 3 }).set({ hour: 6 }); // Monday

  const start = DateTime.max(shiftStartDT, fridayNightStart);
  const end = DateTime.min(shiftEndDT, mondayMorningEnd);

  if (start < end) {
    const duration = end.diff(start, "hours");
    return parseFloat(duration.hours.toFixed(2));
  } else {
    return 0;
  }
}

// function to return total hours worked between 2 date objects
export function getHoursWorked(startTime: Date, endTime: Date): number {
  const startDateTime = DateTime.fromJSDate(startTime);
  const endDateTime = DateTime.fromJSDate(endTime);

  const diffInHours = endDateTime.diff(startDateTime, "hours").hours;

  // Round to two decimal places
  return parseFloat(diffInHours.toFixed(2));
}

// function to return a start time as date object when given a schedule item and a user info object. Schedule item will decide if a start date is to be generated using the day shift start times or the night shift start times from the user info object
export function generateStartTimeDate(
  scheduleItem: IScheduleItem,
  userInfo: IUserDataForDB
): Date {
  const { date, rotation } = scheduleItem;
  const { dayShiftStartTime, nightShiftStartTime } = userInfo;

  const [hours, minutes] =
    rotation === "Day 1" || rotation === "Day 2"
      ? [dayShiftStartTime.hours, dayShiftStartTime.minutes]
      : [nightShiftStartTime.hours, nightShiftStartTime.minutes];

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes
  );
}

// function to return a end time as date object when given a schedule item and a user info object. Schedule item will decide if a start date is to be generated using the day shift start times or the night shift start times from the user info object
export function generateEndTimeDate(
  scheduleItem: IScheduleItem,
  userInfo: IUserDataForDB
): Date {
  const { date, rotation } = scheduleItem;
  const { dayShiftEndTime, nightShiftEndTime } = userInfo;

  let hours, minutes;
  // create a new date object to prevent mutating the original date from the scheduleItem that is passed into this function by reference
  let modifiedDate = new Date(date.getTime());

  if (rotation === "Day 1" || rotation === "Day 2") {
    hours = dayShiftEndTime.hours;
    minutes = dayShiftEndTime.minutes;
  } else {
    hours = nightShiftEndTime.hours;
    minutes = nightShiftEndTime.minutes;
    // adjust the date to the next day because all night shifts end after midnight
    modifiedDate.setDate(modifiedDate.getDate() + 1);
  }
  return new Date(
    modifiedDate.getFullYear(),
    modifiedDate.getMonth(),
    modifiedDate.getDate(),
    hours,
    minutes
  );
}
