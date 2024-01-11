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
  generateVacationShift,
  generateRDayOTShift,
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
  OTAlphaShift: string,
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
        OTAlphaShift,
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
  } else if (OTShift.rotation === "Recall" || OTShift.rotation === "R Day OT") {
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

export const markHolidayShiftWorked = async (
  monthAndYear: string,
  userInfo: IUserDataForDB,
  date: string
) => {
  try {
    let res = await db
      .collection("holidayBlocks")
      .doc(monthAndYear)
      .collection(userInfo.id)
      .doc(new Date(date).toISOString())
      .update({ worked: true });
    console.log(res.writeTime);
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
      console.log("no matching documents in updateOverTimeDays");
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
        const { shiftStart, shiftEnd, OTAlphaShift } = doc.data();

        const regularOTDay = generateRegularOTShift(
          userInfo,
          new Date(doc.id),
          new Date(shiftStart),
          new Date(shiftEnd),
          OTAlphaShift
        );

        if (payPeriodToUpdate) {
          payPeriodToUpdate.workDaysInPayPeriod[doc.data().index] =
            regularOTDay;
        }
      } else if (doc.data().rotation === "Recall") {
        const { shiftStart, shiftEnd, prevRotation, OTAlphaShift } = doc.data();

        const recallOTDay = generateHolidayRecallShift(
          userInfo,
          new Date(doc.id),
          new Date(shiftStart),
          new Date(shiftEnd),
          OTAlphaShift,
          prevRotation
        );

        if (payPeriodToUpdate) {
          payPeriodToUpdate.workDaysInPayPeriod[doc.data().index] = recallOTDay;
        }
      } else if (doc.data().rotation === "R Day OT") {
        const { shiftStart, shiftEnd, OTAlphaShift } = doc.data();

        const RDayOTShift = generateRDayOTShift(
          userInfo,
          new Date(doc.id),
          new Date(shiftStart),
          new Date(shiftEnd),
          OTAlphaShift
        );

        if (payPeriodToUpdate) {
          payPeriodToUpdate.workDaysInPayPeriod[doc.data().index] = RDayOTShift;
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
};

export const updateHolidayBlocksInPayPeriod = async (
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
      .collection("holidayBlocks")
      .doc(formattedDate)
      .collection(userInfo.id);
    // only search for the holiday block dates that the user did not work, the dates where they worked will be updated in the previous updateOvertimeDaysInPayPeriod function and the boolean will be set to true for those days
    const snapshot = await userRef.where("worked", "==", false).get();
    if (snapshot.empty) {
      console.log("no matching documents in updateHolidayBlocks");
      return;
    }

    snapshot.forEach((doc) => {
      const payPeriodToUpdate = responseData.find(
        (period) =>
          new Date(period.payDay).getTime() ===
          new Date(doc.data().payDay).getTime()
      );

      const { shiftStart, shiftEnd, rotation, index } = doc.data();
      const date = doc.id;
      const vacationDay = generateVacationShift(
        userInfo,
        { date: new Date(date), rotation },
        shiftStart,
        shiftEnd
      );
      if (payPeriodToUpdate) {
        payPeriodToUpdate.workDaysInPayPeriod[index] = vacationDay;
      }
    });
  } catch (error) {
    console.log(error);
  }
};
