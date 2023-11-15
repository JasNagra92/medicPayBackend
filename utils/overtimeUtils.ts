import { format } from "date-fns";
import { db } from "../config/firebase";
import {
  getDocs,
  collection,
  setDoc,
  doc,
  where,
  query,
} from "firebase/firestore";
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

    const docRef = doc(
      collection(db, "overtimeHours", monthAndYear, userInfo.id),
      date
    );
    await setDoc(docRef, data);
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
    const q = query(
      collection(db, "overtimeHours", formattedDate, userInfo.id)
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
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
