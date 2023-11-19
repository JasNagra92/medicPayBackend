import { format } from "date-fns";
import { db } from "../config/firebase";
import {
  generatePartialStiipDaysDataForClient,
  generateWholeStiipShift,
} from "../utils/scheduleGenerationUtils";
import {
  ITwoWeekPayPeriodForClient,
  IUserDataForDB,
} from "../interfaces/dbInterfaces";

export const updateSickDaysInPayPeriod = async (
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
      .collection("sickHours")
      .doc(formattedDate)
      .collection(userInfo.id);
    const snapshot = await userRef.get();
    if (snapshot.empty) {
      console.log("no matching documents in updateSickDays");
      return;
    }

    snapshot.forEach((doc) => {
      const payPeriodToUpdate = responseData.find(
        (period) => format(period.payDay, "PP") === doc.data().payDay
      );

      // only generate whole stiip shift data if document returned had the wholeShift boolean set to true
      if (doc.data().wholeShift) {
        const wholeSickDaysWorkData = generateWholeStiipShift(
          userInfo,
          doc.id,
          doc.data().rotation
        );
        if (payPeriodToUpdate) {
          payPeriodToUpdate.workDaysInPayPeriod[doc.data().index] =
            wholeSickDaysWorkData;
        }
      } else {
        const { rotation, shiftStart, updatedShiftEnd, originalShiftEnd } =
          doc.data();
        const partialSickDaysWorkData = generatePartialStiipDaysDataForClient(
          userInfo,
          { date: new Date(doc.id), rotation },
          new Date(shiftStart),
          new Date(updatedShiftEnd),
          new Date(originalShiftEnd)
        );
        if (payPeriodToUpdate) {
          payPeriodToUpdate.workDaysInPayPeriod[doc.data().index] =
            partialSickDaysWorkData;
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
};

export const addWholeSickDayToDB = async (
  userInfo: IUserDataForDB,
  index: number,
  rotation: string,
  monthAndYear: string,
  payDay: string,
  date: string
) => {
  try {
    const data = {
      wholeShift: true,
      index,
      rotation,
      payDay,
    };

    const res = await db
      .collection("sickHours")
      .doc(monthAndYear)
      .collection(userInfo.id)
      .doc(date)
      .set(data);
    console.log("Document written with ID: ", res.writeTime);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

export const addPartialSickDayToDB = async (
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
      wholeShift: false,
      index,
      rotation,
      payDay,
      shiftStart,
      originalShiftEnd,
      updatedShiftEnd,
    };

    const res = await db
      .collection("sickHours")
      .doc(monthAndYear)
      .collection(userInfo.id)
      .doc(date)
      .set(data);
    console.log("Document written with ID: ", res.writeTime);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};
