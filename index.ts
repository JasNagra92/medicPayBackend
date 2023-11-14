import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import getTwoWeekDataRoute from "./routes/scheduleRoute";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + Typescript Server test to see nodemon");
});

app.use("/getPayData", getTwoWeekDataRoute);

// export the app prior to starting the server for testing
export default app;
