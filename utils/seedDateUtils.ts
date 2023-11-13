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
  let seed = DateTime.fromISO(seedDateFirstPayday);
  let payPeriodStart = DateTime.fromISO(seedDateFirstPayPeriodStart);
  let data: Record<string, IScheduleItem[]> = {};

  while (seed.year <= year) {
    const rotationIndex = startingRotationIndex[platoon];
    let currentPayPeriodData: IScheduleItem[] = [];
    if (seed.year === year && seed.month === month) {
      for (let day = 0; day < 14; day++) {
        const currentDate = payPeriodStart.plus({ days: day }).toISODate();
        const rotationDay = rotation[(rotationIndex + day) % 8];

        currentPayPeriodData.push({
          date: DateTime.fromISO(currentDate!).toJSDate(),
          rotation: rotationDay,
        });
      }

      data[seed.toISODate()!] = currentPayPeriodData;
    }

    payPeriodStart = payPeriodStart.plus({ days: 14 });
    seed = seed.plus({ days: 14 });
  }
  return data;
};
