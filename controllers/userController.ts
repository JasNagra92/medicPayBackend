import User from "../models/user.model";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const createToken = (_id: ObjectId) => {
  return jwt.sign({ _id }, process.env.JWT_SECRET!, { expiresIn: "3d" });
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);

    const token = createToken(user._id);
    const foundUser = {
      email: user.email,
    };

    res.status(200).json({ foundUser, token });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const signupUser = async (req: Request, res: Response) => {
  const { email, password, confirmPassword } = req.body;

  try {
    const newUser = await User.signup(email, password, confirmPassword);

    // create a json web token
    const token = createToken(newUser._id);

    res.status(200).json({ email, token });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
