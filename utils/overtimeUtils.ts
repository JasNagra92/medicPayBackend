import { format } from "date-fns";
import { db } from "../config/firebase";
import {
  IUserDataForDB,
  ITwoWeekPayPeriodForClient,
  ISingleDaysPayDataForClient,
} from "../interfaces/dbInterfaces";
import {
  generateHolidayRecallShift,
  generateLateCallShift,
  generateRegularOTShift,
} from "./scheduleGenerationUtils";

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

export const addOvertimeToDB = async (
  userInfo: IUserDataForDB,
  OTShift: ISingleDaysPayDataForClient,
  index: number,
  payDay: string,
  monthAndYear: string,
  prevRotation?: string
) => {
  if (OTShift.rotation === "Reg OT") {
    try {
      const data = {
        index,
        rotation: OTShift.rotation,
        payDay,
        shiftStart: OTShift.shiftStart,
        shiftEnd: OTShift.shiftEnd,
      };
      const res = await db
        .collection("overtimeHours")
        .doc(monthAndYear)
        .collection(userInfo.id)
        .doc(OTShift.date.toISOString())
        .set(data);
    } catch (error) {
      console.log(error);
    }
  } else if (OTShift.rotation === "Recall") {
    try {
      const data = {
        index,
        rotation: OTShift.rotation,
        payDay,
        shiftStart: OTShift.shiftStart,
        shiftEnd: OTShift.shiftEnd,
        prevRotation,
      };
      const res = await db
        .collection("overtimeHours")
        .doc(monthAndYear)
        .collection(userInfo.id)
        .doc(OTShift.date.toISOString())
        .set(data);
    } catch (error) {
      console.log(error);
    }
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

      // generate shift data depending if data saved was late call/regular OT/holiday recall
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
      } else if (doc.data().rotation === "Reg OT") {
        const { shiftStart, shiftEnd } = doc.data();

        const regularOTDay = generateRegularOTShift(
          userInfo,
          new Date(doc.id),
          new Date(shiftStart),
          new Date(shiftEnd)
        );

        if (payPeriodToUpdate) {
          payPeriodToUpdate.workDaysInPayPeriod[doc.data().index] =
            regularOTDay;
        }
      } else if (doc.data().rotation === "Recall") {
        const { shiftStart, shiftEnd } = doc.data();

        const recallOTDay = generateHolidayRecallShift(
          userInfo,
          new Date(doc.id),
          new Date(shiftStart),
          new Date(shiftEnd)
        );

        if (payPeriodToUpdate) {
          payPeriodToUpdate.workDaysInPayPeriod[doc.data().index] = recallOTDay;
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
};
