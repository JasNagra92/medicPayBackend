import { DateTime } from "luxon";
import { IScheduleItem } from "../interfaces/dbInterfaces";
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

const seedDateFirstPayday = "2023-01-27";
const seedDateFirstPayPeriodStart = "2023-01-06";

//   where in the rotation index each platoon was on the first day of the second pay period in January, january 27 2023
const startingRotationIndex: Record<string, number> = {
  A: 2,
  B: 0,
  C: 6,
  D: 4,
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
