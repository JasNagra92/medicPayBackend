import { Request, Response } from "express";
import { saveUserToDB } from "../utils/databaseUtils";

export const saveUser = async (req: Request, res: Response) => {
  const { user } = req.body;
  try {
    await saveUserToDB(user);
    res.status(200).send({ data: "user saved successfully" });
  } catch (error) {
    res.status(400).send({ error });
  }
};
