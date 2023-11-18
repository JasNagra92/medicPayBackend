import {
  IRequestForSinglePayDayData,
  IRequestForWholeStiip,
  IRequestForPartialStiip,
  ISingleDaysPayDataForClient,
  ITwoWeekPayPeriodForClient,
  IRequestForPayDayData,
  IRequestForHolidayBlock,
} from "./../interfaces/dbInterfaces";
import { DateTime } from "luxon";
import { Response } from "express";
import {
  generateSingleDaysDataForClient,
  generateWholeStiipShift,
  generatePartialStiipDaysDataForClient,
  generateLateCallShift,
  generateRegularOTShift,
  generateHolidayRecallShift,
  generateVacationBlock,
} from "../utils/scheduleGenerationUtils";
import {
  addPartialSickDayToDB,
  updateSickDaysInPayPeriod,
} from "../utils/sickDayUtils";
import { getPayPeriodFromMonthYearAndPlatoon } from "../utils/seedDateUtils";
import { addWholeSickDayToDB } from "../utils/sickDayUtils";
import {
  addLateCallToDB,
  updateOvertimeDaysInPayPeriod,
  addOvertimeToDB,
} from "../utils/overtimeUtils";
import { addHolidayBlockToDB, removeDayFromDB } from "../utils/databaseUtils";
import { db } from "../config/firebase";

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

    await updateOvertimeDaysInPayPeriod(
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

export const getSingleDaysWorkData = async (
  req: IRequestForSinglePayDayData,
  res: Response
) => {
  let { userInfo, date, rotation, collectionInDB, monthAndYear } = req.body;
  // check if the shift being sent and "deselcted" in front end was an overtime shift on a day off or late call overtime. Overtime on a day off needs to send back a Day Off payday object where as a rotation day that has Day 1/Day 2/Night 1/Night 2, needs to send back a single day with the rotation set back to that value
  if (rotation === "Reg OT") {
    rotation = "day off";
  }
  if (rotation === "Recall") {
    try {
      const doc = await db
        .collection("overtimeHours")
        .doc(monthAndYear!)
        .collection(userInfo.id)
        .doc(date)
        .get();
      if (doc) {
        let prevRotation = doc.data()!.prevRotation;
        rotation = prevRotation;
      }
    } catch (error) {
      console.log("no documents found");
    }
  }
  const singleDaysPayData = generateSingleDaysDataForClient(userInfo, {
    date: new Date(date),
    rotation,
  });
  // if request was sent with a collection and monthAndYear property, use those along with the userUUID to delete the document matching the date also sent with req.body
  if (collectionInDB && monthAndYear) {
    await removeDayFromDB(
      userInfo,
      collectionInDB,
      monthAndYear,
      new Date(date)
    );
  }
  res.status(200).send({ data: singleDaysPayData });
};

export const getLateCallData = async (
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
  const dayWithLateCall = generateLateCallShift(
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

  await addLateCallToDB(
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

  res.status(200).send({ data: dayWithLateCall });
};

export const getRegularOTShift = async (
  req: IRequestForSinglePayDayData,
  res: Response
) => {
  const { userInfo, date, shiftStart, shiftEnd, index, payDay, monthAndYear } =
    req.body;

  const regularOTDay = generateRegularOTShift(
    userInfo,
    new Date(date),
    shiftStart!,
    shiftEnd!
  );

  await addOvertimeToDB(userInfo, regularOTDay, index!, payDay!, monthAndYear!);

  res.status(200).send({ data: regularOTDay });
};

export const getRecallOTShift = async (
  req: IRequestForSinglePayDayData,
  res: Response
) => {
  const {
    userInfo,
    date,
    shiftStart,
    shiftEnd,
    index,
    payDay,
    monthAndYear,
    prevRotation,
  } = req.body;

  const recallOTDay = generateHolidayRecallShift(
    userInfo,
    new Date(date),
    shiftStart!,
    shiftEnd!
  );

  await addOvertimeToDB(
    userInfo,
    recallOTDay,
    index!,
    payDay!,
    monthAndYear!,
    prevRotation
  );

  res.status(200).send({ data: recallOTDay });
};

export const getHolidayBlock = async (
  req: IRequestForHolidayBlock,
  res: Response
) => {
  const { userInfo, vacationDates } = req.body;

  const vacationBlock = generateVacationBlock(userInfo, vacationDates);

  await addHolidayBlockToDB(userInfo, vacationDates);

  res.status(200).send({ data: vacationBlock });
};
