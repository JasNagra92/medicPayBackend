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
import {
  addPartialSickDayToDB,
  updateSickDaysInPayPeriod,
} from "../utils/sickDayUtils";
import { getPayPeriodFromMonthYearAndPlatoon } from "../utils/seedDateUtils";
import { addWholeSickDayToDB } from "../utils/sickDayUtils";

export const getMonthsPayPeriodData = async (
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
    // before sending data back to the client, query the database with the given month and year, along with the userUUID, to recieve all the sick days the user has previously logged in that month, loop through that list inserting the newly generated sick days into the responseData array, searching by the payDay value and index in the returned documents
    await updateSickDaysInPayPeriod(
      responseData,
      userInfo,
      new Date(year, month - 1)
    );

    res.status(200).send({ data: responseData });
  } catch (error) {
    console.error("Error in getMonthsPayPeriodData:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

export const getWholeStiipData = async (
  req: IRequestForWholeStiip,
  res: Response
) => {
  const { userInfo, date, rotation, payDay, index } = req.body;
  const singleDayWholeStiip = generateWholeStiipShift(userInfo, date, rotation);

  if (index && payDay) {
    const monthAndYear = new Date(payDay).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    // since user is marking a day when they used sick time, save the date and the index within that pay period that they used it
    await addWholeSickDayToDB(
      userInfo,
      index,
      rotation,
      monthAndYear,
      payDay,
      date
    );
  }

  res.status(200).send({ data: singleDayWholeStiip });
};

export const getPartialStiipData = async (
  req: IRequestForPartialStiip,
  res: Response
) => {
  const {
    userInfo,
    index,
    date,
    rotation,
    payDay,
    shiftStart,
    updatedShiftEnd,
    originalShiftEnd,
  } = req.body;

  let day = {
    date: new Date(date),
    rotation,
  };
  const dayWithParitalStiip = generatePartialStiipDaysDataForClient(
    userInfo,
    day,
    shiftStart,
    updatedShiftEnd,
    originalShiftEnd
  );

  const monthAndYear = new Date(payDay).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  await addPartialSickDayToDB(
    userInfo,
    index,
    rotation,
    monthAndYear,
    payDay,
    date,
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
