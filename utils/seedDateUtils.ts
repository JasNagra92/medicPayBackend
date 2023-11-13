import { DateTime } from "luxon";
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

export const getPayPeriodFromYearAndPlatoon = (
  platoon: string,
  year: number
) => {
  let seed = DateTime.fromISO(seedDateFirstPayday);
  let payPeriodStart = DateTime.fromISO(seedDateFirstPayPeriodStart);
  let data: Record<string, Record<string, number>> = {};

  while (seed.year <= year) {
    const rotationIndex = startingRotationIndex[platoon];
    let currentPayPeriodData: Record<string, number> = {};
    if (seed.year === year) {
      for (let day = 0; day < 14; day++) {
        const currentDate = payPeriodStart.plus({ days: day }).toISODate();
        const rotationDay = rotation[(rotationIndex + day) % 8];
        currentPayPeriodData[currentDate] = rotationDay;
      }

      data[seed.toISODate()!] = currentPayPeriodData;
    }

    payPeriodStart = payPeriodStart.plus({ days: 14 });
    seed = seed.plus({ days: 14 });
  }

  console.log(data);
};

// Example usage
getPayPeriodFromYearAndPlatoon("A", 2024);
