import { IUserDataForDB, IVacationDates } from "./../interfaces/dbInterfaces";
import { db } from "../config/firebase";

export const removeDayFromDB = async (
  userInfo: IUserDataForDB,
  collectionInDB: string,
  monthAndYear: string,
  date: Date
) => {
  try {
    const response = await db
      .collection(collectionInDB)
      .doc(monthAndYear)
      .collection(userInfo.id)
      .doc(date.toISOString())
      .delete();
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const addHolidayBlockToDB = async (
  userInfo: IUserDataForDB,
  vacationDates: IVacationDates[]
) => {
  for (const date of vacationDates) {
    const monthAndYear = new Date(date.payDay).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const data = {
      index: date.index,
      prevRotation: date.rotation,
      rotation: date.rotation,
      payDay: date.payDay,
      shiftStart: date.shiftStart,
      shiftEnd: date.shiftEnd,
      // set worked boolean to false, if a user later toggles holiday recall on one of their work shifts, search this database after adding the overtime to the overtimeHoursDB and flip this boolean to true, so that when the user later requests a months pay data, during the holidayblock update, only retrieve documents with the worked flag being false, so the paydaydata doesn't get updated with the previously logged overtime shifts being switched to Vacation shifts
      worked: false,
    };
    try {
      const response = await db
        .collection("holidayBlocks")
        .doc(monthAndYear)
        .collection(userInfo.id)
        .doc(new Date(date.date).toISOString())
        .set(data);
      console.log("holiday block saved to db:" + response.writeTime);
    } catch (error) {
      console.log(error);
    }
  }
};
