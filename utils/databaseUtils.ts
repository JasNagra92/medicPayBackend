import { IUserDataForDB } from "../interfaces/dbInterfaces";
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
