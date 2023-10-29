import * as mongoose from "mongoose";
import { connectDB, dropDB, dropCollections } from "../../setuptestdb";
import User from "../../models/user.model";

beforeAll(async () => {
  await connectDB();
});
afterAll(async () => {
  await dropDB();
});
afterEach(async () => {
  await dropCollections();
});

describe("User Model", () => {
  it("should create a user successfully", async () => {
    let validUser = {
      email: "testEmail@hotmail.com",
      password: "testPassword",
    };
    const testUser = new User(validUser);
    await testUser.save();
    expect(testUser._id).toBeDefined();
    expect(testUser.email).toBe(validUser.email);
    expect(testUser.password).toBe(validUser.password);
  });

  it("should fail for a user without the required fields", async () => {
    let invalidUser = {
      email: "testemail@hotmail.com",
    };
    try {
      const testUser = new User(invalidUser);
      await testUser.save();
    } catch (error: any) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(error.errors.password).toBeDefined();
    }
  });

  it("should fail for a user with fields of the wrong type", async () => {
    let invalidUser = {
      email: 12323,
      password: "testPassword",
    };
    try {
      const testUser = new User(invalidUser);
      await testUser.save();
    } catch (error: any) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(error.errors.email).toBeDefined();
    }
  });

  it("should throw error for missing email and password", async () => {
    try {
      await User.login("", ""); // Empty email and password, causing validation error
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("all fields must be filled");
    }
  });

  it("should throw error for incorrect email", async () => {
    try {
      await User.login("nonexistent@email.com", "somepassword");
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("incorrect email");
    }
  });
});
