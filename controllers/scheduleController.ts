import {
  IRequestForSinglePayDayData,
  IRequestForWholeStiip,
  IRequestForPartialStiip,
  ISingleDaysPayDataForClient,
  ITwoWeekPayPeriodForClient,
} from "./../interfaces/dbInterfaces";
import { DateTime } from "luxon";
import { Response } from "express";
import { IRequestForPayDayData } from "../interfaces/dbInterfaces";
import {
  generateSingleDaysDataForClient,
  generateWholeStiipShift,
  generatePartialStiipDaysDataForClient,
} from "../utils/scheduleGenerationUtils";
import { getPayPeriodFromMonthYearAndPlatoon } from "../utils/seedDateUtils";

export const getMonthsPayPeriodData = (
  req: IRequestForPayDayData,
  res: Response
) => {
  try {
    const { userInfo, month, year } = req.body;
    let responseData: ITwoWeekPayPeriodForClient[] = [];

    let data = getPayPeriodFromMonthYearAndPlatoon(
      userInfo.platoon,
      month,
      year
    );

    for (const paydayDate in data) {
      const payPeriodData = data[paydayDate];
      let workDaysInPayPeriod: ISingleDaysPayDataForClient[] = [];

      for (const dayData of payPeriodData) {
        workDaysInPayPeriod.push(
          generateSingleDaysDataForClient(userInfo, dayData)
        );
      }

      responseData.push({
        payDay: DateTime.fromISO(paydayDate).toJSDate(),
        workDaysInPayPeriod,
      });
    }

    res.status(200).send({ data: responseData });
  } catch (error) {
    console.error("Error in getMonthsPayPeriodData:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

export const getWholeStiipData = (
  req: IRequestForWholeStiip,
  res: Response
) => {
  const { userInfo, date, rotation } = req.body;
  const singleDayWholeStiip = generateWholeStiipShift(userInfo, date, rotation);

  res.status(200).send({ data: singleDayWholeStiip });
};

export const getPartialStiipData = (
  req: IRequestForPartialStiip,
  res: Response
) => {
  const {
    userInfo,
    date,
    rotation,
    shiftStart,
    updatedShiftEnd,
    originalShiftEnd,
  } = req.body;

  let day = {
    date,
    rotation,
  };
  const dayWithParitalStiip = generatePartialStiipDaysDataForClient(
    userInfo,
    day,
    shiftStart,
    updatedShiftEnd,
    originalShiftEnd
  );

  res.status(200).send({ data: dayWithParitalStiip });
};

export const getSingleDaysWorkData = (
  req: IRequestForSinglePayDayData,
  res: Response
) => {
  const { userInfo, date, rotation } = req.body;
  const singleDaysPayData = generateSingleDaysDataForClient(userInfo, {
    date: new Date(date),
    rotation,
  });
  res.status(200).send({ data: singleDaysPayData });
};
