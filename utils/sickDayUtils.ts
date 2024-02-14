import { format } from "date-fns";
import { db } from "../config/firebase";
import {
  generateFullPaidSickDay,
  generatePartialStiipDaysDataForClient,
  generateWholeStiipShift,
  generateFullPaidPartialSickDay,
} from "../utils/scheduleGenerationUtils";
import {
  ITwoWeekPayPeriodForClient,
  IUserDataForDB,
} from "../interfaces/dbInterfaces";
import { DateTime } from "luxon";
import { FieldValue } from "firebase-admin/firestore";

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

      // only generate whole stiip shift data if document returned had the wholeShift boolean set to true, also check if firstFive is true and then send in a SKPD day back
      if (doc.data().wholeShift) {
        let wholeSickDaysWorkData;
        if (doc.data().firstFive) {
          wholeSickDaysWorkData = generateFullPaidSickDay(
            userInfo,
            doc.id,
            doc.data().rotation
          );
        } else {
          wholeSickDaysWorkData = generateWholeStiipShift(
            userInfo,
            doc.id,
            doc.data().rotation
          );
        }
        if (payPeriodToUpdate) {
          payPeriodToUpdate.workDaysInPayPeriod[doc.data().index] =
            wholeSickDaysWorkData;
        }
      } else {
        const {
          rotation,
          shiftStart,
          updatedShiftEnd,
          originalShiftEnd,
          firstFive,
        } = doc.data();
        // check if its a first five
        let partialSickDaysWorkData;
        if (firstFive) {
          partialSickDaysWorkData = generateFullPaidPartialSickDay(
            userInfo,
            { date: new Date(doc.id), rotation },
            new Date(shiftStart),
            new Date(updatedShiftEnd),
            new Date(originalShiftEnd)
          );
        } else {
          partialSickDaysWorkData = generatePartialStiipDaysDataForClient(
            userInfo,
            { date: new Date(doc.id), rotation },
            new Date(shiftStart),
            new Date(updatedShiftEnd),
            new Date(originalShiftEnd)
          );
        }
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
    let data = {
      wholeShift: true,
      index,
      rotation,
      payDay,
      firstFive: true,
    };
    let { year } = DateTime.fromISO(date);
    let stiipData;

    // this await call will modify the data object and flip firstFive to false if the day being added is later in the year than the users previous 5 first logged sick days chronologically
    await updateFirstFiveSickDays(userInfo, year, date, data, monthAndYear);

    const res = await db
      .collection("sickHours")
      .doc(monthAndYear)
      .collection(userInfo.id)
      .doc(date)
      .set(data);
    console.log("Sick Hours Document written with ID: ", res.writeTime);

    // in this branch generate stiip data that is for a day that falls within the first five sick days the user has logged in year chronologically
    if (data.firstFive) {
      stiipData = generateFullPaidSickDay(userInfo, date, rotation);
    } else {
      stiipData = generateWholeStiipShift(userInfo, date, rotation);
      // after generating a 12 hour stiip shift, add 12 hours to the db doc that counts total STIIP hours logged by user
      // Get a reference to the document
      const totalSickHoursRef = db
        .collection("totalSickHours")
        .doc(userInfo.id);

      // Fetch the document
      totalSickHoursRef
        .get()
        .then((doc) => {
          if (doc.exists) {
            // If the document exists, update the totalHours field by adding 12
            const currentTotalHours = doc.data()!.totalHours || 0;
            const newTotalHours = currentTotalHours + 12;
            return totalSickHoursRef.update({ totalHours: newTotalHours });
          } else {
            // If the document doesn't exist, set the totalHours field to 12
            return totalSickHoursRef.set({ totalHours: 12 });
          }
        })
        .then(() => {
          console.log("Total hours updated successfully.");
        })
        .catch((error) => {
          console.error("Error updating total hours: ", error);
        });
    }

    return stiipData;
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
    let data = {
      wholeShift: false,
      index,
      rotation,
      payDay,
      shiftStart,
      originalShiftEnd,
      updatedShiftEnd,
      firstFive: true,
    };

    let { year } = DateTime.fromISO(date);
    let stiipData;

    // this await call will modify the data object and flip firstFive to false if the day being added is later in the year than the users previous 5 first logged sick days chronologically
    await updateFirstFiveSickDays(userInfo, year, date, data, monthAndYear);

    const res = await db
      .collection("sickHours")
      .doc(monthAndYear)
      .collection(userInfo.id)
      .doc(date)
      .set(data);
    console.log("Document written with ID: ", res.writeTime);

    // in this branch generate stiip data that is for a day that falls within the first five sick days the user has logged in year chronologically
    if (data.firstFive) {
      // this function will pay out base wage for the hours booked off on SKPD if the shift is one of the first five sick days in the year, the SKPD hours do not generate shift premiums and the hours worked fall under sickPaidHours and sickPaidEarnings adds to the dayTotal
      stiipData = generateFullPaidPartialSickDay(
        userInfo,
        { date: new Date(date), rotation },
        shiftStart,
        updatedShiftEnd,
        originalShiftEnd
      );
    } else {
      stiipData = generatePartialStiipDaysDataForClient(
        userInfo,
        { date: new Date(date), rotation },
        shiftStart,
        updatedShiftEnd,
        originalShiftEnd
      );
      // calculate stiip hours used
      let updatedShiftDT = DateTime.fromISO(updatedShiftEnd as any);
      let originalShiftDT = DateTime.fromISO(originalShiftEnd as any);
      const hoursDifference = originalShiftDT.diff(
        updatedShiftDT,
        "hours"
      ).hours;

      // after generating a partial stiip shift, add the hours to the db doc that counts total STIIP hours logged by user
      // Get a reference to the document
      const totalSickHoursRef = db
        .collection("totalSickHours")
        .doc(userInfo.id);

      // Fetch the document
      totalSickHoursRef
        .get()
        .then((doc) => {
          if (doc.exists) {
            // If the document exists, update the totalHours field by adding the hourly difference
            const currentTotalHours = doc.data()!.totalHours || 0;
            const newTotalHours = currentTotalHours + hoursDifference;
            return totalSickHoursRef.update({ totalHours: newTotalHours });
          } else {
            // If the document doesn't exist, set the totalHours field to the hoursDifference
            return totalSickHoursRef.set({ totalHours: hoursDifference });
          }
        })
        .then(() => {
          console.log("Total hours updated successfully.");
        })
        .catch((error) => {
          console.error("Error updating total hours: ", error);
        });
    }
    return stiipData;
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

const updateFirstFiveSickDays = async (
  userInfo: IUserDataForDB,
  year: number,
  date: string,
  data: any,
  monthAndYear: string
) => {
  const firstFiveSickDays = await db
    .collection("usersFiveSickDays")
    .doc(userInfo.id)
    .get();

  if (!firstFiveSickDays.exists) {
    let dateForFirstFive: object[] = [];
    // need to store the monthAndYear in this object, because when the date comparisons eventually get done, and the old latest sick day needs to be updated, it will need to be accessed in the database with its monthAndYear document key
    dateForFirstFive.push({ date, monthAndYear });
    let dates = {
      [year]: dateForFirstFive,
    };
    const response = await db
      .collection("usersFiveSickDays")
      .doc(userInfo.id)
      .set(dates);
  } else {
    // in this branch the collection exists, now need to check if the year being added exists and the length of the existing array
    let sickDayYears = firstFiveSickDays.data();
    // if the year the user is logging a sick day for exists and they have logged less than 5 sick days
    if (sickDayYears![year] && sickDayYears![year].length < 5) {
      await db
        .collection("usersFiveSickDays")
        .doc(userInfo.id)
        .update({
          [year]: FieldValue.arrayUnion({ date, monthAndYear }),
        });
    } else if (
      // this scenarios is when the array exists, and the user has previously logged 5 sick days, here the previous 5 need to be compared to the date being added and checked if the new date is before any of the previous dates chronologically, if it is, then it needs to be added to this array and the last date chronologically needs to be removed
      sickDayYears![year] &&
      sickDayYears![year].length === 5
    ) {
      // Find the latest entry dynamically
      const latestEntry = sickDayYears![year].reduce(
        (latest: any, entry: any) => {
          const currentDate = new Date(entry.date);
          return !latest || currentDate > new Date(latest.date)
            ? entry
            : latest;
        },
        null
      );
      // if the date being sent to the server is before the latest date, update the array, and update the previous latest date to have the first Five boolean now flipped to false
      if (new Date(date) < new Date(latestEntry.date)) {
        let indexOfLatest = sickDayYears![year].findIndex(
          (entry: any) => entry.date === latestEntry.date
        );
        // this is updating the old array with the new object at the index of the previous latest sick day
        sickDayYears![year][indexOfLatest] = { date, monthAndYear };

        // update the firstFiveSick days with this new array
        await db
          .collection("usersFiveSickDays")
          .doc(userInfo.id)
          .update({
            [year]: sickDayYears![year],
          });

        // take the previous latest sick day, find it in the db based of its monthAndYear, and flip the boolean to false so next time it is fetched it is fetched as a stiip day and not a fullPay Day
        await db
          .collection("sickHours")
          .doc(latestEntry.monthAndYear)
          .collection(userInfo.id)
          .doc(latestEntry.date)
          .update({ firstFive: false });
      } else {
        // in this branch the date being added is later than the first five sick days, so the data that is going to be saved needs to have the boolean flipped to false before the sick day gets saved
        data.firstFive = false;
      }
    } else {
      // in this branch the collection usersFiveSickDays existed, but the year being added had not
      let dateForFirstFive: object[] = [];
      dateForFirstFive.push({ date, monthAndYear });
      const response = await db
        .collection("usersFiveSickDays")
        .doc(userInfo.id)
        .update({
          [year]: dateForFirstFive,
        });
    }
  }
};
