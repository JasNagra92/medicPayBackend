import { IScheduleItem, IUserDataForDB } from "../interfaces/dbInterfaces";
import { DateTime } from "luxon";

const nightShiftStartHour: number = 18;
const nightShiftEndHour: number = 6;

// function to check if shift start and end are both fractions
export function bothFractions(shiftStart: Date, shiftEnd: Date): boolean {
  return shiftStart.getMinutes() !== 0 && shiftEnd.getMinutes() !== 0;
}

// function to check if both times are whole start times
export function bothWholeTimes(shiftStart: Date, shiftEnd: Date): boolean {
  return shiftStart.getMinutes() === 0 && shiftEnd.getMinutes() === 0;
}

// function to check if start time is a fraction and end is a whole
export function startFractionEndWhole(
  shiftStart: Date,
  shiftEnd: Date
): boolean {
  return shiftStart.getMinutes() !== 0 && shiftEnd.getMinutes() === 0;
}

// function to check if start is a whole and end is a fraction
export function endFractionStartWhole(
  shiftStart: Date,
  shiftEnd: Date
): boolean {
  return shiftStart.getMinutes() === 0 && shiftEnd.getMinutes() !== 0;
}

// function to return premium hours worked when both start/end times are whole
export function getNightShiftHoursBothWhole(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let premiumHours = 0;

  const hoursWorked: number = getHoursWorked(shiftStart, shiftEnd);

  for (let hour = 0; hour < hoursWorked; hour++) {
    let currentHour = (shiftStart.getHours() + hour) % 24;

    if (isWithinNightShiftHours(currentHour)) {
      premiumHours += 1;
    }
  }

  return premiumHours;
}

// function to return premium hours when start time is a fraction but end time is whole
export function handleFractionalStartNightShift(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let premiumHours = 0;
  const startHour = shiftStart.getHours();
  const startMinute = shiftStart.getMinutes();

  // Check if the hour part of the start time is within night shift hours
  if (isWithinNightShiftHours(startHour)) {
    // Calculate fraction of the start hour
    const fraction = startMinute / 60;
    premiumHours += fraction;
  }

  // Start looping from the next hour
  for (let hour = 1; hour <= getHoursWorked(shiftStart, shiftEnd); hour++) {
    let currentHour = (startHour + hour) % 24;

    if (isWithinNightShiftHours(currentHour)) {
      premiumHours += 1;
    }
  }

  return premiumHours;
}

// function to return premium hours with a whole start time but a fractional end
export function handleFractionalEndNightShift(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let premiumHours = 0;
  const endHour = shiftEnd.getHours();
  const endMinute = shiftEnd.getMinutes();

  // Check if the hour part of the end time is within night shift hours
  if (isWithinNightShiftHours(endHour)) {
    // Calculate fraction of the end hour
    const fraction = endMinute / 60;
    premiumHours += fraction;
  }

  // Start looping from the start hour until the second-to-last whole hour
  for (let hour = 0; hour < getHoursWorked(shiftStart, shiftEnd) - 1; hour++) {
    let currentHour = (shiftStart.getHours() + hour) % 24;

    if (isWithinNightShiftHours(currentHour)) {
      premiumHours += 1;
    }
  }

  return premiumHours;
}

// function to return premium hours with a fractional start time and fractional end
export function handleBothFractionsNightShift(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let premiumHours = 0;
  const hoursWorked = getHoursWorked(shiftStart, shiftEnd);
  const startHour = shiftStart.getHours();
  const endHour = shiftEnd.getHours();
  const startMinute = shiftStart.getMinutes();
  const endMinute = shiftEnd.getMinutes();

  // the regular loop
  for (let hour = 1; hour < hoursWorked; hour++) {
    let currentHour = (hour + shiftStart.getHours()) % 24;
    if (isWithinNightShiftHours(currentHour)) {
      premiumHours += 1;
    }
  }

  // Calculate fraction for the start hour
  if (isWithinNightShiftHours(startHour)) {
    const startFraction = 1 - startMinute / 60;
    premiumHours += startFraction;
  }

  // Calculate fraction for the end hour
  if (isWithinNightShiftHours(endHour)) {
    const endFraction = endMinute / 60;
    premiumHours += endFraction;
  }

  return premiumHours;
}

// function to check if the given hour is between night shift
// premium hours
export function isWithinNightShiftHours(currentHour: number): Boolean {
  return currentHour >= nightShiftStartHour || currentHour < nightShiftEndHour
    ? true
    : false;
}

// function to return how many hours between 2 date objects fall within night shift premium hours
export function getNightShiftPremiumHoursWorked(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let premiumHours = 0;

  if (bothWholeTimes(shiftStart, shiftEnd)) {
    premiumHours = getNightShiftHoursBothWhole(shiftStart, shiftEnd);
  }
  if (startFractionEndWhole(shiftStart, shiftEnd)) {
    premiumHours = handleFractionalStartNightShift(shiftStart, shiftEnd);
  }
  if (endFractionStartWhole(shiftStart, shiftEnd)) {
    premiumHours = handleFractionalEndNightShift(shiftStart, shiftEnd);
  }
  if (bothFractions(shiftStart, shiftEnd)) {
    premiumHours = handleBothFractionsNightShift(shiftStart, shiftEnd);
  }

  return premiumHours;
}

// function to check specifically if the given hour is between
// 6pm on a friday night and midnight on friday night
// or if it is on Monday morning between 0000 hours and 0600
export function isWithinFridayNightOrMondayMorning(
  currentHour: number,
  currentDay: number
): Boolean {
  if (
    (currentHour >= 18 && currentDay === 5) ||
    (currentHour < 6 && currentDay === 1)
  ) {
    return true;
  } else {
    return false;
  }
}

// function to check if given hour takes place on a saturday or sunday
export function isWeekend(currentDay: number): Boolean {
  return currentDay === 6 || currentDay === 0 ? true : false;
}

// function to return how many hours between 2 date objects fall within weekend shift premium hours
export function getWeekendPremiumHoursWorked(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let weekendPremiumHours = 0;

  if (bothWholeTimes(shiftStart, shiftEnd)) {
    weekendPremiumHours = getWeekendPremiumHoursBothWhole(shiftStart, shiftEnd);
  }
  if (startFractionEndWhole(shiftStart, shiftEnd)) {
    weekendPremiumHours = handleFractionalStartWeekend(shiftStart, shiftEnd);
  }
  if (endFractionStartWhole(shiftStart, shiftEnd)) {
    weekendPremiumHours = handleFractionalEndWeekend(shiftStart, shiftEnd);
  }
  if (bothFractions(shiftStart, shiftEnd)) {
    weekendPremiumHours = handleBothFractionsWeekend(shiftStart, shiftEnd);
  }
  return weekendPremiumHours;
}

// function to return hours worked within the weekend premium hours with fractional start time and fractional end time
export function handleBothFractionsWeekend(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let weekendPremiumHours = 0;
  const hoursWorked = getHoursWorked(shiftStart, shiftEnd);
  const startHour = shiftStart.getHours();
  const startHoursFraction = 1 - shiftStart.getMinutes() / 60;
  const endHoursFraction = shiftEnd.getMinutes() / 60;

  // check if shift end time hour is within premium hours
  if (
    isWeekend(shiftEnd.getDay()) ||
    isWithinFridayNightOrMondayMorning(shiftEnd.getHours(), shiftEnd.getDay())
  ) {
    // add fraction to premium first
    weekendPremiumHours += endHoursFraction;
  }
  // check if shift start hour is within premium hours then add fraction
  if (
    isWeekend(shiftStart.getDay()) ||
    isWithinFridayNightOrMondayMorning(
      shiftStart.getHours(),
      shiftStart.getDay()
    )
  ) {
    weekendPremiumHours += startHoursFraction;
  }

  let currentDay = shiftStart.getDay();
  for (let hour = 1; hour < hoursWorked; hour++) {
    const currentHour = (hour + startHour) % 24;

    if (
      isWeekend(currentDay) ||
      isWithinFridayNightOrMondayMorning(currentHour, currentDay)
    ) {
      weekendPremiumHours += 1;
    }
    if (currentHour === 23) {
      currentDay = (currentDay + 1) & 7;
    }
  }

  return weekendPremiumHours;
}

// function to return hours worked within the weekend premium hours with whole start time and fractional end time
export function handleFractionalEndWeekend(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let weekendPremiumHours = 0;
  const hoursWorked = getHoursWorked(shiftStart, shiftEnd);
  const endHour = shiftEnd.getHours();
  const endHoursFraction = shiftEnd.getMinutes() / 60;

  // check if shift end time hour is within premium hours
  if (
    isWeekend(shiftEnd.getDay()) ||
    isWithinFridayNightOrMondayMorning(endHour, shiftEnd.getDay())
  ) {
    // add fraction to premium first
    weekendPremiumHours += endHoursFraction;
  }

  let currentDay = shiftStart.getDay();
  // only loop to second to last hour because last hour has already been accounted for
  for (let hour = 0; hour < hoursWorked - 1; hour++) {
    let currentHour = (shiftStart.getHours() + hour) % 24;

    if (
      isWeekend(currentDay) ||
      isWithinFridayNightOrMondayMorning(currentHour, currentDay)
    ) {
      weekendPremiumHours += 1;
    }

    if (currentHour === 23) {
      currentDay = (currentDay + 1) % 7;
    }
  }

  return weekendPremiumHours;
}

// function to return hours worked within the weekend premium hours with fractional start time and whole end time
export function handleFractionalStartWeekend(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let weekendPremiumHours = 0;
  const hoursWorked = getHoursWorked(shiftStart, shiftEnd);
  const startHoursFraction = shiftStart.getMinutes() / 60;

  const isStartFraction = startHoursFraction > 0;

  let currentDay = shiftStart.getDay();
  for (let hour = 0; hour < hoursWorked; hour++) {
    let currentHour = (shiftStart.getHours() + hour) % 24;

    if (isStartFraction && hour === 0) {
      if (
        isWeekend(currentDay) ||
        isWithinFridayNightOrMondayMorning(currentHour, currentDay)
      ) {
        weekendPremiumHours += startHoursFraction;
      }
    } else {
      if (
        isWeekend(currentDay) ||
        isWithinFridayNightOrMondayMorning(currentHour, currentDay)
      ) {
        weekendPremiumHours += 1;
      }
    }

    if (currentHour === 23) {
      currentDay = (currentDay + 1) % 7;
    }
  }

  return weekendPremiumHours;
}

// function to return hours worked within the weekend premium hours with whole start/end times
export function getWeekendPremiumHoursBothWhole(
  shiftStart: Date,
  shiftEnd: Date
): number {
  let weekendPremiumHours = 0;

  const hoursWorked: number = getHoursWorked(shiftStart, shiftEnd);

  let currentDay = shiftStart.getDay();
  for (let hour = 0; hour < hoursWorked; hour++) {
    let currentHour = (shiftStart.getHours() + hour) % 24;

    if (
      isWeekend(currentDay) ||
      isWithinFridayNightOrMondayMorning(currentHour, currentDay)
    ) {
      weekendPremiumHours += 1;
    }

    if (currentHour === 23) {
      currentDay = (currentDay + 1) % 7;
    }
  }

  return weekendPremiumHours;
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
