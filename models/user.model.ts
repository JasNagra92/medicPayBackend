import { Model, Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    statics: {
      async signup(email: string, password: string, passwordConfirm: string) {
        //validation
        if (!email || !password) {
          throw Error("all fields must be filled");
        }
        if (!validator.isEmail(email)) {
          throw Error("email is not valid");
        }
        if (!validator.isStrongPassword(password)) {
          throw Error("password not strong enough");
        }
        if (!validator.equals(password, passwordConfirm)) {
          throw Error("passwords must match");
        }

        const exists = await this.findOne({ email });

        if (exists) {
          throw Error("email already in use");
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const user = await this.create({ email, password: hash });

        return user;
      },
      async login(email: string, password: string) {
        if (!email || !password) {
          throw Error("all fields must be filled");
        }

        const user = await this.findOne({ email });

        if (!user) {
          throw Error("incorrect email");
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
          throw Error("incorrect password");
        }

        return user;
      },
    },
  }
);

const User = model("User", userSchema);

export default User;
