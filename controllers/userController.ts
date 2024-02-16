import { Request, Response } from "express";
import { saveUserToDB } from "../utils/databaseUtils";
import { db } from "../config/firebase";

export const saveUser = async (req: Request, res: Response) => {
  const { user } = req.body;
  try {
    await saveUserToDB(user);
    res.status(200).send({ data: "user saved successfully" });
  } catch (error) {
    res.status(400).send({ error });
  }
};
export const getUser = async (req: Request, res: Response) => {
  const { id } = req.body;
  console.log(id);
  try {
    const doc = await db.collection("users").doc(id).get();
    const user = doc.data();
    res.status(200).send({ data: user });
  } catch (error) {
    res.status(400).send({ error });
  }
};
