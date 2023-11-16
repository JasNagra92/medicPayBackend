import { format } from "date-fns";
import { db } from "../config/firebase";
import {
  IUserDataForDB,
  ITwoWeekPayPeriodForClient,
} from "../interfaces/dbInterfaces";
import { generateLateCallShift } from "./scheduleGenerationUtils";

export const addLateCallToDB = async (
  userInfo: IUserDataForDB,
  index: number,
  rotation: string,
  monthAndYear: string,
  payDay: string,
  date: string,
  shiftStart: Date,
  updatedShiftEnd: Date,
  originalShiftEnd: Date
) => {
  try {
    const data = {
      lateCall: true,
      index,
      rotation,
      payDay,
      shiftStart,
      originalShiftEnd,
      updatedShiftEnd,
    };

    const res = await db
      .collection("overtimeHours")
      .doc(monthAndYear)
      .collection(userInfo.id)
      .doc(date)
      .set(data);
  } catch (error) {
    console.log(error);
  }
};

export const updateOvertimeDaysInPayPeriod = async (
  responseData: ITwoWeekPayPeriodForClient[],
  userInfo: IUserDataForDB,
  monthAndYear: Date
) => {
  try {
    const formattedDate = monthAndYear.toLocaleDateString("en-us", {
      month: "long",
      year: "numeric",
    });
    const userRef = db
      .collection("overtimeHours")
      .doc(formattedDate)
      .collection(userInfo.id);
    const snapshot = await userRef.get();
    if (snapshot.empty) {
      console.log("no matching documents");
      return;
    }

    snapshot.forEach((doc) => {
      const payPeriodToUpdate = responseData.find(
        (period) => format(period.payDay, "PP") === doc.data().payDay
      );

      // only generate whole stiip shift data if document returned had the wholeShift boolean set to true
      if (doc.data().lateCall) {
        const { rotation, shiftStart, updatedShiftEnd, originalShiftEnd } =
          doc.data();

        const lateCallPayData = generateLateCallShift(
          userInfo,
          { date: new Date(doc.id), rotation },
          new Date(shiftStart),
          new Date(updatedShiftEnd),
          new Date(originalShiftEnd)
        );

        if (payPeriodToUpdate) {
          payPeriodToUpdate.workDaysInPayPeriod[doc.data().index] =
            lateCallPayData;
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
};
