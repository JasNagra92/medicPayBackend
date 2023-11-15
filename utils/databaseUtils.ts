import { IUserDataForDB } from "../interfaces/dbInterfaces";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export const removeDayFromDB = async (
  userInfo: IUserDataForDB,
  collectionInDB: string,
  monthAndYear: string,
  date: Date
) => {
  try {
    let response = await deleteDoc(
      doc(db, collectionInDB, monthAndYear, userInfo.id, date.toISOString())
    );
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
