import { connectDB, dropDB, dropCollections } from "../../setuptestdb";
import supertest, { Response } from "supertest";
import app from "../../index";

beforeAll(async () => {
  await connectDB();
});
afterAll(async () => {
  await dropDB();
});
afterEach(async () => {
  await dropCollections();
});

describe("signup endpoint", () => {
  it("should signup a user successfully", async () => {
    const testUser = {
      email: "testEmail@hotmail.com",
      password: "StrongPassword1!",
      confirmPassword: "StrongPassword1!",
    };

    const response: Response = await supertest(app)
      .post("/signup")
      .send(testUser);
    expect(response.status).toBe(200);
    expect(response.body.email).toEqual(testUser.email);
    expect(response.body.token).toBeDefined();
  });

  it("should return an error for empty fields sent", async () => {
    const testUser = {
      email: "",
      password: "",
      confirmPassword: "",
    };

    const response: Response = await supertest(app)
      .post("/signup")
      .send(testUser);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual("all fields must be filled");
  });

  it("should return an error for invalid email format", async () => {
    const testUser = {
      email: "invalidemail",
      password: "StrongPassword1!",
      confirmPassword: "StrongPassword1!",
    };

    const response: Response = await supertest(app)
      .post("/signup")
      .send(testUser);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual("email is not valid");
  });

  it("should return an error for weak password", async () => {
    const testUser = {
      email: "testemail@hotmail.com",
      password: "weakPassword",
      confirmPassword: "weakPassword",
    };

    const response: Response = await supertest(app)
      .post("/signup")
      .send(testUser);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual("password not strong enough");
  });

  it("should return an error for non matching passwords", async () => {
    const testUser = {
      email: "testemail@hotmail.com",
      password: "StrongPassword1!",
      confirmPassword: "StrongPassword1455!",
    };

    const response: Response = await supertest(app)
      .post("/signup")
      .send(testUser);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual("passwords must match");
  });

  it("should give a email already in use error, if trying to sign up with a email thats already in the database", async () => {
    const testUser = {
      email: "testEmail@hotmail.com",
      password: "StrongPassword1!",
      confirmPassword: "StrongPassword1!",
    };

    // Sign up this user successfully
    const response: Response = await supertest(app)
      .post("/signup")
      .send(testUser);

    const responseTwo: Response = await supertest(app)
      .post("/signup")
      .send(testUser);
    expect(responseTwo.status).toBe(400);

    expect(responseTwo.body.error).toEqual("email already in use");
  });
});

describe("login endpoint", () => {
  beforeEach(async () => {
    // Sign up the test user before running the tests
    const testUser = {
      email: "testEmail@hotmail.com",
      password: "StrongPW123!",
      confirmPassword: "StrongPW123!",
    };
    await supertest(app).post("/signup").send(testUser);
  });

  it("should successfully login a user with the correct credentials", async () => {
    // login with same credentials
    const loginResponse: Response = await supertest(app)
      .post("/login")
      .send({ email: "testEmail@hotmail.com", password: "StrongPW123!" });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.foundUser).toBeDefined();
  });

  it("should return an error if given the wrong password", async () => {
    const loginResponse: Response = await supertest(app).post("/login").send({
      email: "testEmail@hotmail.com",
      password: "incorrectPW123!",
    });

    expect(loginResponse.status).toBe(400);
    expect(loginResponse.body.error).toEqual("incorrect password");
  });

  it("should give a incorrect email error if email given isn't in database", async () => {
    const response: Response = await supertest(app)
      .post("/login")
      .send({ email: "nonexistentemail@hotmail.com", password: "testPW123!" });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual("incorrect email");
  });
});
